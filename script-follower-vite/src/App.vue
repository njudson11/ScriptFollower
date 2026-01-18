<template>
  <div id="app">
    <Toolbar
      :selectedLine="lines[state.userSelectedLineIdx]"
      v-model:listening="state.listening"
      v-model:autoscroll="state.autoscroll"

      :state="state"
      @file-loaded="handleFile"
      @reset-view="resetView"
      @reload-file="reloadFile"
      @clear-document="clearDocument"
      @select-sound-folder="handleSoundFolderChange"
      @goto-page-number="highlightLineByPageNumber"
      @find-text="findNextText"
      @download-sound-csv="downloadSoundCSV"

      :outputDevices="state.outputDevices"
      :logicalChannels="state.logicalChannels"
      :selectedLogicalChannel="state.selectedLogicalChannel"
      :channelOutputMap="state.channelOutputMap"
      @update:selectedLogicalChannel="updateSelectedLogicalChannel"
      @update:channelOutputMap="updateChannelOutputMap"
    />
    <div class="main-content" style="display: flex;">
      <Sidebar
        v-if="sidebarVisible"
        :lines="lines"
        :activeLineIdx="state.userSelectedLineIdx"
        :onSelectUserLine="selectUserLine"
        :playingAudios="playingAudios"
        :soundManager="soundManager"
        :state="state"
        :style="{ width: sidebarWidth + 'px' }"
        :onToggleSidebar="toggleSidebar"
      />
      <div
        v-if="sidebarVisible"
        class="sidebar-divider"
        @mousedown="startResize"
        style="width: 5px; cursor: col-resize; background: #eee;"
      ></div>
      <button
        v-else
        class="sidebar-toggle-btn"
        @click="toggleSidebar"
        style="margin: 0 0 0 5px; height: 40px;"
        aria-label="Show sidebar"
      >&#9776;</button>
      <DocumentViewer
        :lines="lines"
        :setActiveLineEl="setActiveLineEl"
        :selectUserLine="selectUserLine"
        :soundManager="soundManager"
        :state="state"
        :logicalChannels="state.logicalChannels"
        style="flex: 1;"
      />
    </div>
  </div>
</template>

<script setup>

import { reactive, ref, nextTick, watch, onMounted, onUnmounted , onBeforeUnmount, computed } from 'vue'
import Toolbar from './components/Toolbar.vue'
import Sidebar from './components/Sidebar.vue'
import DocumentViewer from './components/DocumentViewer.vue'
import { DocumentProcessor } from './modules/documentProcessor'
import { useSpeechRecognition } from './modules/speechRecognition'
import { findClosestLine2 } from './modules/textMatcher'
import { SoundProcessor } from './modules/soundProcessor'
import { WebAudioSoundManager } from './modules/webAudioSoundManager'
import { generateSoundCueCSV}  from './modules/utilities'
import { stripHtmlAndPunctuation, isMobileSize } from './modules/utilities'
import { appValues, lineTypeLabel } from './modules/constants.js'

const appVersion = __APP_VERSION__

const state = reactive({
  version: appVersion,
  message: '',
  error: '',
  transcript: '',
  listening: false,
  prevActiveLineIdx: -1,
  noMatch: false,
  hasMatched: false,
  userSelectedLineIdx: 0,
  speechActiveLineIdx: -1,
  autoscroll: false,
  lastFile: null,
  soundFolderPath: '',
  filename: '',
  loading: false,
  allowSpaceCharacter: false,
  outputDevices: [],       // New: Array of available audio output devices
  selectedOutputDeviceId: '', // New: ID of the selected audio output device
  logicalChannels: ['A', 'B'], // New: List of user-defined logical channels, default to 'A'
  selectedLogicalChannel: 'A', // New: Currently selected logical channel in the UI, default to 'A'
  channelOutputMap: reactive({ 'A': '' }) // New: Maps logical channel to deviceId, default to 'A'
})

