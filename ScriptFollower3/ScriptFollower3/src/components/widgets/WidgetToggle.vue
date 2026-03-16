<script setup lang="ts">
import { inject } from 'vue'
import type { ActionController } from '@/core/ActionController'
import type { ScriptLineBase } from '@/types/core'
import { Zap, ZapOff, Play, Square, Loader2 } from 'lucide-vue-next'

const props = defineProps<{
  widgetId: string;
  line: ScriptLineBase;
  active: boolean;
  activeIcon?: string;
  inactiveIcon?: string;
  activeLabel?: string;
  inactiveLabel?: string;
  activeTitle?: string;
  inactiveTitle?: string;
  action?: any;
  className?: string;
}>()

const actionController = inject('actionController') as ActionController

const handleToggle = (e: MouseEvent) => {
  e.stopPropagation()
  if (props.action) {
    actionController.dispatch(props.action)
  }
}

const getIcon = (iconName?: string) => {
  if (iconName === 'Zap') return Zap
  if (iconName === 'ZapOff') return ZapOff
  if (iconName === 'Play') return Play
  if (iconName === 'Square') return Square
  if (iconName === 'Loader') return Loader2
  return null
}
</script>

<template>
  <button 
    class="widget-toggle" 
    :class="[className, { active: active }]" 
    @click="handleToggle" 
    :title="active ? (activeTitle || activeLabel) : (inactiveTitle || inactiveLabel)"
  >
    <span v-if="activeIcon || inactiveIcon" class="icon">
      <component 
        v-if="getIcon(active ? activeIcon : inactiveIcon)" 
        :is="getIcon(active ? activeIcon : inactiveIcon)" 
        :size="14"
        :fill="(active ? activeIcon : inactiveIcon) === 'Loader' ? 'none' : 'currentColor'"
        :class="{ 'animate-spin': (active ? activeIcon : inactiveIcon) === 'Loader' }"
      />
      <template v-else>{{ active ? activeIcon : inactiveIcon }}</template>
    </span>
    <span v-if="activeLabel || inactiveLabel" class="label">
      {{ active ? activeLabel : inactiveLabel }}
    </span>
  </button>
</template>

<style scoped>
@import '../../css/Widgets.css';
</style>
