<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  widgetId: string;
  value: number;
  total?: number;
  label?: string;
  className?: string;
}>()

const percent = computed(() => {
  if (props.total !== undefined) {
    if (props.total === 0) return 0
    return Math.min(100, (props.value / props.total) * 100)
  }
  return Math.min(100, Math.max(0, props.value))
})
</script>

<template>
  <div class="widget-progress" :class="className">
    <div class="progress-bar-inner" :style="{ width: `${percent}%` }"></div>
    <div v-if="label" class="progress-label">{{ label }}</div>
  </div>
</template>

<style scoped>
@import '../../css/Widgets.css';
</style>
