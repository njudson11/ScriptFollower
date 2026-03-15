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
</script>

<template>
  <div :class="lineClasses" :data-line-id="line.id">
    <div class="line-content">
      <div class="line-text" :class="{ 'search-match': isSearchMatch }">
        {{ line.text }}
      </div>
    </div>
    
    <!-- Action row below content -->
    <div class="line-actions" v-if="hasAction">
      <button class="btn-trigger" @click="handleTrigger" title="Trigger Action (Space)">
        <span class="icon">⚡</span>
        <span class="label">Trigger</span>
      </button>
    </div>

    <LineAnnotation v-if="line.annotation" :annotation="line.annotation" />
  </div>
</template>

<style scoped>
@import '../css/DefaultLineComponent.css';
@import '../css/Search.css';
</style>
