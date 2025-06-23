<template>
  <div id="app">
    <div
      :class="{
        toolbar: true,
        'toolbar-listening': listening,
        'toolbar-not-listening': !listening
      }"
    >
      <!-- Toolbar Row 1: Buttons -->
      <div class="toolbar-row">
        <button @click="toggleListening">{{ listening ? 'Stop Listening' : 'Start Listening' }}</button>
        <button @click="resetView">Reset</button>
        <label style="margin-left:1rem;">
          <input type="checkbox" v-model="autoscroll" />
          Autoscroll
        </label>
        <button @click="reloadFile">Reload</button>
        <input
          type="file"
          ref="fileInput"
          @change="handleFile"
          accept=".docx,.pdf,.odt"
        />
      </div>
      <!-- Toolbar Row 2: Messages -->
      <div class="toolbar-row toolbar-messages">
        <span
          v-if="transcript"
          :class="['heard-text', { 'heard-no-match': noMatch }]"
        >
          Heard: "{{ transcript }}"
        </span>
        <span v-if="loading" class="message">Loading...</span>
        <span v-if="error" class="error">{{ error }}</span>
      </div>
    </div>
    <div class="main-content">
      <div class="sidebar">
        <div
          v-for="item in sidebarItems"
          :key="`${item.idx}-${item.className}-${item.text}`"
          :class="['sidebar-item', item.className, { selected: isSidebarItemSelected(item) }]"
          :style="{ paddingLeft: `${item.level * 1.5}em` }"
          @click="selectSidebarItem(item)"
        >
          {{ item.text }}
        </div>
      </div>
      <div class="document-viewer" ref="documentViewer" @keydown="onKeyDown" tabindex="0">
        <p
          v-for="(line, idx) in lines"
          :key="idx"
          :data-line-idx="idx"
          :ref="idx === userSelectedLineIdx ? setActiveLineEl : null"
          :class="{
            'active-line': idx === userSelectedLineIdx && !(idx === speechActiveLineIdx && noMatch),
            'speech-highlight': idx === speechActiveLineIdx && !noMatch,
            'active-line-no-match': idx === speechActiveLineIdx && noMatch
          }"
          v-html="highlightLineWrapper(line)"
          tabindex="0"
          @click="selectUserLine(idx)"
        />
      </div>
    </div>
    <label style="margin-left:1rem;">
      <input type="checkbox" v-model="autoscroll" />
      Autoscroll
    </label>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, watchEffect } from 'vue'
import { processDocument } from './modules/documentProcessor'
import { useSpeechRecognition } from './modules/speechRecognition'
import { findClosestLine } from './modules/textMatcher'
import { highlightLine } from './modules/textFormatter'


const documentViewer = ref(null)

const highlightRules = [
  { regex: /(?:^|>)([^:\n]+:)/m, className: 'name-highlight' },
  { regex: /SOUND\s*\d{4}.*$/gm, className: 'sound-cue' },
  { regex: /LIGHTS.*$/gm, className: 'lights-cue' },
  { regex: /Act (One|Two).*$/igm, className: 'Scene' }
]

const sidebarClasses = [
  { className: 'Act', level: 0 },
  { className: 'Scene', level: 0 },
  { className: 'sound-cue', level: 1 },
  { className: 'lights-cue', level: 1 }
]

const text = ref('')
const loading = ref(false)
const error = ref('')
const transcript = ref('')
const listening = ref(false)
const activeLineIdx = ref(-1)
const prevActiveLineIdx = ref(-1)
const noMatch = ref(false)
const hasMatched = ref(false)
const initialLineCount = 4000
const userSelectedLineIdx = ref(-1) // For user selection (keyboard/mouse)
const speechActiveLineIdx = ref(-1) // For speech recognition highlight
const autoscroll = ref(true)        // For the toolbar checkbox

const lines = computed(() => text.value.split(/\r?\n/))


const cleanLines = computed(() => {
  // Regex: start of line, any text up to the first colon, then the dialogue
  const dialogueRegex = /^([^:\n]+):\s*(.*)$/i
  return lines.value
    .map((line, idx) => {
      // Remove HTML tags
      const noHtml = line.replace(/<[^>]*>/g, '')
      const match = noHtml.match(dialogueRegex)
      if (match) {
        // match[2] is the dialogue section after the character name and colon
        let dialogue = match[2] || ''
        // Remove grammatical characters, including en dash (–) and em dash (—)
        dialogue = dialogue.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’”“[\]\\|<>–—]/g, '')
        return { clean: dialogue.trim(), idx }
      }
      return null
    })
    .filter(Boolean)
})

function highlightLineWrapper(line) {
  return highlightLine(line, highlightRules)
}

const fileInput = ref(null)

async function handleFile(event) {
  error.value = ''
  text.value = ''
  loading.value = true
  activeLineIdx.value = -1
  hasMatched.value = false
  const file = event.target.files[0]
  if (!file) {
    loading.value = false
    return
  }
  lastFile.value = file // Store the file for reload
  try {
    text.value = await processDocument(file)
  } catch (e) {
    error.value = 'Error loading document: ' + e.message
  }
  loading.value = false
  // Reset the file input so the same file can be selected again
  if (fileInput.value) fileInput.value.value = ''
}

