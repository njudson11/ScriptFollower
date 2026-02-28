<script setup lang="ts">
import { computed, inject, type Component, ref, watch } from 'vue' 
import type { AppStore } from '@/store/AppStore'
import type { FeatureManager } from '@/core/FeatureManager'
import { LineType, ScriptLineBase } from '@/types/core'
import DefaultLineComponent from './DefaultLineComponent.vue'
import type { ActionController } from '@/core/ActionController'
import { ACTION_TYPES } from '@/types/actions'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import { useStickyScroll } from '@/composables/useStickyScroll'
import { AppConfig } from '@/config/AppConfig'

const appStore = inject('appStore') as AppStore
const featureManager = inject('featureManager') as FeatureManager
const actionController = inject('actionController') as ActionController
const selectionManager = inject('selectionManager') as LineSelectionManager

const emit = defineEmits<{
  fileUpload: [event: Event]
}>()

const lines = computed(() => appStore.getLines());
const hasDocument = computed(() => appStore.state.currentDocument !== null);

const currentLineId = computed(() => {
  return selectionManager.getCurrentLine();
})

const viewerRef = ref<HTMLElement | null>(null)
const scrollOffsetPx = ref(AppConfig.viewers.documentViewer.scrollOffsetPx);

const { setLineRef } = useStickyScroll({
  viewerRef,
  currentLineId,
  scrollOffsetPx
})

const getLineComponent = (lineType: LineType): Component => {
  return featureManager.getLineRenderer(lineType, 'default') || DefaultLineComponent
}

const handleLineClick = (lineId: string) => {
  actionController.dispatch({ type: ACTION_TYPES.SELECT_LINE, payload: { lineId } });
}
</script>

<template>
  <div class="document-viewer" ref="viewerRef" tabindex="0">
    <div v-if="hasDocument" class="document-content">
      <component
        v-for="line in lines"
        :key="line.id"
        :ref="(el) => setLineRef(line.id, el)"
        :is="getLineComponent(line.lineType)"
        :line="line"
        :is-active="line.id === currentLineId"
        @click="handleLineClick(line.id)"
        context-class="context-document-viewer"
      />
    </div>
    <div v-else class="empty-state">
      <div class="empty-state-content">
        <h1>No script loaded</h1>
        <p>Load an ODT document to get started</p>
        <label class="upload-button">
          <input type="file" accept=".odt" @change="emit('fileUpload', $event)" style="display: none" />
          <span>{{ appStore.state.isLoading ? 'Loading...' : 'Choose File' }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/DocumentViewer.css';

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.empty-state h1 {
  font-size: 2em;
  color: var(--color-text-primary);
  margin-bottom: 12px;
}

.empty-state p {
  color: var(--color-text-secondary);
  margin-bottom: 24px;
}

.upload-button {
  display: inline-block;
  padding: 12px 32px;
  background-color: var(--color-primary);
  color: var(--color-text-on-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s;
}

.upload-button:hover {
  background-color: var(--color-primary-dark);
}
</style>