const docProcessor = new DocumentProcessor()
const lines = ref(docProcessor.lines)
const dialogueLines = computed(() => lines.value.filter(line => (line.type === lineTypeLabel.dialogue || line.type === lineTypeLabel.character)));
const fileInput = ref(null)
const soundProcessor = ref(new SoundProcessor([]))
const soundManager = ref(new WebAudioSoundManager(soundProcessor.value))
const playingAudios = soundManager.value.playingAudios
const activeLineEl = ref(null)
const sidebarWidth = ref(appValues.sidebarDefaultWidth) // default width in px
const resizing = ref(false)
const isMobile = ref(isMobileSize())
const sidebarVisible = ref(!isMobile.value) // Add this line


let restartAttempts = 0
let restartTimeout = null

// Watch for selectedOutputDeviceId to initialize A channel's mapping
watch(() => state.selectedOutputDeviceId, (newDeviceId) => {
  if (newDeviceId && !state.channelOutputMap['A']) {
    state.channelOutputMap['A'] = newDeviceId;
  }
}, { immediate: true });

soundManager.value.onSoundEndCallbacks.push(advanceLineOnSoundEnd);

async function handleFile(event) {
  state.error = ''
  clearDocument();
  state.hasMatched = false
  const file = event.target.files[0]
  if (!file) return
  state.lastFile = file
  docProcessor.filename.value = file.name
  state.filename = docProcessor.filename.value
  state.message = 'Loading ' + state.filename + ' ...'
  try {
    //await docProcessor.loadFile(file)
    await docProcessor.loadFile(file)
    saveToLocalStorage()
  } catch (e) {
    state.message = ""
    state.error = 'Error loading document: ' + e.message
  }
  state.message = ""
  if (fileInput.value) fileInput.value.value = ''
}

function handleSoundFolderChange(e) {
  soundProcessor.value = new SoundProcessor(e.target.files)
  soundManager.value = new WebAudioSoundManager(soundProcessor.value)
  state.soundFolderPath = e.target.files[0]?.webkitRelativePath?.split('/')[0] || ''
}

// Function to enumerate available audio output devices
async function enumerateAudioOutputDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.warn('enumerateDevices() not supported.');
    return;
  }
  try {
    // Request permission for media devices (even though we only need output, this often triggers permission)
    // A trick to get labels filled for devices on some browsers
    await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); 

    const devices = await navigator.mediaDevices.enumerateDevices();
    state.outputDevices = devices.filter(device => device.kind === 'audiooutput');
    // Set default output device if available
    if (state.outputDevices.length > 0) {
      state.selectedOutputDeviceId = state.outputDevices[0].deviceId;
    }
  } catch (err) {
    console.error('Error enumerating devices:', err);
    state.error = 'Error accessing media devices. Please ensure permissions are granted.';
  }
}

function updateSelectedLogicalChannel(newChannel) {
  state.selectedLogicalChannel = newChannel;
}

function updateChannelOutputMap(channel, deviceId) {
  state.channelOutputMap[channel] = deviceId;
  // Also inform the sound manager about the updated mapping
  if (soundManager.value && typeof soundManager.value.setChannelOutputMap === 'function') {
    soundManager.value.setChannelOutputMap(state.channelOutputMap);
  }
}

function handleSpeechError(err) {
  if (restartTimeout) return; // Already in the process of restarting
  err = (err ? err : state.error)
  if (!state.listening) {
    // User unchecked the box, just stop and clear, do not set error
    speech.stop()
    state.transcript = ''
    state.error = ''
    return
  }
  if (restartAttempts < 3) {
    restartAttempts++
    state.error = 'Speech recognition error: ' + err + '. Restarting... (' + (restartAttempts) + ')'
    restartTimeout = setTimeout(() => { restartSpeechRecognition(); }, 1000 * restartAttempts)
  } else {
    state.listening = false
    state.error = 'Speech recognition stopped after 3 failed restart attempts.'
  }
}

function restartSpeechRecognition() {
  if (restartTimeout) clearTimeout(restartTimeout)
  restartTimeout = null
  state.error = ''
  state.transcript = ''
  speech.start()
}

