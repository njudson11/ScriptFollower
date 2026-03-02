<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, inject } from 'vue'
import type { ScriptLineBase } from '@/types/core'
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
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

const primaryHighlight = computed(() => selectionManager.getPrimaryHighlight(props.line.id))

const lineClasses = computed(() => {
  const classes: string[] = ['script-line'];
  if (props.isActive) {
    classes.push('active');
  }
  if (props.contextClass) {
    classes.push(props.contextClass);
  }
  if (appStore.isLineSearchMatch(props.line.id)) {
    classes.push('search-match');
  }
  if (primaryHighlight.value) {
    classes.push(`highlight-${primaryHighlight.value.type.replace(':', '-')}`);
  }
  // Add generic classes from AppStore (e.g., line-type-SOUND-CUE)
  classes.push(...appStore.getLineClasses(props.line));
  return classes;
});

const highlightStyle = computed(() => {
  if (!primaryHighlight.value) return {};
  const style = selectionManager.getHighlightStyle(primaryHighlight.value.type);
  if (!style) return {};

  const result: any = {
    backgroundColor: style.backgroundColor,
    color: style.color,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    opacity: style.opacity
  };

  // Dynamically adjust opacity based on confidence score if available
  if (primaryHighlight.value.type === 'voice:matched' && primaryHighlight.value.data?.score) {
    const score = primaryHighlight.value.data.score;
    result.backgroundColor = `rgba(76, 175, 80, ${Math.min(0.6, 0.1 + (score * 0.2))})`;
  }

  return result;
});
</script>

<template>
  <div :class="lineClasses" :style="highlightStyle">
    <div class="line-type-badge">
      {{ line.lineType }}
    </div>
    <div class="line-content">
      <p class="line-text">{{ line.text }}</p>
      <div class="line-meta">Line {{ line.lineNumber }}</div>
    </div>
    <LineAnnotation v-if="line.annotation" :annotation="line.annotation" />
  </div>
</template>

<style scoped>
@import '../css/DefaultLineComponent.css';
@import '../css/Search.css';
</style>
