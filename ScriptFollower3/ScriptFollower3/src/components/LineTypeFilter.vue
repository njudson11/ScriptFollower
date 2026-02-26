<script setup lang="ts">
import { inject, computed } from 'vue'
import { AppStore } from '@/store/AppStore'
import { LineType } from '@/types/core'
import { AppConfig } from '@/config/AppConfig'

const appStore = inject('appStore') as AppStore

const allLineTypes = Object.values(LineType).sort()

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
        <label :for="`filter-${lineType}`">{{ AppConfig.lineTypes[lineType].label }}</label>
      </div>
    </div>
  </details>
</template>

<style scoped>
@import '../css/LineTypeFilter.css';
</style>
