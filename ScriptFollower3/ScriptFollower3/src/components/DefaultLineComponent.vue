<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, inject } from 'vue'
import type { ScriptLineBase } from '@/types/core'
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import type { ActionController } from '@/core/ActionController'
import type { FeatureManager } from '@/core/FeatureManager'
import { ACTION_TYPES } from '@/types/actions'
import LineAnnotation from './LineAnnotation.vue'
import LineWidgetContainer from './widgets/LineWidgetContainer.vue'
import { Zap } from 'lucide-vue-next'

const props = defineProps({
  line: {
    type: Object as PropType<ScriptLineBase>,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  contextClass: {
    type: String,
    default: ''
  }
})

const appStore = inject('appStore') as AppStore
const selectionManager = inject('selectionManager') as LineSelectionManager
const actionController = inject('actionController') as ActionController
const featureManager = inject('featureManager') as FeatureManager

const hasAction = computed(() => {
  const baseFeature = featureManager.getFeature('base-cue-feature') as any;
  return baseFeature?.hasAction(props.line.id) || false;
});

const handleTrigger = (e: MouseEvent) => {
  e.stopPropagation();

  // Blur the button so that subsequent Space presses go to the global keybinding handler
  if (e.currentTarget instanceof HTMLElement) {
    e.currentTarget.blur()
  }

  actionController.dispatch({
    type: ACTION_TYPES.TRIGGER_LINE_ACTION,
    payload: { lineId: props.line.id }
  });
};

const lineClasses = computed(() => {
  const classes: string[] = ['script-line'];
  if (props.isActive) {
    classes.push('active');
  }
  if (props.contextClass) {
    classes.push(props.contextClass);
  }
  classes.push(...appStore.getLineClasses(props.line));
  return classes;
})

const isSearchMatch = computed(() => appStore.isLineSearchMatch(props.line.id))

const widgetView = computed(() => props.contextClass.includes('sidebar') ? 'sidebar' : 'main')
</script>

<template>
  <div :class="lineClasses" :data-line-id="line.id">
    <div class="line-content">
      <div class="line-text" :class="{ 'search-match': isSearchMatch }">
        {{ line.text }}
      </div>
    </div>
    
    <!-- Action row below content -->
    <div class="line-actions">
      <!-- Widgets from features -->
      <LineWidgetContainer :line="line" :view="widgetView" />
      
      <!-- Fallback Trigger if no widgets but has action -->
      <button 
        v-if="hasAction && !featureManager.hasWidgets(line, widgetView)" 
        class="btn-trigger" 
        @click="handleTrigger" 
        title="Trigger Action (Space)"
      >
        <span class="icon"><Zap :size="14" /></span>
        <span class="label">Trigger</span>
      </button>
    </div>

    <LineAnnotation v-if="line.annotation" :annotation="line.annotation" />
  </div>
</template>

<style scoped>
@import '../css/DefaultLineComponent.css';
@import '../css/Search.css';

.line-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
</style>
