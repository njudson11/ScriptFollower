<script setup lang="ts">
import { computed, defineProps } from 'vue'
import type { Document, StyleInfo } from '@/types/core'
import StyleTreeItem from './StyleTreeItem.vue' // Import StyleTreeItem

interface DocumentInfoPanelProps {
  currentDocument: Document | null
}

const props = defineProps<DocumentInfoPanelProps>()

// Computed property to build the style tree
const styleTree = computed(() => {
  const styles = props.currentDocument?.styles || [];
  if (styles.length === 0) return [];

  const styleMap = new Map<string, StyleInfo & { children: (StyleInfo & { children: StyleInfo[] })[] }>();
  
  // Initialize map with all styles and an empty children array
  styles.forEach(s => {
    styleMap.set(s.name, { ...s, children: [] });
  });

  const rootStyles: (StyleInfo & { children: StyleInfo[] })[] = [];

  // Populate children arrays and identify root styles
  styleMap.forEach(s => {
    if (s.parent && styleMap.has(s.parent)) {
      styleMap.get(s.parent)!.children.push(s);
    } else {
      rootStyles.push(s);
    }
  });

  return rootStyles;
});
</script>

<template>
  <div v-if="currentDocument" class="panel-content document-info-panel">
    <div class="info-section">
      <label>Name:</label>
      <p>{{ currentDocument.name }}</p>
    </div>

    <div class="info-section">
      <label>Format:</label>
      <p>{{ currentDocument.format }}</p>
    </div>

    <div class="info-section">
      <label>Total Lines:</label>
      <p>{{ currentDocument.lines.length }}</p>
    </div>

    <div class="info-section">
      <label>Created:</label>
      <p>{{ currentDocument.createdAt.toLocaleDateString() }}</p>
    </div>

    <div class="divider"></div>

    <div class="stats">
      <h4>Statistics</h4>
      <div class="stat-item">
        <span>Average line length:</span>
        <span>{{ Math.round(
          currentDocument.lines.reduce((sum, line) => sum + line.text.length, 0) /
          currentDocument.lines.length
        ) }} chars</span>
      </div>
    </div>

    <div v-if="currentDocument.styles && currentDocument.styles.length > 0" class="divider"></div>

    <div v-if="currentDocument.styles && currentDocument.styles.length > 0" class="styles-section">
      <h4>Document Styles</h4>
      <div class="style-list">
        <StyleTreeItem v-for="style in styleTree" :key="style.name" :style-info="style" :level="0" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/DocumentInfoPanel.css';
</style>
