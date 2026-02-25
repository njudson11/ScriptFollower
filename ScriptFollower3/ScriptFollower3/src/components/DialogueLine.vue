<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, inject } from 'vue'
import type { ScriptLineBase } from '@/types/core'
import type { AppStore } from '@/store/AppStore'

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

const copyAnnotation = (text: string) => {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy annotation: ', err);
  });
}

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
      <div v-if="line.annotation" class="line-annotation" :class="{'line-annotation-no-char': !characterName}">
        <span class="annotation-label">Annotation:</span>
        <span class="annotation-text">{{ line.annotation }}</span>
        <button class="copy-btn" title="Copy Annotation" @click.stop="copyAnnotation(line.annotation)">
          <span class="copy-icon">📋</span>
        </button>
      </div>
      <div class="line-meta">Line {{ line.lineNumber }}</div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/DialogueLine.css';
@import '../css/DefaultLineComponent.css';
</style>
