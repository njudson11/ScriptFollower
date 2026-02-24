<script setup lang="ts">
import { computed, inject, type Component, ref } from 'vue' // Add ref
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import { LineType } from '@/types/core'
import LineTypeFilter from './LineTypeFilter.vue' // Import the new component
import type { FeatureManager } from '@/core/FeatureManager'
import DefaultLineComponent from './DefaultLineComponent.vue' // Import DefaultLineComponent
import type { SidebarProgressBarFeature } from '@/features/SidebarProgressBarFeature' // Import SidebarProgressBarFeature
import { useStickyScroll } from '@/composables/useStickyScroll' // Import useStickyScroll
import { AppConfig } from '@/config/AppConfig' // Import AppConfig

const appStore = inject('appStore') as AppStore
const selectionManager = inject('selectionManager') as LineSelectionManager
const featureManager = inject('featureManager') as FeatureManager
const sidebarProgressBarFeature = featureManager.getFeature('sidebar-progress-bar-feature') as SidebarProgressBarFeature

// Modify 'lines' computed property to filter based on visibility
const visibleLines = computed(() => {
  const allLines = appStore.getLines();
  const lineTypeVisibility = appStore.state.lineTypeVisibility;
  return allLines.filter(line => lineTypeVisibility[line.lineType]);
});

const getLineComponent = (lineType: LineType): Component => {
  return featureManager.getLineRenderer(lineType, 'sidebar') || DefaultLineComponent
}

const sidebarContentRef = ref<HTMLElement | null>(null); // Ref for sidebar content div
const scrollOffsetPx = ref(AppConfig.viewers.sidebar.scrollOffsetPx); // Get offset from AppConfig

const { setLineRef } = useStickyScroll({
  viewerRef: sidebarContentRef,
  lines: visibleLines, // Use visibleLines for scrolling in sidebar
  currentLineId: sidebarProgressBarFeature.activeSidebarLineId,
  scrollOffsetPx
});

const handleLineClick = (lineId: string) => {
  selectionManager.selectLine(lineId)
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2>Script Lines</h2>
      <span class="line-count">{{ visibleLines.length }}</span>
    </div>

    <LineTypeFilter></LineTypeFilter> <!-- Moved here outside sidebar-content -->

    <div class="sidebar-content" ref="sidebarContentRef">
      <template v-for="line in visibleLines" :key="line.id">
        <div v-if="line.id === sidebarProgressBarFeature.activeSidebarLineId.value && sidebarProgressBarFeature.progressPercentage.value > 0" class="sidebar-progress-bar-container">
          <div class="sidebar-progress-bar" :style="{ width: sidebarProgressBarFeature.progressPercentage.value + '%' }"></div>
        </div>
        <component
          :is="getLineComponent(line.lineType)"
          :line="line"
          :ref="(el) => setLineRef(line.id, el)"
          :is-active="line.id === sidebarProgressBarFeature.activeSidebarLineId.value"
          @click="handleLineClick(line.id)"
          context-class="context-sidebar"
        />
      </template>
    </div>
  </div>
</template>


<style scoped>
@import '../css/Sidebar.css';
</style>