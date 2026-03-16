<script setup lang="ts">
import { computed, inject, ref, onMounted, onBeforeUnmount } from 'vue'
import type { ScriptLineBase, LineWidget } from '@/types/core'
import type { FeatureManager } from '@/core/FeatureManager'
import { AppConfig } from '@/config/AppConfig'
import WidgetButton from './WidgetButton.vue'
import WidgetToggle from './WidgetToggle.vue'
import WidgetTimer from './WidgetTimer.vue'
import WidgetProgress from './WidgetProgress.vue'

const props = defineProps({
  line: {
    type: Object as () => ScriptLineBase,
    required: true
  },
  view: {
    type: String as () => 'main' | 'sidebar',
    default: 'main'
  }
})

const featureManager = inject('featureManager') as FeatureManager

const refreshCounter = ref(0)
let timer: number | null = null

onMounted(() => {
  // Use a slightly faster interval for UI responsiveness if needed, 
  // but AppConfig.audio.refreshIntervalMs (100ms) is standard.
  timer = window.setInterval(() => {
    refreshCounter.value++
  }, AppConfig.audio.refreshIntervalMs)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const widgets = computed(() => {
  // Dependency on refreshCounter to force re-evaluation of widget state (e.g. timers, playback state)
  refreshCounter.value
  
  const allWidgets: LineWidget[] = []
  const features = featureManager.getAllFeatures()
  
  for (const feature of features) {
    if (feature.getLineWidgets) {
      const featureWidgets = feature.getLineWidgets(props.line, props.view)
      if (featureWidgets && featureWidgets.length > 0) {
        allWidgets.push(...featureWidgets)
      }
    }
  }
  
  return allWidgets
})

const getWidgetComponent = (type: string) => {
  switch (type) {
    case 'button': return WidgetButton
    case 'toggle': return WidgetToggle
    case 'timer': return WidgetTimer
    case 'progress': return WidgetProgress
    default: return null
  }
}
</script>

<template>
  <div v-if="widgets.length > 0" class="line-widget-container" :class="`view-${view}`">
    <component
      v-for="widget in widgets"
      :key="widget.id"
      :is="getWidgetComponent(widget.type)"
      v-bind="widget.props"
      :widget-id="widget.id"
      :line="line"
    />
  </div>
</template>

<style scoped>
@import '../../css/Widgets.css';
</style>
