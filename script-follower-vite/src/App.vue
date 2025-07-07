<template>
  <div id="app">
    <Toolbar
      v-model:listening="listening"
      v-model:autoscroll="autoscroll"
      :transcript="transcript"
      :noMatch="noMatch"
      :message="message"
      :error="error"
      :version="appVersion"
      :filename="filename"
      :lastFile="lastFile"
      :soundFolderPath="soundFolderPath"
      :selectedLine="lines[userSelectedLineIdx]"
      @file-loaded="handleFile"
      @reset-view="resetView"
      @reload-file="reloadFile"
      @clear-document="clearDocument"
      @select-sound-folder="handleSoundFolderChange"
      @goto-page-number="highlightLineByPageNumber"
      @find-text="findNextText" 
    />
    <div class="main-content">
      <Sidebar
        :lines="lines"
        :activeLineIdx="userSelectedLineIdx"
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
import { findClosestLine2 } from './modules/textMatcher'
import { SoundProcessor } from './modules/soundProcessor'
import { SoundManager } from './modules/soundManager'
import { isSoundCue, extractSoundRef}  from './modules/utilities'


const docProcessor = new DocumentProcessor()

const lines = ref(docProcessor.lines)
const message = ref('')
const error = ref('')
const transcript = ref('')
const listening = ref(false)
const prevActiveLineIdx = ref(-1)
const noMatch = ref(false)
const hasMatched = ref(false)
const userSelectedLineIdx = ref(0) // For user selection (keyboard/mouse)
const speechActiveLineIdx = ref(-1) // For speech recognition highlight
const autoscroll = ref(false)        // For the toolbar checkbox

const fileInput = ref(null)
const soundFolderPath = ref('')
//const soundFiles = ref([])

const soundProcessor = ref(new SoundProcessor([]))
const soundManager = ref(new SoundManager(soundProcessor.value))
const playingAudios = soundManager.playingAudios

soundManager.value.onSoundEndCallbacks.push(advanceLineOnSoundEnd);

async function handleFile(event) {
  error.value = ''
  clearDocument();
  hasMatched.value = false
  const file = event.target.files[0]
  if (!file) {
    return
  }
  lastFile.value = file
  filename.value = file.name
  message.value = 'Loading ' + filename.value + ' ...'
  try {
    //await docProcessor.loadFile(file)
    await docProcessor.loadFile(file)
   // lines.value = docProcessor.lines
    saveToLocalStorage()
  } catch (e) {
    message.value=""
    error.value = 'Error loading document: ' + e.message
  }
    message.value=""
  if (fileInput.value) fileInput.value.value = ''
}

