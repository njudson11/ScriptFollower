<template>
  <div id="app">
    <Toolbar
      :transcript="transcript"
      :noMatch="noMatch"
      :loading="loading"
      :error="error"
      v-model:listening="listening"
      v-model:autoscroll="autoscroll"
      @file-loaded="handleFile"
      @reset-view="resetView"
      @reload-file="reloadFile"
      :version="appVersion"
      :filename="filename"
      :lastFile="lastFile"
      :soundFolderPath="soundFolderPath"
      @select-sound-folder="handleSoundFolderChange"
    />
    <div class="main-content">
      <Sidebar
        :lines="lines"
        :activeLineIdx="activeLineIdx"
        :onSelectUserLine="selectUserLine"
        :playingAudios="playingAudios"
        :soundManager="soundManager"
      />
      <DocumentViewer
        :lines="lines"
        :userSelectedLineIdx="userSelectedLineIdx"
        :speechActiveLineIdx="speechActiveLineIdx"
        :noMatch="noMatch"
        :setActiveLineEl="setActiveLineEl"
        :selectUserLine="selectUserLine"
        :soundManager="soundManager"
      />
    </div>
  </div>
</template>

<script setup>

import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import Toolbar from './components/Toolbar.vue'
import Sidebar from './components/Sidebar.vue'
import DocumentViewer from './components/DocumentViewer.vue'
import { DocumentProcessor } from './modules/documentProcessor'
import { useSpeechRecognition } from './modules/speechRecognition'
import { findClosestLine } from './modules/textMatcher'
import { SoundProcessor } from './modules/soundProcessor'
import { SoundManager } from './modules/soundManager'
import { isSoundCue, extractSoundRef}  from './modules/utilities'

const docProcessor = new DocumentProcessor()

const text = docProcessor.text
const lines = docProcessor.lines
const cleanLines = docProcessor.cleanLines

const loading = ref(false)
const error = ref('')
const transcript = ref('')
const listening = ref(false)
const activeLineIdx = ref(-1)
const prevActiveLineIdx = ref(-1)
const noMatch = ref(false)
const hasMatched = ref(false)
const userSelectedLineIdx = ref(-1) // For user selection (keyboard/mouse)
const speechActiveLineIdx = ref(-1) // For speech recognition highlight
const autoscroll = ref(false)        // For the toolbar checkbox

const fileInput = ref(null)
const soundFolderPath = ref('')
const soundFiles = ref([])

//const playingAudios = ref({}) // { [ref]: { timeLeft, duration, ... } }

const soundProcessor = ref(new SoundProcessor(soundFiles || []))
const soundManager = new SoundManager(soundProcessor.value)
const playingAudios = soundManager.playingAudios

async function handleFile(event) {
  error.value = ''
  docProcessor.clear()
  loading.value = true
  activeLineIdx.value = -1
  hasMatched.value = false
  const file = event.target.files[0]
  if (!file) {
    loading.value = false
    return
  }
  lastFile.value = file
  filename.value = file.name
  try {
    await docProcessor.loadFile(file)
    localStorage.setItem('scriptFollowerFilename', file.name)
  } catch (e) {
    error.value = 'Error loading document: ' + e.message
  }
  loading.value = false
  if (fileInput.value) fileInput.value.value = ''
}

function handleSoundFolderChange(e) {
  soundFiles.value = Array.from(e.target.files)
  soundFolderPath.value = e.target.files[0]?.webkitRelativePath?.split('/')[0] || ''
  soundManager.value.soundProcessor.setFiles(soundFiles.value)
}

let restartAttempts = 0
let restartTimeout = null

function handleSpeechError(err) {
  if (restartTimeout) return; // Already in the process of restarting
  err = (err ? err : error.value)
  if (!listening.value) {
    // User unchecked the box, just stop and clear, do not set error
    speech.stop()
    transcript.value = ''
    error.value = ''
    return
  }
  if (restartAttempts < 3) {
    restartAttempts++
    error.value = 'Speech recognition error: ' + err + '. Restarting... (' + (restartAttempts) + ')'
    restartTimeout = setTimeout(() => { restartSpeechRecognition(); }, 1000 * restartAttempts)
  } else {
    listening.value = false
    error.value = 'Speech recognition stopped after 3 failed restart attempts.'
  }
}

function restartSpeechRecognition() {
  if (restartTimeout) clearTimeout(restartTimeout)
  restartTimeout = null
  error.value = ''
  transcript.value = ''
  speech.start()
}


const speech = useSpeechRecognition(
  (spoken) => {
    restartAttempts=0;
    transcript.value = spoken
    const cleanArr = cleanLines.value.map(obj => obj.clean)
    // Find the index in cleanLines that matches the userSelectedLineIdx
    let baseIdx = cleanLines.value.findIndex(obj => obj.idx === userSelectedLineIdx.value)
    if (baseIdx === -1) {
      // Find the next nearest item after userSelectedLineIdx
      baseIdx = cleanLines.value.findIndex(obj => obj.idx > userSelectedLineIdx.value)
      // If still not found, use the last item
      if (baseIdx === -1 && cleanLines.value.length > 0) {
        baseIdx = cleanLines.value.length - 1
      }
    }

    // Use speechActiveLineIdx if it's close to the user selection
    let speechBaseIdx = cleanLines.value.findIndex(obj => obj.idx === speechActiveLineIdx.value)
    if (
      speechActiveLineIdx.value !== -1 &&
      speechBaseIdx !== -1 &&
      Math.abs(userSelectedLineIdx.value - speechActiveLineIdx.value) <= 10
    ) {
      baseIdx = speechBaseIdx
    }

    const idx = findClosestLine(cleanArr, spoken, baseIdx)
    if (idx !== -1) {
      speechActiveLineIdx.value = cleanLines.value[idx].idx
      noMatch.value = false
      if (autoscroll.value) {
        scrollToSpeechLine()
      }
    } else {
      noMatch.value = true
    }
  },
  (err) => {
    handleSpeechError(err)
  },
  () => {
    handleSpeechError()
  }
)

