<script setup lang="ts">
import { computed, ref, inject } from 'vue'
import { type Document, type StyleInfo, LineType } from '@/types/core'
import StyleTreeItem from './StyleTreeItem.vue' // Import StyleTreeItem
import { AppConfig } from '@/config/AppConfig'
import type { AppStore } from '@/store/AppStore'
import { ChevronDown } from 'lucide-vue-next'

interface DocumentInfoPanelProps {
  currentDocument: Document | null
}

const props = defineProps<DocumentInfoPanelProps>()
const appStore = inject('appStore') as AppStore

const isStylesCollapsed = ref(AppConfig.ui.documentInfo.defaultStylesCollapsed)

const toggleStyles = () => {
  isStylesCollapsed.value = !isStylesCollapsed.value
}

// Computed property to extract unique dialogue sub-types (Characters)
const dialogueSubTypes = computed(() => {
  if (!props.currentDocument) return [];
  const subTypes = new Set<string>();
  props.currentDocument.lines.forEach(line => {
    if (line.lineType === LineType.DIALOGUE && line.lineSubType) {
      subTypes.add(line.lineSubType);
    }
  });
  return Array.from(subTypes).sort();
});

const getCharacterColor = (character: string) => {
  return appStore.state.characterColors[character] || '#ffffff';
}

const updateCharacterColor = (character: string, event: Event) => {
  const color = (event.target as HTMLInputElement).value;
  appStore.setCharacterColor(character, color);
}

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
    <div v-if="dialogueSubTypes.length > 0" class="info-section characters-section">
      <label>Characters & Colors:</label>
      <div class="character-list">
        <div v-for="type in dialogueSubTypes" :key="type" class="character-item">
          <input 
            type="color" 
            :value="getCharacterColor(type)" 
            @input="updateCharacterColor(type, $event)"
            class="color-picker"
          />
          <span class="character-name">{{ type }}</span>
        </div>
      </div>
    </div>
    <div v-if="dialogueSubTypes.length > 0" class="divider"></div>

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

    <div v-if="currentDocument.styles && currentDocument.styles.length > 0" class="styles-section">
      <div class="section-header" @click="toggleStyles">
        <h4>Document Styles</h4>
        <ChevronDown :size="16" class="collapse-icon" :class="{ 'collapsed': isStylesCollapsed }" />
      </div>
      <div v-show="!isStylesCollapsed" class="style-list">
        <StyleTreeItem v-for="style in styleTree" :key="style.name" :style-info="style" :level="0" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/DocumentInfoPanel.css';

.character-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.character-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker {
  border: none;
  padding: 0;
  width: 24px;
  min-width: 24px;
  height: 24px;
  cursor: pointer;
  background: none;
  border-radius: 4px;
  overflow: hidden;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.character-name {
  font-size: 0.9em;
  color: var(--color-text-primary);
}
</style>
