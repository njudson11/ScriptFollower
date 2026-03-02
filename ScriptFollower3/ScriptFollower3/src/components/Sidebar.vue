<script setup lang="ts">
import { computed, inject, type Component, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import type { AppStore } from '@/store/AppStore'
import { LineType } from '@/types/core'
import LineTypeFilter from './LineTypeFilter.vue'
import type { FeatureManager } from '@/core/FeatureManager'
import DefaultLineComponent from './DefaultLineComponent.vue'
import type { SidebarProgressBarFeature } from '@/features/SidebarProgressBarFeature'
import { useStickyScroll } from '@/composables/useStickyScroll'
import { AppConfig } from '@/config/AppConfig'
import type { ActionController } from '@/core/ActionController'
import { ACTION_TYPES } from '@/types/actions'

const appStore = inject('appStore') as AppStore
const featureManager = inject('featureManager') as FeatureManager
const actionController = inject('actionController') as ActionController
const sidebarProgressBarFeature = featureManager.getFeature('sidebar-progress-bar-feature') as SidebarProgressBarFeature

// The active line ID for the sidebar is managed by the SidebarProgressBarFeature
// which calculates the nearest visible line if the current selection is hidden.
const activeSidebarLineId = sidebarProgressBarFeature.activeSidebarLineId;

const visibleLines = computed(() => {
  const allLines = appStore.getLines();
  const lineTypeVisibility = appStore.state.lineTypeVisibility;
  return allLines.filter(line => lineTypeVisibility[line.lineType]);
});

const getLineComponent = (lineType: LineType): Component => {
  return featureManager.getLineRenderer(lineType, 'sidebar') || DefaultLineComponent
}

const sidebarContentRef = ref<HTMLElement | null>(null);
const scrollOffsetPx = ref(AppConfig.viewers.sidebar.scrollOffsetPx);

const { setLineRef } = useStickyScroll({
  viewerRef: sidebarContentRef,
  currentLineId: activeSidebarLineId,
  scrollOffsetPx
});

const handleLineClick = (lineId: string) => {
  actionController.dispatch({ type: ACTION_TYPES.SELECT_LINE, payload: { lineId } });
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2>Script Lines</h2>
      <span class="line-count">{{ visibleLines.length }}</span>
    </div>

    <LineTypeFilter></LineTypeFilter>

    <div class="sidebar-content" ref="sidebarContentRef">
      <div v-for="line in visibleLines" :key="line.id" class="sidebar-line-wrapper">
        <!-- Progress bar integration via feature -->
        <div v-if="line.id === activeSidebarLineId && sidebarProgressBarFeature.progressPercentage.value > 0" class="sidebar-active-line-progress">
          <div class="sidebar-active-line-progress-bar" :style="{ width: sidebarProgressBarFeature.progressPercentage.value + '%' }"></div>
        </div>
        <component
          :is="getLineComponent(line.lineType)"
          :line="line"
          :ref="(el) => setLineRef(line.id, el)"
          :is-active="line.id === activeSidebarLineId"
          @click="handleLineClick(line.id)"
          context-class="context-sidebar"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/Sidebar.css';
</style>