function handleSoundFolderChange(e) {
  //soundFiles.value = Array.from(e.target.files)
  soundProcessor.value = new SoundProcessor(e.target.files)
  soundManager.value = new SoundManager(soundProcessor.value)
  soundFolderPath.value = e.target.files[0]?.webkitRelativePath?.split('/')[0] || ''
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
    const activeLines=lines.value
    restartAttempts=0;
    transcript.value = spoken
    let baseIdx = activeLines.findIndex(obj => obj.idx === userSelectedLineIdx.value)
    if (baseIdx === -1) {
      // Find the next nearest item after userSelectedLineIdx
      baseIdx = activeLines.findIndex(obj => obj.idx > userSelectedLineIdx.value)
      // If still not found, use the last item
      if (baseIdx === -1 && activeLines.length > 0) {
        baseIdx = activeLines.length - 1
      }
    }

    // Use speechActiveLineIdx if it's close to the user selection
    let speechBaseIdx = activeLines.findIndex(obj => obj.idx === speechActiveLineIdx.value)
    if (
      speechActiveLineIdx.value !== -1 &&
      speechBaseIdx !== -1 &&
      Math.abs(userSelectedLineIdx.value - speechActiveLineIdx.value) <= 10
    ) {
      baseIdx = speechBaseIdx
    }

    const idx = findClosestLine2(activeLines, spoken, baseIdx)
    if (idx !== -1) {
      speechActiveLineIdx.value = activeLines[idx].idx
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

function highlightLineByPageNumber(pageNumber) {
  const idx = lines.value.findIndex(line => line.type === 'PAGE_NUMBER' && line.pageNumber === pageNumber)
  if (idx !== -1) {
    userSelectedLineIdx.value = idx
   // activeLineIdx.value = idx
  //  speechActiveLineIdx.value = idx
    noMatch.value = false
    //scrollToSpeechLine()
  } else {
    error.value = `No line found for page number ${pageNumber}`
  }
}

function clearDocument(){
  docProcessor.clear();
  clearLocalStorage()
  resetView();
}

function resetView() {
  //activeLineIdx.value = -1
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

// Scroll to user-selected line using Vue refs
watch(userSelectedLineIdx, async (newIdx) => {
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

function advanceLineOnSoundEnd(finishedRef) {
  // If the current userSelectedLineIdx matches and it's not the last line, increment
  const selectedLine = lines.value[userSelectedLineIdx.value]
  if (selectedLine && selectedLine.ref === finishedRef) {
    userSelectedLineIdx.value = userSelectedLineIdx.value + 1
  }
}

const activeLineEl = ref(null)
function setActiveLineEl(el) {
  activeLineEl.value = el
}

function onKeyDown(e) {
  let userSelectedLine=lines.value[userSelectedLineIdx.value];
  if (!userSelectedLine) return;
  if (e.code === 'Space' && userSelectedLine.type === 'SOUND') {
    const soundRef = userSelectedLine.ref;
    const tempSoundManager = soundManager.value;
    if (tempSoundManager.isSoundAvailable(soundRef)){
      if (soundRef && tempSoundManager.isPlaying(soundRef)) {
        tempSoundManager.stopSound(soundRef);
      } else {
        tempSoundManager.playSound(soundRef);
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

function saveToLocalStorage() {
  localStorage.setItem(LS_SCRIPT_FOLLOWER_DOCUMENT, JSON.stringify(lines.value))
  localStorage.setItem(LS_SCRIPT_FOLLOWER_FILENAME, filename.value)
}

function restoreFromLocalStorage() {
  const saved = localStorage.getItem(LS_SCRIPT_FOLLOWER_DOCUMENT)
  if (saved) {
    lines.value = JSON.parse(saved)
  }
  const savedFilename = localStorage.getItem(LS_SCRIPT_FOLLOWER_FILENAME)
  if (savedFilename) {
    filename.value = savedFilename
  }
}

function clearLocalStorage() {
  localStorage.removeItem(LS_SCRIPT_FOLLOWER_DOCUMENT)
  localStorage.removeItem(LS_SCRIPT_FOLLOWER_FILENAME)
}

onMounted(() => {
  restoreFromLocalStorage()

  const viewer = document.querySelector('.document-viewer')
  if (viewer) viewer.focus()
  requestWakeLock()

  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
})

const lastFile = ref(null)
const filename = ref('')

async function reloadFile() {
  if (!lastFile.value) {
    error.value = 'No file to reload.'
    return
  }
  error.value = ''
  loading.value = true
  //activeLineIdx.value = -1
  hasMatched.value = false
  try {
    text.value = await processDocument(lastFile.value)
  } catch (e) {
    error.value = 'Error reloading document: ' + e.message
  }
  loading.value = false
}

let wakeLock = null

function findNextText(text) {
  if (!text) return
  // Example: search through lines for the next occurrence after userSelectedLineIdx
  const startIdx = userSelectedLineIdx.value + 1
  const idx = lines.value.findIndex(
    (line, i) => i >= startIdx && line.text && line.text.includes(text)
  )
  if (idx !== -1) {
    userSelectedLineIdx.value = idx
    scrollToLineIndex(idx)
  } else {
    error.value = 'No more occurrences found.'
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
  prevActiveLineIdx.value = userSelectedLineIdx.value
  userSelectedLineIdx.value = idx
  noMatch.value = false
}

function scrollToSpeechLine() {
  nextTick(() => {
    scrollToLineIndex(speechActiveLineIdx.value)
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
const LS_SCRIPT_FOLLOWER_DOCUMENT = 'scriptFollowerDocument'
const LS_SCRIPT_FOLLOWER_FILENAME = 'scriptFollowerFilename'

</script>

