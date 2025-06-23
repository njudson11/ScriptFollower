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
        <button
          class="btn btn-primary btn-sm me-2"
          @click="reloadFile"
          :disabled="!lastFile"
        >
          Reload
        </button>
        <label class="btn btn-primary btn-sm file-label mb-0">
          <input
            type="file"
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
      <div class="toolbar-row toolbar-messages">
        <span  v-if="transcript" :class="['heard-text', { 'heard-no-match': noMatch }]"  >
          Heard: "{{ transcript }}"
        </span>
        <span v-if="loading" class="message">Loading...</span>
        <span v-if="error" class="error">{{ error }}</span>
      </div>

    </div>
    <div class="version">
      v{{ version }}
    </div>

  </div>
</template>

<script setup>
defineProps({
  listening: Boolean,
  autoscroll: Boolean,
  transcript: String,
  noMatch: Boolean,
  loading: Boolean,
  error: String,
  appVersion: String,
  version: String,
  filename: String,
  lastFile: String,
  soundFolderPath: String
})
const emit = defineEmits(['select-sound-folder'])
const base = import.meta.env.BASE_URL

function handleFile(event) {
  emit('file-loaded', event)
}
function resetView() { emit('reset-view') }
function reloadFile() { emit('reload-file') }
function onFolderChange(e) {
  emit('select-sound-folder', e)
}
</script>

<!-- filepath: /Users/nigeljudson/Documents/VSCode/ScriptFollower/script-follower-vite/src/components/Toolbar.vue -->
<style src="../css/toolbar.css"></style>