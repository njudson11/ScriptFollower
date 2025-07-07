<template>
  <div
    :class="{
      toolbar: true,
      'toolbar-listening': listening,
      'toolbar-not-listening': !listening
    }"
    style="display: flex; align-items: center; flex-direction: row;"
  >
    <img
      :src="`${base}icons/icon-192.png`"
      alt="App Icon"
      height="40"
      style="margin-right: 1rem; flex-shrink: 0;"
    />
    <div style="flex: 1;">
      <div class="toolbar-row">
        <label class="form-check-label me-3">
          <input
            type="checkbox"
            class="form-check-input me-1"
            :checked="listening"
            @change="$emit('update:listening', $event.target.checked)"
          />
          Listening
        </label>
        <label class="form-check-label me-3">
          <input
            type="checkbox"
            class="form-check-input me-1"
            :checked="autoscroll"
            @change="$emit('update:autoscroll', $event.target.checked)"
          />
          Autoscroll
        </label>
        <button class="btn btn-primary btn-sm me-2" @click="resetView">Reset</button>
<!--        <button class="btn btn-primary btn-sm me-2" @click="reloadFile" :disabled="!lastFile" >Reload</button>-->
        <label class="btn btn-primary btn-sm file-label mb-0">
          <input
            type="file"
            @click="clearDocument"
            @change="handleFile"
            accept=".docx,.pdf,.odt"
            style="display:none;"
          />
          Open File
        </label>
        <span v-if="filename" class="ms-2">{{ filename }}</span>
              <label style="margin-left:1em;">
      Sound Folder:
      <input
        type="file"
        webkitdirectory
        directory
        @change="onFolderChange"
        class="btn btn-primary mb-0"
      />
      <span v-if="soundFolderPath" style="font-size:0.9em;color:#666;">{{ soundFolderPath }}</span>
    </label>
      </div>
      <div class="toolbar-row toolbar-bottom-row">
        <div class="toolbar-messages">
          <span  v-if="transcript" :class="['heard-text', { 'heard-no-match': noMatch }]"  >
            Heard: "{{ transcript }}"
          </span>
          <span v-if="error" class="error">{{ error }}</span>
          <span v-if="message!=''" class="message">{{ message }}</span>
        </div>
        <div class="toolbar-navigation">
          <label>Page Number     
            <input
            id="page-number-input"
              class="page-number-input"
              type="number"
              v-model="pageNumberInput"
              @change="onPageNumberChange"
              @keyup.enter="onPageNumberChange"
              min="1"
            />
          </label>
          <label>Find Text
            <input
              type="text"
              class="find-text-input"
              placeholder="Find text..."
              v-model="findText"
              @blur="onFindNext"
            />
            <button
              class="btn btn-secondary btn-sm"
              @click="onFindNext"
              :disabled="!findText">Next</button>
          </label>
        </div>
      </div>

    </div>
    <div class="version">
      v{{ version }}
    </div>

  </div>
</template>

<script setup>


import { ref ,watch } from 'vue'

const props = defineProps({
  listening: Boolean,
  autoscroll: Boolean,
  transcript: String,
  noMatch: Boolean,
  message: String,
  error: String,
  appVersion: String,
  version: String,
  filename: String,
  lastFile: Object,
  soundFolderPath: String,
  selectedLine: Object
})
const emit = defineEmits(['select-sound-folder','file-loaded','reload-file','reset-view','clear-document','goto-page-number','find-text'])
const base = import.meta.env.BASE_URL
const pageNumberInput = ref('')
const findText = ref('')

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



</script>

<!-- filepath: /Users/nigeljudson/Documents/VSCode/ScriptFollower/script-follower-vite/src/components/Toolbar.vue -->
<style src="../css/toolbar.css"></style>