<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  widgetId: string;
  currentTime: number;
  duration: number;
  remaining?: boolean;
}>()

const formattedTime = computed(() => {
  const time = props.remaining ? (props.duration - props.currentTime) : props.currentTime
  const absoluteTime = Math.abs(time)
  const minutes = Math.floor(absoluteTime / 60)
  const seconds = Math.floor(absoluteTime % 60)
  const sign = time < 0 ? '-' : ''
  return `${sign}${minutes}:${seconds.toString().padStart(2, '0')}`
})
</script>

<template>
  <div class="widget-timer" :title="remaining ? 'Time Remaining' : 'Time Elapsed'">
    {{ formattedTime }}
  </div>
</template>

<style scoped>
@import '../../css/Widgets.css';
</style>
