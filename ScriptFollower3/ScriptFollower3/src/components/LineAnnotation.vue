<script setup lang="ts">

const props = defineProps({
  annotation: {
    type: String,
    required: true
  }
})

const copyAnnotation = (text: string) => {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy annotation: ', err);
  });
}
</script>

<template>
  <div class="line-annotation">
    <button class="copy-btn" title="Copy Annotation" @click.stop="copyAnnotation(props.annotation)">
      <span class="copy-icon">📋</span>
    </button>
    <span class="annotation-label">Annotation:</span>
    <span class="annotation-text">{{ props.annotation }}</span>
  </div>
</template>

<style scoped>
@import '../css/LineAnnotation.css';
</style>