function resetView() {
  activeLineIdx.value = -1
  prevActiveLineIdx.value = -1
  userSelectedLineIdx.value = -1
  speechActiveLineIdx.value = -1
  noMatch.value = false
  hasMatched.value = false
  transcript.value = ''
  if (speech.isListening) {
    speech.stop()
    listening.value = false
  }
}

// Scroll to active line using Vue refs
watch(activeLineIdx, async (newIdx) => {
  await nextTick()
  if (newIdx === -1) {
    const viewer = document.querySelector('.document-viewer')
    if (viewer) viewer.scrollTo({ top: 0, behavior: 'smooth' })
  } else if (activeLineEl.value) {
    const viewer = document.querySelector('.document-viewer')
    const el = activeLineEl.value
    if (viewer && el) {
      const viewerRect = viewer.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const offset = elRect.top - viewerRect.top + viewer.scrollTop - (10 * 16) // 10rem = 160px
      viewer.scrollTo({ top: offset, behavior: 'smooth' })
      el.focus({ preventScroll: true })
    }
  }
})

// Scroll to user-selected line using Vue refs
watch(userSelectedLineIdx, async (newIdx) => {
  await nextTick()
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
})

const activeLineEl = ref(null)
function setActiveLineEl(el) {
  activeLineEl.value = el
}

function onKeyDown(e) {
  let userSelectedLine=lines.value[userSelectedLineIdx.value];
  if (e.code === 'Space' && isSoundCue(userSelectedLine)) {
    const soundRef = extractSoundRef(userSelectedLine);
    if (soundManager.isSoundAvailable(soundRef)){
      if (soundRef && soundManager.isPlaying(soundRef)) {
        soundManager.stopSound(soundRef);
      } else {
        soundManager.playSound(soundRef);
        e.preventDefault();
        return;
      } 
    }
  }
  if (e.key === 'ArrowDown' || e.code === 'Space') {
    if (userSelectedLineIdx.value < lines.value.length - 1) {
      selectUserLine(userSelectedLineIdx.value + 1)
    }
    e.preventDefault()
  } else if (e.key === 'ArrowUp') {
    if (userSelectedLineIdx.value > 0) {
      selectUserLine(userSelectedLineIdx.value - 1)
    }
    e.preventDefault()
  } 
}

onMounted(() => {
  const saved = localStorage.getItem('scriptFollowerDocument')
  if (saved) {
    text.value = saved
  }
  // Restore filename from localStorage
  const savedFilename = localStorage.getItem('scriptFollowerFilename')
  if (savedFilename) {
    filename.value = savedFilename
  }
  const viewer = document.querySelector('.document-viewer')
  if (viewer) viewer.focus()
  requestWakeLock()

  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

// Watch for activeLineIdx changes to update selectedSidebarItem
watch(activeLineIdx, (newIdx) => {
  // Optionally, select the first sidebar item for the active line
  const found = sidebarItems.value.find(item => item.idx === newIdx)
  if (found) {
    selectedSidebarItem.value = { idx: found.idx, className: found.className }
  } else {
    selectedSidebarItem.value = { idx: -1, className: '' }
  }
})

const lastFile = ref(null)
const filename = ref('')

async function reloadFile() {
  if (!lastFile.value) {
    error.value = 'No file to reload.'
    return
  }
  error.value = ''
  text.value = ''
  loading.value = true
  activeLineIdx.value = -1
  hasMatched.value = false
  try {
    text.value = await processDocument(lastFile.value)
  } catch (e) {
    error.value = 'Error reloading document: ' + e.message
  }
  loading.value = false
}

let wakeLock = null

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
  prevActiveLineIdx.value = userSelectedLineIdx.value
  userSelectedLineIdx.value = idx
  noMatch.value = false
}

function scrollToSpeechLine() {
  nextTick(() => {
    const viewer = document.querySelector('.document-viewer')
    const el = viewer?.querySelector(`[data-line-idx="${speechActiveLineIdx.value}"]`)
    if (viewer && el) {
      const viewerRect = viewer.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const offset = elRect.top - viewerRect.top + viewer.scrollTop - (10 * 16)
      viewer.scrollTo({ top: offset, behavior: 'smooth' })
    }
  })
}

// Watch for speechActiveLineIdx changes to update userSelectedLineIdx
watch(speechActiveLineIdx, (newIdx) => {
  if (autoscroll.value && newIdx !== -1) {
    userSelectedLineIdx.value = newIdx
  }
})

watch(listening, (val) => {
  if (!speech.isSupported) {
    error.value = 'Speech recognition not supported in this browser.'
    listening.value = false
    return
  }
  if (val) {
    // Start listening if not already
    if (!speech.isListening) {
      error.value = ''        // Clear error when starting to listen
      transcript.value = ''   // Clear transcript when starting to listen
      restartAttempts = 0
      if (restartTimeout) clearTimeout(restartTimeout)
      restartTimeout = null
      speech.start()
    }
  } else {
    // Always stop listening and clear transcript/error when unchecked
    if (restartTimeout) clearTimeout(restartTimeout)
    if (speech.isListening) speech.stop()
    transcript.value = ''
    error.value = ''
  }
})

const appVersion = __APP_VERSION__

</script>

