<script setup lang="ts">
import { computed, inject } from 'vue'
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import { LineType } from '@/types/core'

const appStore = inject('appStore') as AppStore
const selectionManager = inject('selectionManager') as LineSelectionManager

const lines = computed(() => appStore.getLines())
const currentLineId = computed(() => selectionManager.getCurrentLine())

const getLineTypeLabel = (lineType: LineType): string => {
  const labels: Record<LineType, string> = {
    [LineType.TITLE]: 'TITLE',
    [LineType.SUBTITLE]: 'SUBTITLE',
    [LineType.ACT_HEADING]: 'ACT',
    [LineType.SCENE_HEADING]: 'SCENE',
    [LineType.CHARACTER_LIST]: 'CHAR LIST',
    [LineType.DIALOGUE]: 'DIALOGUE',
    [LineType.STAGE_DIRECTION]: 'ACTION',
    [LineType.TECH_CUE]: 'TECH',
    [LineType.SOUND_CUE]: 'SOUND',
    [LineType.LIGHT_CUE]: 'LIGHT',
    [LineType.BLANK]: 'BLANK'
  }
  return labels[lineType]
}

const handleLineClick = (lineId: string) => {
  selectionManager.selectLine(lineId)
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2>Script Lines</h2>
      <span class="line-count">{{ lines.length }}</span>
    </div>

    <div class="sidebar-content">
      <div
        v-for="line in lines"
        :key="line.id"
        class="line-item"
        :class="{ active: line.id === currentLineId }"
        @click="handleLineClick(line.id)"
      >
        <span class="line-type">{{ getLineTypeLabel(line.lineType) }}</span>
        <span class="line-text">{{ line.text.substring(0, 60) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/Sidebar.css';
</style>