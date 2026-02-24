<script setup lang="ts">
import { computed, inject, type Component, ref, watch, nextTick, onBeforeUpdate, type Ref } from 'vue' // Import Ref
import type { AppStore } from '@/store/AppStore'
import type { FeatureManager } from '@/core/FeatureManager'
import { LineType, ScriptLineBase } from '@/types/core'
import DefaultLineComponent from './DefaultLineComponent.vue'
import type { ActionController } from '@/core/ActionController'
import { ACTION_TYPES } from '@/types/actions'
import type { LineSelectionManager } from '@/core/LineSelectionManager'

const appStore = inject('appStore') as AppStore
const featureManager = inject('featureManager') as FeatureManager
const actionController = inject('actionController') as ActionController
const selectionManager = inject('selectionManager') as LineSelectionManager

const lines = computed(() => appStore.getLines())
const currentLineId = computed(() => {
  const id = selectionManager.getCurrentLine();
  return id;
})

const viewerRef = ref<HTMLElement | null>(null)
const lineRefs: Ref<Array<HTMLElement | Component>> = ref([])

onBeforeUpdate(() => {
  lineRefs.value = []; // Clear the array before each update
})

const setLineRef = (el: HTMLElement | Component | null, index: number) => {
  if (el) {
    lineRefs.value[index] = el; // Assign element directly by index
  }
};

const scrollOffsetPx = ref(300);

const getLineComponent = (lineType: LineType): Component => {
  return featureManager.getLineRenderer(lineType) || DefaultLineComponent
}

const handleLineClick = (lineId: string) => {
  actionController.dispatch({ type: ACTION_TYPES.SELECT_LINE, payload: { lineId } });
}

watch(currentLineId, async (newLineId) => {
  if (newLineId && viewerRef.value) {
    await nextTick();

    const newActiveLineIndex = lines.value.findIndex(line => line.id === newLineId);
    const lineRefInstance = lineRefs.value[newActiveLineIndex]; // This could be a component instance or HTMLElement

    let activeLineElement: HTMLElement | null = null;

    if (lineRefInstance instanceof HTMLElement) {
      activeLineElement = lineRefInstance;
    } else if (lineRefInstance && '$el' in lineRefInstance && lineRefInstance.$el instanceof HTMLElement) {
      // If it's a component instance, access its root DOM element
      activeLineElement = lineRefInstance.$el;
    }

    if (activeLineElement) {
      const viewer = viewerRef.value;

      // Calculate the desired scroll position
      const desiredScrollTop = activeLineElement.offsetTop - scrollOffsetPx.value;

      viewer.scrollTo({
        top: desiredScrollTop,
        behavior: 'smooth'
      });
    }
  }
}, { immediate: true });
</script>

<template>
  <div class="document-viewer" ref="viewerRef" tabindex="0">
    <div class="document-content">
      <component
        v-for="(line, index) in lines"
        :key="line.id"
        :ref="(el) => setLineRef(el, index)"
        :is="getLineComponent(line.lineType)"
        :line="line"
        :is-active="line.id === currentLineId"
        @click="handleLineClick(line.id)"
      />
    </div>
  </div>
</template>

<style scoped>
@import '../css/DocumentViewer.css';
</style>