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

const characterName = computed(() => props.line.metadata.characterName || '')
const dialogue = computed(() => props.line.metadata.dialogue || props.line.text)

const primaryHighlight = computed(() => selectionManager.getPrimaryHighlight(props.line.id))

const lineClasses = computed(() => {
  const classes: string[] = ['script-line', 'dialogue-line'];
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
  // Add specific classes based on LineType for styling using appStore
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
    // Map score (typically 0.3 to 2.0+) to a reasonable opacity range
    // We'll use 0.1 as base and add more based on score
    const score = primaryHighlight.value.data.score;
    result.backgroundColor = `rgba(76, 175, 80, ${Math.min(0.6, 0.1 + (score * 0.2))})`;
  }

  return result;
});

const characterStyle = computed(() => {
  // Only apply background color in document-viewer context
  if (props.contextClass !== 'context-document-viewer') return {};

  const colour = appStore.getCharacterColour(props.line.lineSubType);
  const baseStyle: any = {};

  if (colour && colour !== '#ffffff') {
    baseStyle.backgroundColor = colour;
  }
  // Merge with highlight style (highlight takes precedence for background)
  return { ...baseStyle, ...highlightStyle.value };
});
</script>

<template>
  <div :class="lineClasses" :style="characterStyle">
    <div class="line-type-badge">
      {{ line.lineType }}
    </div>
    <div class="line-content">
      <p v-if="characterName" class="character-name">{{ characterName }}</p>
      <p class="dialogue-text" :class="{'dialogue-text-no-char': !characterName}">{{ dialogue }}</p>
      <div class="line-meta">Line {{ line.lineNumber }}</div>
    </div>
    <LineAnnotation v-if="line.annotation" :annotation="line.annotation" />
  </div>
</template>

<style scoped>
@import '../css/DialogueLine.css';
@import '../css/DefaultLineComponent.css';
@import '../css/Search.css';
</style>
