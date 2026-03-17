<script setup lang="ts">
import { inject } from 'vue'
import type { ActionController } from '@/core/ActionController'
import type { ScriptLineBase } from '@/types/core'
import { Zap } from 'lucide-vue-next'

const props = defineProps<{
  widgetId: string;
  line: ScriptLineBase;
  icon?: string;
  label?: string;
  title?: string;
  action?: any;
  className?: string;
}>()

const actionController = inject('actionController') as ActionController

const handleClick = (e: MouseEvent) => {
  e.stopPropagation()
  
  // Blur the button so that subsequent Space presses go to the global keybinding handler
  if (e.currentTarget instanceof HTMLElement) {
    e.currentTarget.blur()
  }

  if (props.action) {
    actionController.dispatch(props.action)
  }
}
</script>

<template>
  <button 
    class="widget-button" 
    :class="className" 
    @click="handleClick" 
    :title="title || label"
  >
    <span v-if="icon" class="icon">
      <Zap v-if="icon === 'Zap'" :size="14" fill="currentColor" />
      <template v-else>{{ icon }}</template>
    </span>
    <span v-if="label" class="label">{{ label }}</span>
  </button>
</template>

<style scoped>
@import '../../css/Widgets.css';
</style>
