<template>
  <div :class="{toolbar: true, 'toolbar-listening': state.listening, 'toolbar-not-listening': !state.listening  }" >
    <button v-if="isMobile" @click="topRowCollapsed = !topRowCollapsed" class="btn btn-secondary btn-sm toggle-button">
      {{ topRowCollapsed ? 'Show Options' : 'Hide Options' }}
    </button>
    <div v-show="!topRowCollapsed" class="toolbar-row toolbar-top-row">
      <!--<button class="btn btn-primary btn-sm me-2" @click="reloadFile" :disabled="!state.lastFile" >Reload</button>-->
      <label class="openFileLabel btn btn-primary btn-sm file-label mb-0">
        <input id="openFileButton" type="file" @click="clearDocument" @change="handleFile" accept=".docx,.pdf,.odt" style="display:none;" />
        Open File
      </label>
      <span v-if="state.filename" class="ms-2">{{ state.filename }}</span>
      <label class="soundFolderLabel btn btn-secondary btn-sm mb-0 ms-2">
        Sound Folder:
        <input id="soundFolderButton" type="file" webkitdirectory directory @change="onFolderChange" class="btn btn-primary mb-0"></input>
        <span v-if="state.soundFolderPath" class="soundFolderPath">{{ state.soundFolderPath }}</span>
      </label>
      <button class="btn btn-success btn-sm ms-4" @click="$emit('download-sound-csv')" :disabled="!state.filename" >Download Sound CSV</button> 
    </div>


    <div class="toolbar-row toolbar-bottom-row">
      
      <div class="toolbar-controls">
        <label class="form-check-label">
          <input type="checkbox" class="form-check-input" :checked="state.listening" @change="$emit('update:listening', $event.target.checked)" />
          Listening
        </label>
        <label class="form-check-label">
          <input type="checkbox" class="form-check-input" :checked="state.autoscroll" @change="$emit('update:autoscroll', $event.target.checked)" />
          Autoscroll
        </label>
        <button class="btn btn-primary btn-sm" @click="resetView">Reset</button>
      </div>

      <div class="toolbar-navigation">
        <label id="PageNumber">
          Page     
          <input id="page-number-input" class="page-number-input" type="number" v-model="pageNumberInput" @change="onPageNumberChange" @keyup.enter="onPageNumberChange" min="1"/>
        </label>
        <label id="FindText">
          <input type="text" class="find-text-input" placeholder="Find text..." v-model="findText" @focus="state.allowSpaceCharacter = true" @blur="() => { state.allowSpaceCharacter = false; onFindNext(); }"/>
          <button class="btn btn-secondary btn-sm" @click="onFindNext" :disabled="!findText">Next</button>
        </label>
      </div>

    </div>

    <div class="toolbar-messages">
      <span  v-if="state.transcript" :class="['heard-text', { 'heard-no-match': state.noMatch }]"  > Heard: "{{ state.transcript }}"</span>
      <span v-if="state.error" class="error">{{ state.error }}</span>
      <span v-if="state.message!=''" class="message">{{ state.message }}</span>
    </div>

    <div id="logo" class="logo">
      <img id="icon" :src="`${base}icons/icon-192.png`" alt="App Icon"  height="40" />
      <div id="version" class="version"> v{{ state.version }} </div>
    </div>  
  </div>
</template>

<script setup>


import { ref ,watch, onMounted, onUnmounted } from 'vue'
import { isMobileSize } from '../modules/utilities.js'
import { appValues } from '../modules/constants.js'


const props = defineProps({
  selectedLine: Object,
  state: Object
})
const emit = defineEmits(['update:listening','update:autoscroll','select-sound-folder','file-loaded','reload-file','reset-view','clear-document','goto-page-number','find-text','open-google-picker','download-sound-csv'])
const base = import.meta.env.BASE_URL
const pageNumberInput = ref('')
const findText = ref('')
const isMobile = ref(isMobileSize())
const topRowCollapsed = ref(isMobile.value)

function resetView() { emit('reset-view') }
function reloadFile() { emit('reload-file') }
function handleFile(event) { emit('file-loaded', event)}
function clearDocument(event) { emit('clear-document', event)}
function onFolderChange(e) { emit('select-sound-folder', e)}
function onPageNumberChange(e) { emit('goto-page-number', Number(pageNumberInput.value))}
function onFindNext(e) { emit('find-text', findText.value) }

watch(
  () => props.selectedLine?.pageNumber,
  (newPageNumber) => {
    pageNumberInput.value = newPageNumber || 1
  },
  { immediate: true }
)

const handleResize = () => {
  isMobile.value = isMobileSize()
  topRowCollapsed.value = isMobile.value
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})



</script>

<!-- filepath: /Users/nigeljudson/Documents/VSCode/ScriptFollower/script-follower-vite/src/components/Toolbar.vue -->
<style src="../css/toolbar.css"></style>