const speech = useSpeechRecognition(
  (spoken) => {
    state.error = ''
    if (!spoken || spoken.trim() === '') {
      state.error = 'No speech detected.'
      return
    }
    state.transcript = spoken
    const selectedIndex = state.autoscroll ?  state.speechActiveLineIdx : state.userSelectedLineIdx;
    const baseIdx = dialogueLines.value.findIndex(obj => obj.idx >= selectedIndex);
    const idx = findClosestLine2(dialogueLines.value, spoken, baseIdx)
    if (idx !== -1) {
      state.speechActiveLineIdx = dialogueLines.value[idx].idx
      state.noMatch = false
      if (state.autoscroll) {
        scrollToSpeechLine()
      }
    } else {
      state.noMatch = true
    }
  },
  (err) => {
    handleSpeechError(err)
  },
  () => {
    handleSpeechError()
  }
)


function highlightLineByPageNumber(pageNumber) {
  const idx = lines.value.findIndex(line => line.type === 'PAGE_NUMBER' && line.pageNumber === pageNumber)
  if (idx !== -1) {
    state.userSelectedLineIdx = idx
   // activeLineIdx.value = idx
  //  speechActiveLineIdx.value = idx
    state.noMatch = false
    //scrollToSpeechLine()
  } else {
    state.error = `No line found for page number ${pageNumber}`
  }
}

function clearDocument(){
  docProcessor.clear();
  clearLocalStorage()
  resetView();
}

function resetView() {
  state.prevActiveLineIdx = -1
  state.userSelectedLineIdx = 0
  state.speechActiveLineIdx = -1
  state.noMatch = false
  state.hasMatched = false
  state.transcript = ''
  if (speech.isListening) {
    speech.stop()
    state.listening = false
  }
}

// Scroll to user-selected line using Vue refs
watch(() => state.userSelectedLineIdx, async (newIdx) => {
  await nextTick()
  scrollToLineIndex(newIdx)
})


function scrollToLineIndex(newIdx){
  if (newIdx === -1) {
    const viewer = document.querySelector('.document-viewer')
    if (viewer) viewer.scrollTo({ top: 0, behavior: 'smooth' })
  } else if (activeLineEl.value) {
    const viewer = document.querySelector('.document-viewer')
    const el = activeLineEl.value
    if (viewer && el) {
      const viewerRect = viewer.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const offset = elRect.top - viewerRect.top + viewer.scrollTop - (10 * 16)
      viewer.scrollTo({ top: offset, behavior: 'smooth' })
      el.focus({ preventScroll: true })
    }
  }
}

function advanceLineOnSoundEnd(finishedLine) {
  const finishedLineIndex = lines.value.findIndex(l => l.idx === finishedLine.idx);

  if (finishedLineIndex !== -1) {
    if (state.userSelectedLineIdx === finishedLineIndex && finishedLineIndex < lines.value.length - 1) {
      selectUserLine(finishedLineIndex + 1);
    }
  }
}

function setActiveLineEl(el) {
  activeLineEl.value = el
}

function onKeyDown(e) {
  let userSelectedLine=lines.value[state.userSelectedLineIdx];
  if (!userSelectedLine) return;
  if (e.code === 'Space' && userSelectedLine.type === 'SOUND') {
    const soundRef = userSelectedLine.ref;
    if (soundManager.value.isSoundAvailable(soundRef)){
      const wasPlaying = soundManager.value.isPlaying(soundRef);
      soundManager.value.playOrStopSound(userSelectedLine, lines.value);
      e.preventDefault();
      if (wasPlaying) {
        if (state.userSelectedLineIdx < lines.value.length - 1) {
          selectUserLine(state.userSelectedLineIdx + 1);
        }
      }
    }
    return; // Prevent fall-through
  }
  if (e.key === 'ArrowDown' || (!state.allowSpaceCharacter && e.code === 'Space')) {
    if (state.userSelectedLineIdx < lines.value.length - 1) {
      selectUserLine(state.userSelectedLineIdx + 1)
    }
    e.preventDefault()
  } else if (e.key === 'ArrowUp') {
    if (state.userSelectedLineIdx > 0) {
      selectUserLine(state.userSelectedLineIdx - 1)
    }
    e.preventDefault()
  } 
}

function saveToLocalStorage() {
  docProcessor.saveToLocalStorage();
  return;
}

function restoreFromLocalStorage() {
  docProcessor.restoreFromLocalStorage();
  return;
}

