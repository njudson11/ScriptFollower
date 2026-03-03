<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ScriptLineBase } from '@/types/core'
import { Copy, Check } from 'lucide-vue-next'

interface LineDataPanelProps {
  currentLine: ScriptLineBase | undefined
  onClearSelection: () => void
}

const props = defineProps<LineDataPanelProps>()

// XML pretty-printing functionality
const showFullXml = ref(false)
const isCopied = ref(false)

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

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy!', err);
  }
}
</script>

<template>
  <div v-if="currentLine" class="panel-content line-data-panel">
    <div class="panel-header line-data-panel-header">
      <h3>Line Data</h3>
    </div>

    <div class="line-data-content flex-column">
      <div class="info-section flex-row">
        <label>ID:</label>
        <p>{{ currentLine.id }}</p>
      </div>

      <div class="info-section flex-row">
        <label>Document ID:</label>
        <p>{{ currentLine.documentId }}</p>
      </div>

      <div class="info-section flex-row">
        <label>Line Number:</label>
        <p>{{ currentLine.lineNumber }}</p>
      </div>

      <div v-if="currentLine.pageNumber !== null" class="info-section flex-row">
        <label>Page Number:</label>
        <p>{{ currentLine.pageNumber }}</p>
      </div>

      <div class="info-section flex-row">
        <label>Line Type:</label>
        <p>{{ currentLine.lineType }}</p>
      </div>

      <div v-if="currentLine.lineSubType" class="info-section flex-row">
        <label>Line SubType:</label>
        <p>{{ currentLine.lineSubType }}</p>
      </div>

      <div v-if="currentLine.metadata.contentHint" class="info-section flex-row">
        <label>Content Hint:</label>
        <p>{{ currentLine.metadata.contentHint }}</p>
      </div>

      <div class="info-section flex-row">
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
              </div>
              <div v-else class="full-xml">
                <pre>{{ prettyPrintXml(value) }}</pre>
              </div>
              
              <div class="xml-controls">
                <button @click="toggleFullXml" class="xml-btn" :class="{ 'is-active': showFullXml }">
                  {{ showFullXml ? 'Hide Full XML' : 'Show Full XML' }}
                </button>
                <button 
                  v-if="key === 'originalXml'" 
                  @click="copyToClipboard(value)" 
                  class="xml-btn"
                  :class="{ 'is-copied': isCopied }"
                >
                  <component :is="isCopied ? Check : Copy" :size="12" />
                  {{ isCopied ? 'Copied!' : 'Copy XML' }}
                </button>
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
@import '../css/LineDataPanel.css';
</style>
