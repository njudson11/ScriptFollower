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

// Determine if there are "Action" components for this line
const contextualActionComponent = computed(() => {
  if (!currentLine.value) return null;
  return featureManager.getLineRenderer(currentLine.value.lineType, 'right-panel');
});

const hasActionTab = computed(() => !!contextualActionComponent.value);

type Tab = 'documentInfo' | 'lineData' | 'masterAudio' | 'action';
const activeTab = ref<Tab>('documentInfo');

const masterAudioComponent = computed(() => {
  return featureManager.getLineRenderer('MASTER_AUDIO_PANEL' as any, 'right-panel');
});

const getFirstVisibleTab = (): Tab => {
  if (hasActionTab.value) return 'action';
  if (currentLine.value) return 'lineData';
  if (currentDocument.value) return 'documentInfo';
  return 'masterAudio'; // Fallback
};

const updateCurrentLine = () => {
  const newLineId = selectionManager.getCurrentLine();
  const lineChanged = newLineId !== currentLineId.value;
  currentLineId.value = newLineId;
  
  if (currentLineId.value) {
    if (lineChanged) {
        // Force switch to 'action' tab if it's available for the new line
        if (hasActionTab.value) {
            activeTab.value = 'action';
        } else {
            activeTab.value = getFirstVisibleTab();
        }
    } else {
        // Tab preservation logic for non-line-change updates
        if (activeTab.value === 'action' && !hasActionTab.value) {
            activeTab.value = getFirstVisibleTab();
        }
    }
  } else {
    // No line selected, default to document info if a document is loaded
    if (activeTab.value !== 'masterAudio' && activeTab.value !== 'documentInfo') {
        activeTab.value = currentDocument.value ? 'documentInfo' : 'masterAudio';
    }
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
        <button v-if="hasActionTab" :class="{ active: activeTab === 'action' }" @click="activeTab = 'action'">
          Action
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
        <component v-if="activeTab === 'action' && contextualActionComponent" :is="contextualActionComponent" :line="currentLine" />
        <LineDataPanel v-if="activeTab === 'lineData' && currentLine" :current-line="currentLine" :on-clear-selection="clearSelection" />
        <DocumentInfoPanel v-if="activeTab === 'documentInfo' && currentDocument" :current-document="currentDocument" />
        <component v-if="activeTab === 'masterAudio' && masterAudioComponent" :is="masterAudioComponent" />
    </div>
  </div>
</template>

<style scoped>
@import '../css/RightPanel.css';
</style>
