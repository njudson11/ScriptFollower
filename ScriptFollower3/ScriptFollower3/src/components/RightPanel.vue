<script setup lang="ts">
import { computed, inject, ref, onMounted, onBeforeUnmount } from 'vue'
import type { AppStore } from '@/store/AppStore'
import type { LineSelectionManager } from '@/core/LineSelectionManager'
import type { EventBus } from '@/core/EventBus'
import { EVENT_TYPES } from '@/core/EventBus'
import type { ScriptLineBase } from '@/types/core'

const appStore = inject('appStore') as AppStore
const selectionManager = inject('selectionManager') as LineSelectionManager
const eventBus = inject('eventBus') as EventBus

const currentDocument = computed(() => appStore.getCurrentDocument())
const currentLineId = ref<string | null>(selectionManager.getCurrentLine())
const currentLine = computed((): ScriptLineBase | undefined => {
  if (!currentLineId.value) return undefined
  return appStore.getLineById(currentLineId.value)
})

const updateCurrentLine = () => {
  currentLineId.value = selectionManager.getCurrentLine()
}

const clearSelection = () => {
  selectionManager.selectLine(null)
}

// XML pretty-printing functionality
const showFullXml = ref(false)

const prettyPrintXml = (xmlString: string): string => {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml')
    const serializer = new XMLSerializer()
    return serializer.serializeToString(xmlDoc)
      .replace(/></g, '>\n<')
      .split('\n')
      .map((line, index) => '  '.repeat(Math.max(0, line.split('<').length - line.split('>').length)) + line)
      .join('\n')
  } catch (error) {
    return xmlString // Return original if parsing fails
  }
}

const toggleFullXml = () => {
  showFullXml.value = !showFullXml.value
}

onMounted(() => {
  const unsubscribe = eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, updateCurrentLine)
  onBeforeUnmount(() => {
    unsubscribe()
  })
})
</script>

<template>
  <div class="right-panel">
    <div class="panel-header">
      <h3>Document Info</h3>
    </div>

    <div v-if="currentDocument" class="panel-content">
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
          <div v-for="style in currentDocument.styles" :key="style.name" class="style-item">
            <span class="style-name">{{ style.displayName || style.name }}</span>
            <span v-if="style.parent" class="style-parent">(parent: {{ style.parent }})</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentLine" class="divider"></div>

    <div v-if="currentLine" class="panel-header">
      <h3>Line Data</h3>
      <button @click="clearSelection" class="clear-button" title="Clear selection">×</button>
    </div>

    <div v-if="currentLine" class="panel-content">
      <div class="info-section">
        <label>ID:</label>
        <p>{{ currentLine.id }}</p>
      </div>

      <div class="info-section">
        <label>Document ID:</label>
        <p>{{ currentLine.documentId }}</p>
      </div>

      <div class="info-section">
        <label>Line Number:</label>
        <p>{{ currentLine.lineNumber }}</p>
      </div>

      <div class="info-section">
        <label>Line Type:</label>
        <p>{{ currentLine.lineType }}</p>
      </div>

      <div v-if="currentLine.lineSubType" class="info-section">
        <label>Line SubType:</label>
        <p>{{ currentLine.lineSubType }}</p>
      </div>

      <div class="info-section">
        <label>Text:</label>
        <p class="text-content">{{ currentLine.text }}</p>
      </div>

      <div v-if="currentLine.annotation" class="info-section">
        <label>Annotation:</label>
        <p class="text-content">{{ currentLine.annotation }}</p>
      </div>

      <div class="info-section">
        <label>Metadata:</label>
        <div class="metadata-list">
          <div v-for="(value, key) in currentLine.metadata" :key="key" class="metadata-item">
            <span class="metadata-key">{{ key }}:</span>
            <div v-if="typeof value === 'string' && value.includes('<') && value.includes('>')" class="xml-content">
              <div v-if="!showFullXml" class="truncated-xml">
                <pre>{{ value.substring(0, 100) + '...' }}</pre>
                <button @click="toggleFullXml" class="show-full-button">Show Full XML</button>
              </div>
              <div v-else class="full-xml">
                <pre>{{ prettyPrintXml(value) }}</pre>
                <button @click="toggleFullXml" class="show-full-button">Hide Full XML</button>
              </div>
            </div>
            <span v-else class="metadata-value">{{ typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/RightPanel.css';
</style>