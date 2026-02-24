<script setup lang="ts">
import { computed, inject, type Component, ref } from 'vue' // Removed watch, nextTick, onBeforeUpdate, Ref
import type { AppStore } from '@/store/AppStore'
import type { FeatureManager } from '@/core/FeatureManager'
import { LineType, ScriptLineBase } from '@/types/core'
import DefaultLineComponent from './DefaultLineComponent.vue'
import type { ActionController } from '@/core/ActionController'
import { ACTION_TYPES } from '@/types/actions'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import { useStickyScroll } from '@/composables/useStickyScroll' // Import useStickyScroll
import { AppConfig } from '@/config/AppConfig' // Import AppConfig

const appStore = inject('appStore') as AppStore
const featureManager = inject('featureManager') as FeatureManager
const actionController = inject('actionController') as ActionController
const selectionManager = inject('selectionManager') as LineSelectionManager

const lines = computed(() => appStore.getLines());

const currentLineId = computed(() => {
  const id = selectionManager.getCurrentLine();
  return id;
})

const viewerRef = ref<HTMLElement | null>(null)
const scrollOffsetPx = ref(AppConfig.viewers.documentViewer.scrollOffsetPx); // Get offset from AppConfig

const { setLineRef } = useStickyScroll({
  viewerRef,
  lines,
  currentLineId,
  scrollOffsetPx
});

const getLineComponent = (lineType: LineType): Component => {
  return featureManager.getLineRenderer(lineType, 'default') || DefaultLineComponent
}

const handleLineClick = (lineId: string) => {
  actionController.dispatch({ type: ACTION_TYPES.SELECT_LINE, payload: { lineId } });
}
</script>

<template>
  <div class="document-viewer" ref="viewerRef" tabindex="0">
    <div class="document-content">
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
  </div>
</template>

<style scoped>
@import '../css/DocumentViewer.css';
</style>