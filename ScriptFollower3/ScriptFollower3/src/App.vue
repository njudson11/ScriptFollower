<script setup lang="ts">
import { ref, computed, onMounted, provide } from 'vue'
import { EventBus } from '@/core/EventBus'
import { LineSelectionManager } from '@/core/LineSelectionManager'
import { FeatureManager } from '@/core/FeatureManager'
import { AppStore } from '@/store/AppStore'
import { parseODT } from '@/parsers/ODTParser'
import Toolbar from '@/components/Toolbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import DocumentViewer from '@/components/DocumentViewer.vue'
import RightPanel from '@/components/RightPanel.vue'
import { DialogueRenderingFeature } from '@/features/DialogueRenderingFeature'
import { ActionController } from '@/core/ActionController' // Import ActionController
import { KeybindingFeature } from '@/features/KeybindingFeature' // Import KeybindingFeature
import { NavigationFeature } from '@/features/NavigationFeature' // Import NavigationFeature
import { SidebarProgressBarFeature } from '@/features/SidebarProgressBarFeature' // Import SidebarProgressBarFeature

// Initialize managers
const eventBus = new EventBus()
const appStore = new AppStore(eventBus) // Instantiate AppStore first
const selectionManager = new LineSelectionManager(eventBus, appStore) // Pass appStore to LineSelectionManager
const actionController = new ActionController(eventBus) // Instantiate ActionController
const featureManager = new FeatureManager(eventBus, actionController) // Pass ActionController to FeatureManager

// Register features
const dialogueFeature = new DialogueRenderingFeature(featureManager)
featureManager.registerFeature(dialogueFeature)

const keybindingFeature = new KeybindingFeature(featureManager, actionController, appStore) // Instantiate KeybindingFeature
featureManager.registerFeature(keybindingFeature) // Register KeybindingFeature

const navigationFeature = new NavigationFeature(featureManager, actionController, appStore, selectionManager) // Instantiate NavigationFeature
featureManager.registerFeature(navigationFeature) // Register NavigationFeature

const sidebarProgressBarFeature = new SidebarProgressBarFeature(selectionManager, appStore) // Instantiate SidebarProgressBarFeature
featureManager.registerFeature(sidebarProgressBarFeature) // Register SidebarProgressBarFeature

// Provide managers to child components
provide('eventBus', eventBus)
provide('selectionManager', selectionManager)
provide('featureManager', featureManager)
provide('appStore', appStore)
provide('actionController', actionController) // Provide ActionController

const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  try {
    appStore.setLoading(true)
    appStore.setError(null)

    if (file.name.endsWith('.odt')) {
      const document = await parseODT(file)
      appStore.loadDocument(document)

      if (document.lines.length > 0) {
        selectionManager.selectLine(document.lines[0].id)
      }
    } else {
      appStore.setError('Unsupported file format. Please upload an .odt file.')
    }
  } catch (error) {
    appStore.setError(error instanceof Error ? error.message : 'Failed to load document')
  } finally {
    appStore.setLoading(false)
    input.value = ''
  }
}

const hasDocument = computed(() => appStore.state.currentDocument !== null)

const gridTemplateColumns = computed(() => {
  const rightPanelWidth = appStore.state.isRightPanelCollapsed ? '40px' : '350px'; // Changed from '0px' to '40px'
  return `200px 1fr ${rightPanelWidth}`;
});
</script>

<template>
  <div class="app-container">
    <Toolbar @file-upload="handleFileUpload" :has-document="hasDocument" :is-loading="appStore.state.isLoading" />

    <div v-if="appStore.state.error" class="error-banner">
      <span>{{ appStore.state.error }}</span>
      <button @click="appStore.setError(null)">×</button>
    </div>

    <div v-if="hasDocument" class="main-content" :style="{ gridTemplateColumns: gridTemplateColumns }">
      <Sidebar />
      <DocumentViewer />
      <RightPanel />
    </div>

    <div v-else class="empty-state">
      <div class="empty-state-content">
        <h1>ScriptFollower 3</h1>
        <p>Load an ODT document to get started</p>
        <label class="upload-button">
          <input type="file" accept=".odt" @change="handleFileUpload" style="display: none" />
          <span>{{ appStore.state.isLoading ? 'Loading...' : 'Choose File' }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './css/App.css';
</style>
