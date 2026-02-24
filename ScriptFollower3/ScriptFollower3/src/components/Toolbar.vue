<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { AppStore } from '@/store/AppStore'
import packageJson from '../../package.json'

interface Props {
  hasDocument: boolean
  isLoading: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  fileUpload: [event: Event]
}>()

const appStore = inject('appStore') as AppStore
const currentDocument = computed(() => appStore.getCurrentDocument())
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <h1 class="title">ScriptFollower <span class="version">v{{ packageJson.version }}</span></h1>
    </div>

    <div class="toolbar-center">
      <span v-if="hasDocument && currentDocument" class="document-info">
        {{ currentDocument.name }} (v{{ currentDocument.version }})
      </span>
    </div>

    <div class="toolbar-right">
      <label class="file-input-label">
        <input
          type="file"
          accept=".odt"
          @change="emit('fileUpload', $event)"
          style="display: none"
          :disabled="isLoading"
        />
        <span>{{ isLoading ? 'Loading...' : 'Load Document' }}</span>
      </label>
    </div>
  </div>
</template>

<style scoped>
@import '../css/Toolbar.css';
</style>