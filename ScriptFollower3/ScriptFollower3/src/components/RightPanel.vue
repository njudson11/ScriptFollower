<script setup lang="ts">
import { computed, inject, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import type { EventBus } from '@/core/EventBus'
import { EVENT_TYPES } from '@/core/EventBus'
import { ScriptLineBase, LineType } from '@/types/core'
import DocumentInfoPanel from './DocumentInfoPanel.vue'
import LineDataPanel from './LineDataPanel.vue'
import { FeatureManager } from '@/core/FeatureManager'
import { ChevronsRight, ChevronsLeft } from 'lucide-vue-next'

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

const isSoundCue = computed(() => currentLine.value?.lineType === LineType.SOUND_CUE)

type Tab = 'documentInfo' | 'lineData' | 'masterAudio' | 'soundCue';
const activeTab = ref<Tab>('documentInfo');

const masterAudioComponent = computed(() => {
  // Use the new registration ID
  return featureManager.getLineRenderer('MASTER_AUDIO_PANEL' as any, 'right-panel');
});

const soundCueComponent = computed(() => {
  if (!isSoundCue.value) return null;
  return featureManager.getLineRenderer(LineType.SOUND_CUE, 'right-panel');
});

const getFirstVisibleTab = (): Tab => {
  if (isSoundCue.value) return 'soundCue';
  if (currentLine.value) return 'lineData';
  if (currentDocument.value) return 'documentInfo';
  return 'masterAudio'; // Fallback
};

const updateCurrentLine = () => {
  currentLineId.value = selectionManager.getCurrentLine();
  
  if (currentLineId.value) {
    // If a line is selected, switch to the most relevant contextual tab
    activeTab.value = getFirstVisibleTab();
  } else {
    // No line selected, default to document info if a document is loaded
    activeTab.value = currentDocument.value ? 'documentInfo' : 'masterAudio';
  }
};

watch(() => selectionManager.getCurrentLine(), (newLineId) => {
  updateCurrentLine();
}, { immediate: true });

const clearSelection = () => {
  selectionManager.selectLine(null)
}

onMounted(() => {
  const unsubscribe = eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, updateCurrentLine)
  onBeforeUnmount(() => {
    unsubscribe()
  })
  // Initial check
  updateCurrentLine();
})
</script>

<template>
  <div class="right-panel" :class="{ 'is-collapsed': appStore.state.isRightPanelCollapsed }">
    <div class="tab-header" v-if="!appStore.state.isRightPanelCollapsed">
      <div class="tab-buttons-wrapper">
        <button v-if="isSoundCue" :class="{ active: activeTab === 'soundCue' }" @click="activeTab = 'soundCue'">
          Sound Cue
        </button>
        <button :class="{ active: activeTab === 'masterAudio' }" @click="activeTab = 'masterAudio'">
          Master Audio
        </button>
        <button :class="{ active: activeTab === 'lineData' }" @click="activeTab = 'lineData'" :disabled="!currentLine">
          Line Data
        </button>
        <button :class="{ active: activeTab === 'documentInfo' }" @click="activeTab = 'documentInfo'" :disabled="!currentDocument">
          Doc Info
        </button>
      </div>
      <button @click="appStore.toggleRightPanel()" class="collapse-button" title="Collapse Panel">
        <ChevronsRight :size="20" />
      </button>
    </div>
    
    <div class="collapsed-header" v-if="appStore.state.isRightPanelCollapsed">
        <button @click="appStore.toggleRightPanel()" class="collapse-button" title="Expand Panel">
            <ChevronsLeft :size="20" />
        </button>
    </div>

    <div class="panel-content" v-if="!appStore.state.isRightPanelCollapsed">
        <component v-if="activeTab === 'soundCue' && soundCueComponent" :is="soundCueComponent" :line="currentLine" />
        <LineDataPanel v-if="activeTab === 'lineData' && currentLine" :current-line="currentLine" :on-clear-selection="clearSelection" />
        <DocumentInfoPanel v-if="activeTab === 'documentInfo' && currentDocument" :current-document="currentDocument" />
        <component v-if="activeTab === 'masterAudio' && masterAudioComponent" :is="masterAudioComponent" />
    </div>
  </div>
</template>

<style scoped>
@import '../css/RightPanel.css';
</style>
