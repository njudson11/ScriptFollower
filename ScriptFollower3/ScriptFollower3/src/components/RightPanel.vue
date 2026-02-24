<script setup lang="ts">
import { computed, inject, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import type { EventBus } from '@/core/EventBus'
import { EVENT_TYPES } from '@/core/EventBus'
import type { ScriptLineBase } from '@/types/core' // Removed StyleInfo
import DocumentInfoPanel from './DocumentInfoPanel.vue' // Import DocumentInfoPanel
import LineDataPanel from './LineDataPanel.vue' // Import LineDataPanel

const appStore = inject('appStore') as AppStore
const selectionManager = inject('selectionManager') as LineSelectionManager
const eventBus = inject('eventBus') as EventBus

const currentDocument = computed(() => appStore.getCurrentDocument())
const currentLineId = ref<string | null>(selectionManager.getCurrentLine())
const currentLine = computed((): ScriptLineBase | undefined => {
  if (!currentLineId.value) return undefined
  return appStore.getLineById(currentLineId.value)
})

const activeTab = ref<'documentInfo' | 'lineData'>('documentInfo');

watch([currentDocument, currentLine], () => {
  if (currentDocument.value && !currentLine.value) {
    activeTab.value = 'documentInfo';
  } else if (!currentDocument.value && currentLine.value) {
    activeTab.value = 'lineData';
  } else if (currentDocument.value && currentLine.value && activeTab.value === 'documentInfo') {
    // If both exist, and doc info was active, keep it. If line data was active, keep it.
    // This prevents tabs from switching unnecessarily.
  } else if (!currentDocument.value && !currentLine.value) {
    // Optionally reset if nothing is loaded
    activeTab.value = 'documentInfo'; // Default or empty state
  }
}, { immediate: true });


const updateCurrentLine = () => {
  currentLineId.value = selectionManager.getCurrentLine()
  if (currentLineId.value && activeTab.value === 'documentInfo') {
    activeTab.value = 'lineData'; // Switch to line data if a line is selected and we're on document info
  } else if (!currentLineId.value && activeTab.value === 'lineData') {
    activeTab.value = 'documentInfo'; // Switch back if line is deselected and we're on line data
  }
}

const clearSelection = () => {
  selectionManager.selectLine(null)
}

onMounted(() => {
  const unsubscribe = eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, updateCurrentLine)
  onBeforeUnmount(() => {
    unsubscribe()
  })
})
</script>

<template>
  <div class="right-panel" :class="{ 'is-collapsed': appStore.state.isRightPanelCollapsed }">
    <div class="tab-header">
      <div class="tab-buttons-wrapper">
        <button :class="{ active: activeTab === 'documentInfo' }" @click="activeTab = 'documentInfo'" :disabled="!currentDocument">
          Document Info
        </button>
        <button :class="{ active: activeTab === 'lineData' }" @click="activeTab = 'lineData'" :disabled="!currentLine">
          Line Data
          <span v-if="currentLine" class="line-data-badge">{{ currentLine.lineNumber }}</span>
        </button>
      </div>
      <button @click="appStore.toggleRightPanel()" class="collapse-button">
        <span v-if="appStore.state.isRightPanelCollapsed">>></span>
        <span v-else>&#x20;<<</span>
      </button>
    </div>

    <DocumentInfoPanel v-if="activeTab === 'documentInfo' && currentDocument" :current-document="currentDocument" />

    <LineDataPanel v-if="activeTab === 'lineData' && currentLine" :current-line="currentLine" :on-clear-selection="clearSelection" />
  </div>
</template>

<style scoped>
@import '../css/RightPanel.css';
</style>