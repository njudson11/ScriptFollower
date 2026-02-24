<script setup lang="ts">
import { computed, inject, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import type { EventBus } from '@/core/EventBus'
import { EVENT_TYPES } from '@/core/EventBus'
import type { ScriptLineBase } from '@/types/core'
import DocumentInfoPanel from './DocumentInfoPanel.vue'
import LineDataPanel from './LineDataPanel.vue'
import { FeatureManager } from '@/core/FeatureManager'

const appStore = inject('appStore') as AppStore
const selectionManager = inject('selectionManager') as LineSelectionManager
const eventBus = inject('eventBus') as EventBus
const featureManager = inject('featureManager') as FeatureManager

const currentDocument = computed(() => appStore.getCurrentDocument())
const currentLineId = ref<string | null>(selectionManager.getCurrentLine())
const currentLine = computed((): ScriptLineBase | undefined => {
  if (!currentLineId.value) return undefined
  return appStore.getLineById(currentLineId.value)
})

const activeTab = ref<'documentInfo' | 'lineData' | 'audioTest'>('documentInfo');

const audioTestComponent = computed(() => {
  // Use a dummy line type for the test panel as defined in AudioTestFeature
  return featureManager.getLineRenderer('AUDIO_TEST' as any, 'right-panel');
});

watch([currentDocument, currentLine], () => {
  if (currentDocument.value && !currentLine.value && activeTab.value === 'lineData') {
    activeTab.value = 'documentInfo';
  } else if (!currentDocument.value && currentLine.value && activeTab.value === 'documentInfo') {
    activeTab.value = 'lineData';
  }
}, { immediate: true });


const updateCurrentLine = () => {
  currentLineId.value = selectionManager.getCurrentLine()
  if (currentLineId.value && activeTab.value === 'documentInfo') {
    activeTab.value = 'lineData';
  } else if (!currentLineId.value && activeTab.value === 'lineData') {
    activeTab.value = 'documentInfo';
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
    <div class="tab-header" v-if="!appStore.state.isRightPanelCollapsed">
      <div class="tab-buttons-wrapper">
        <button :class="{ active: activeTab === 'documentInfo' }" @click="activeTab = 'documentInfo'" :disabled="!currentDocument">
          Document Info
        </button>
        <button :class="{ active: activeTab === 'lineData' }" @click="activeTab = 'lineData'" :disabled="!currentLine">
          Line Data
          <span v-if="currentLine" class="line-data-badge">{{ currentLine.lineNumber }}</span>
        </button>
        <button :class="{ active: activeTab === 'audioTest' }" @click="activeTab = 'audioTest'">
          Audio Test
        </button>
      </div>
      <button @click="appStore.toggleRightPanel()" class="collapse-button">
        <span>&#x20;<<</span>
      </button>
    </div>
    
    <div class="collapsed-header" v-if="appStore.state.isRightPanelCollapsed">
        <button @click="appStore.toggleRightPanel()" class="collapse-button">
            <span>>></span>
        </button>
    </div>

    <div class="panel-content" v-if="!appStore.state.isRightPanelCollapsed">
        <DocumentInfoPanel v-if="activeTab === 'documentInfo' && currentDocument" :current-document="currentDocument" />
        <LineDataPanel v-if="activeTab === 'lineData' && currentLine" :current-line="currentLine" :on-clear-selection="clearSelection" />
        <component v-if="activeTab === 'audioTest' && audioTestComponent" :is="audioTestComponent" />
    </div>
  </div>
</template>

<style scoped>
@import '../css/RightPanel.css';
</style>