const speech = useSpeechRecognition(
  (spoken) => {
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
    error.value = 'Speech recognition error: ' + err
    listening.value = false
  },
  () => {
    listening.value = false
    // Only show the message if not currently listening
    if (!listening.value) {
      error.value = 'Speech recognition stopped.'
    }
  }
)

function toggleListening() {
  if (!speech.isSupported) {
    error.value = 'Speech recognition not supported in this browser.'
    return
  }
  if (listening.value) {
    speech.stop()
    listening.value = false
  } else {
    error.value = '' // Clear any previous error
    transcript.value = ''
    speech.start()
    listening.value = true
  }
}

function resetView() {
  activeLineIdx.value = -1
  prevActiveLineIdx.value = -1
  noMatch.value = false
  hasMatched.value = false
  transcript.value = ''
  if (speech.isListening) {
    speech.stop()
    listening.value = false
  }
  // No need to scroll here; watcher will handle it
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

function selectLine(idx) {
  prevActiveLineIdx.value = activeLineIdx.value
  activeLineIdx.value = idx
  noMatch.value = false
}

function onKeyDown(e) {
  if (e.key === 'ArrowDown') {
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
  const viewer = document.querySelector('.document-viewer')
  if (viewer) viewer.focus()
  requestWakeLock()
})

const sidebarItems = ref([])

async function updateSidebarItems() {
  await nextTick()
  const items = []
  if (documentViewer.value) {
    sidebarClasses.forEach(sc => {
      const elements = documentViewer.value.querySelectorAll(`.${sc.className}`)
      elements.forEach(el => {
        // Find the outermost <p> with data-line-idx
        let parentP = el
        while (parentP && (parentP.tagName !== 'P' || !parentP.hasAttribute('data-line-idx'))) {
          parentP = parentP.parentElement
        }
        const idx = parentP ? Number(parentP.getAttribute('data-line-idx')) : -1
        if (parentP && idx !== -1) {
          items.push({
            idx,
            className: sc.className,
            level: sc.level,
            text: (sc.className === 'Scene')
              ? parentP.textContent.trim()
              : el.textContent.trim()
          })
        }
      })
    })
  }
  sidebarItems.value = items
    .filter((item, i, arr) =>
      arr.findIndex(it =>
        it.idx === item.idx &&
        it.className === item.className &&
        it.text === item.text
      ) === i
    )
    .sort((a, b) => a.idx - b.idx)
}

onMounted(updateSidebarItems)
watch(text, updateSidebarItems)
watch(text, (newText) => {
  localStorage.setItem('scriptFollowerDocument', newText)
})

const selectedSidebarItem = ref({ idx: -1, className: '' })

function selectSidebarItem(item) {
  selectedSidebarItem.value = { idx: item.idx, className: item.className }
  selectUserLine(item.idx)
}

function isSidebarItemSelected(item) {
  return (
    item.idx === selectedSidebarItem.value.idx &&
    item.className === selectedSidebarItem.value.className
  )
}

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
</script>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
}

.toolbar {
  display: flex;
  flex-direction: column;   /* <-- Add this line */
  align-items: flex-start;  /* <-- Optionally align left */
  gap: 0;                   /* Remove gap between rows */
  padding-left: 1rem;
  background: #f0f0f0;
  border-bottom: 1px solid #ddd;
  transition: background 0.3s;
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
}

.toolbar-listening {
  background: #d1ffd1 !important;
}
.toolbar-not-listening {
  background: #f0f0f0 !important;
}

.main-content {
  display: flex;
  flex: 1 1 0;
  min-height: 0;
}

.sidebar {
  width: 260px;
  overflow-y: auto;
  background: #f5f5f5;
  border-right: 1px solid #ddd;
  padding: 1rem 0;
}

.document-viewer {
  flex: 1;
  overflow: auto;
  padding: 2rem;
  background: #f9f9f9;

  min-height: 0;
}

.active-line {
  background: #ffe066;
  transition: background 0.3s;
  border: 1px solid #ccc;
}
.active-line-no-match {
  background: #f4a897;
  transition: background 0.3s;
}

.sidebar-item {
  cursor: pointer;
  padding: 0.3em 1em;
  transition: background 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidebar-item.selected {
  background: #eac94f;
}


.message { color:green}
.error { color:red}

.sound-cue , .Sound_20_A { background-color: #ff0000; color: white; font-weight: bold; }
.lights-cue , .Light { background-color: #2a6099; color:white ;font-weight: bold;  }
.name-highlight { color: black; font-weight: bold; }  

.Stage_20_Direction{
  font-style: italic;
  color: #555;
}
.Scene{
  font-weight: bold;
  color: #333;
}
.PageNumber{
  background-color: #ddd;
  color: #333;
}
.speech-highlight {
  background: #b3e6ff !important;
  border: 1px solid #3399cc;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
}
.toolbar-messages {
  min-height: 1.5em;
  gap: 2rem;
}
.file-label {
  margin-left: 1rem;
  cursor: pointer;
}
.file-button {
  display: inline-block;
  padding: 0.3em 1em;
  background: #e0e0e0;
  border-radius: 4px;
  border: 1px solid #ccc;
  cursor: pointer;
}
.file-label input[type="file"] {
  display: none;
}

.heard-text {
  color: #333;
  background: #ffe;
  padding: 0.1em 0.5em;
  border-radius: 4px;
  transition: background 0.3s;
}
.heard-no-match {
  background: #f4a897 !important; /* or any red shade you prefer */
  color: #900 !important;
}
</style>