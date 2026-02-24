<script setup lang="ts">
import { inject, computed } from 'vue'
import { AppStore } from '@/store/AppStore'
import { LineType } from '@/types/core'

const appStore = inject('appStore') as AppStore

const allLineTypes = Object.values(LineType).sort()

const getLineTypeLabel = (lineType: LineType): string => {
  const labels: Record<LineType, string> = {
    [LineType.TITLE]: 'Title',
    [LineType.SUBTITLE]: 'Subtitle',
    [LineType.ACT_HEADING]: 'Act Heading',
    [LineType.SCENE_HEADING]: 'Scene Heading',
    [LineType.CHARACTER_LIST]: 'Character List',
    [LineType.DIALOGUE]: 'Dialogue',
    [LineType.STAGE_DIRECTION]: 'Stage Direction',
    [LineType.TECH_CUE]: 'Tech Cue',
    [LineType.SOUND_CUE]: 'Sound Cue',
    [LineType.LIGHT_CUE]: 'Light Cue',
    [LineType.PAGE_NUMBER]: 'Page Number',
    [LineType.BLANK]: 'Blank'
  }
  return labels[lineType] || lineType;
}

const toggleLineTypeVisibility = (lineType: LineType) => {
  appStore.setLineTypeVisibility(lineType, !appStore.state.lineTypeVisibility[lineType])
}
</script>

<template>
  <details class="line-type-filter-container">
    <summary class="filter-summary">Filter Line Types</summary>
    <div class="filter-options">
      <div v-for="lineType in allLineTypes" :key="lineType" class="filter-option">
        <input
          type="checkbox"
          :id="`filter-${lineType}`"
          :checked="appStore.state.lineTypeVisibility[lineType]"
          @change="toggleLineTypeVisibility(lineType)"
        />
        <label :for="`filter-${lineType}`">{{ getLineTypeLabel(lineType) }}</label>
      </div>
    </div>
  </details>
</template>

<style scoped>
@import '../css/LineTypeFilter.css';
</style>
