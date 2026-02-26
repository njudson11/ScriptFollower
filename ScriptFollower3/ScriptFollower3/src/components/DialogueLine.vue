<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, inject } from 'vue'
import type { ScriptLineBase } from '@/types/core'
import type { AppStore } from '@/store/AppStore'
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

const characterName = computed(() => props.line.metadata.characterName || '')
const dialogue = computed(() => props.line.metadata.dialogue || props.line.text)

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
  // Add specific classes based on LineType for styling using appStore
  classes.push(...appStore.getLineClasses(props.line));

  return classes;
});
</script>

<template>
  <div :class="lineClasses">
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
