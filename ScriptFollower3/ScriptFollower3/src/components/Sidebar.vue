<script setup lang="ts">
import { computed, inject, type Component, ref, watch } from 'vue'
import type { AppStore } from '@/store/AppStore'
import type { EventBus } from '@/core/EventBus'
import { LineType } from '@/types/core'
import LineTypeFilter from './LineTypeFilter.vue'
import type { FeatureManager } from '@/core/FeatureManager'
import DefaultLineComponent from './DefaultLineComponent.vue'
import type { SidebarProgressBarFeature } from '@/features/SidebarProgressBarFeature'
import { useVirtualScroll } from '@/composables/useVirtualScroll'
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

const { 
  visibleItems, 
  totalHeight, 
  offsetY, 
  setItemRef, 
  scrollToItem 
} = useVirtualScroll({
  containerRef: sidebarContentRef,
  items: visibleLines,
  estimatedItemHeight: 40, // Sidebar items are typically shorter
  buffer: 15
});

// Synchronize sidebar selection with scroll
watch(activeSidebarLineId, (newId) => {
  if (newId) {
    scrollToItem(newId, scrollOffsetPx.value);
  }
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
      <div :style="{ height: totalHeight + 'px', position: 'relative' }">
        <div :style="{ transform: `translateY(${offsetY}px)` }">
          <template v-for="line in visibleItems" :key="line.id">
            <!-- Progress bar integration via feature -->
            <div v-if="line.id === sidebarProgressBarFeature.activeSidebarLineId.value && sidebarProgressBarFeature.progressPercentage.value > 0" class="sidebar-progress-bar-container">
              <div class="sidebar-progress-bar" :style="{ width: sidebarProgressBarFeature.progressPercentage.value + '%' }"></div>
            </div>
            <component
              :is="getLineComponent(line.lineType)"
              :line="line"
              :ref="(el) => setItemRef(line.id, el)"
              :is-active="line.id === activeSidebarLineId"
              @click="handleLineClick(line.id)"
              context-class="context-sidebar"
            />
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/Sidebar.css';
</style>
