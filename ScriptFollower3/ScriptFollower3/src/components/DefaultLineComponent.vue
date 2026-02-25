<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, inject } from 'vue'
import type { ScriptLineBase } from '@/types/core'
import type { AppStore } from '@/store/AppStore'
import { LineType } from '@/types/core' // Import LineType

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

const lineClasses = computed(() => {
  const classes: string[] = ['script-line'];
  if (props.isActive) {
    classes.push('active');
  }
  if (props.contextClass) {
    classes.push(props.contextClass);
  }
  // Add generic classes from AppStore (e.g., line-type-SOUND-CUE)
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
      <p class="line-text">{{ line.text }}</p>
      <div class="line-meta">Line {{ line.lineNumber }}</div>
      <div v-if="line.annotation" class="line-annotation">
        <span class="annotation-label">Annotation:</span>
        <span class="annotation-text">{{ line.annotation }}</span>
        <button class="copy-btn" title="Copy Annotation" @click.stop="copyAnnotation(line.annotation)">
          <span class="copy-icon">📋</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/DefaultLineComponent.css';
</style>