function clearLocalStorage() {
  docProcessor.clearLocalStorage();
  return;
}

onMounted(() => {
  restoreFromLocalStorage()

  const viewer = document.querySelector('.document-viewer')
  if (viewer) viewer.focus()
  requestWakeLock()
  enumerateAudioOutputDevices(); // Call to enumerate devices

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', handleResize)
})

async function reloadFile() {
  if (!state.lastFile) {
    state.error = 'No file to reload.'
    return
  }
  state.error = ''
  state.loading = true
  //activeLineIdx.value = -1
  state.hasMatched = false
  try {
    text.value = await processDocument(state.lastFile)
  } catch (e) {
    state.error = 'Error reloading document: ' + e.message
  }
  state.loading = false
}

let wakeLock = null

function findNextText(text) {
  if (!text) return
  const startIdx = state.userSelectedLineIdx + 1
  const search = stripHtmlAndPunctuation(text).toLowerCase()
  const idx = lines.value.findIndex(
    (line, i) =>
      i >= startIdx &&
      line.text &&
      line.cleanText.toLowerCase().includes(search)
  )
  if (idx !== -1) {
    state.userSelectedLineIdx = idx
    scrollToLineIndex(idx)
  } else {
    state.error = 'No more occurrences found.'
  }
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => {
        console.log('Wake Lock was released')
      })
      console.log('Wake Lock is active')
    }
  } catch (err) {
    console.error(`${err.name}, ${err.message}`)
  }
}

// Re-acquire wake lock on visibility change (e.g. after tab switch)
document.addEventListener('visibilitychange', () => {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    requestWakeLock()
  }
})

function selectUserLine(idx) {
  state.prevActiveLineIdx = state.userSelectedLineIdx
  state.userSelectedLineIdx = idx
  state.noMatch = false
}

function scrollToSpeechLine() {
  nextTick(() => {
    scrollToLineIndex(state.speechActiveLineIdx)
  })
}

// Watch for speechActiveLineIdx changes to update userSelectedLineIdx
watch(() => state.speechActiveLineIdx, (newIdx) => {
  if (state.autoscroll && newIdx !== -1) {
    state.userSelectedLineIdx = newIdx
  }
})

// Watch for selectedOutputDeviceId changes to update the audio output device
watch(() => state.selectedOutputDeviceId, async (newDeviceId) => {
  if (newDeviceId && soundManager.value) {
    await soundManager.value.setOutputDevice(newDeviceId);
  }
});

watch(() => state.listening, (val) => {
  if (!speech.isSupported) {
    state.error = 'Speech recognition not supported in this browser.'
    state.listening = false
    return
  }
  if (val) {
    // Start listening if not already
    if (!speech.isListening) {
      state.error = ''        // Clear error when starting to listen
      state.transcript = ''   // Clear transcript when starting to listen
      restartAttempts = 0
      if (restartTimeout) clearTimeout(restartTimeout)
      restartTimeout = null
      speech.start()
    }
  } else {
    // Always stop listening and clear transcript/error when unchecked
    if (restartTimeout) clearTimeout(restartTimeout)
    if (speech.isListening) speech.stop()
    state.transcript = ''
    state.error = ''
  }
})

function downloadSoundCSV() {
  if (!state.filename || !docProcessor || !soundManager.value) return

  const csv = generateSoundCueCSV(docProcessor, soundManager.value)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const base = state.filename.replace(/\.[^/.]+$/, '')
  const a = document.createElement('a')
  a.href = url
  a.download = `${base}-sound.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}

function startResize(e) {
  resizing.value = true
  document.body.style.cursor = 'col-resize'
}

function stopResize() {
  resizing.value = false
  document.body.style.cursor = ''
}

function onResize(e) {
  if (resizing.value) {
    sidebarWidth.value = Math.max(200, e.clientX) // min width 200px
  }
}

const handleResize = () => {
  const isMobileNow = isMobileSize()
  if (isMobileNow !== isMobile.value) {
    isMobile.value = isMobileSize()
    sidebarVisible.value = !isMobile.value
  }
}



window.addEventListener('mousemove', onResize)
window.addEventListener('mouseup', stopResize)
</script>

