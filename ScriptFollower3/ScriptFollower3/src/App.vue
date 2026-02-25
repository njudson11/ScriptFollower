<script setup lang="ts">
import { ref, computed, onMounted, provide, onBeforeUnmount } from 'vue'
import { EventBus, EVENT_TYPES } from '@/core/EventBus'
import { LineSelectionManager } from '@/core/LineSelectionManager'
import { FeatureManager } from '@/core/FeatureManager'
import { AppStore } from '@/store/AppStore'
import Toolbar from '@/components/Toolbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import DocumentViewer from '@/components/DocumentViewer.vue'
import RightPanel from '@/components/RightPanel.vue'
import { DialogueRenderingFeature } from '@/features/DialogueRenderingFeature'
import { ActionController } from '@/core/ActionController'
import { KeybindingFeature } from '@/features/KeybindingFeature'
import { NavigationFeature } from '@/features/NavigationFeature'
import { SidebarProgressBarFeature } from '@/features/SidebarProgressBarFeature'
import { AudioPlaybackManager } from '@/core/AudioPlaybackManager'
import { MasterAudioPanelFeature } from '@/features/MasterAudioPanelFeature'
import { SoundFeature } from '@/features/SoundFeature'
import { ProjectManager } from '@/core/ProjectManager'
import { ACTION_TYPES } from './types/actions'
import { AnnotationManager } from '@/core/AnnotationManager'

// Initialize core managers
const eventBus = new EventBus()
const annotationManager = new AnnotationManager()
const appStore = new AppStore(eventBus)
const actionController = new ActionController(eventBus)
const audioPlaybackManager = new AudioPlaybackManager(eventBus)
const selectionManager = new LineSelectionManager(eventBus, appStore, actionController)
const featureManager = new FeatureManager(eventBus, actionController)

// Initialize business logic manager
const projectManager = new ProjectManager(appStore, actionController, selectionManager, eventBus)

const isInitialized = ref(false)
const registeredFeatureIds: string[] = []

onMounted(async () => {
  // Create features
  const features = [
    new DialogueRenderingFeature(featureManager),
    new KeybindingFeature(featureManager, actionController, appStore, selectionManager),
    new NavigationFeature(featureManager, actionController, appStore, selectionManager),
    new SidebarProgressBarFeature(selectionManager, appStore),
    new MasterAudioPanelFeature(featureManager),
    new SoundFeature(featureManager, actionController, audioPlaybackManager, appStore, eventBus, annotationManager, selectionManager)
  ]

  // Register all features and track IDs for cleanup
  for (const feature of features) {
    await featureManager.registerFeature(feature)
    registeredFeatureIds.push(feature.id)
  }

  isInitialized.value = true
})

onBeforeUnmount(async () => {
  // Explicitly destroy all features to remove global listeners
  for (const id of registeredFeatureIds) {
    try {
      await featureManager.unregisterFeature(id)
    } catch (e) {
      console.warn(`Failed to unregister feature ${id}:`, e)
    }
  }
  
  // Cleanup managers
  projectManager.destroy()
  audioPlaybackManager.destroy()
  selectionManager.destroy()
})

// Provide managers to child components
provide('eventBus', eventBus)
provide('annotationManager', annotationManager)
provide('selectionManager', selectionManager)
provide('featureManager', featureManager)
provide('appStore', appStore)
provide('actionController', actionController)
provide('audioPlaybackManager', audioPlaybackManager)

// Internal UI bridges to ActionController
const onFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    actionController.dispatch({ type: ACTION_TYPES.LOAD_DOCUMENT, payload: { file } })
  }
  input.value = ''
}

const onSoundsUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (files && files.length > 0) {
    actionController.dispatch({ type: ACTION_TYPES.LOAD_SOUNDS, payload: { files: Array.from(files) } })
  }
  input.value = ''
}

const hasDocument = computed(() => appStore.state.currentDocument !== null)

const gridTemplateColumns = computed(() => {
  const rightPanelWidth = appStore.state.isRightPanelCollapsed ? '40px' : '350px';
  return `200px 1fr ${rightPanelWidth}`;
});
</script>

<template>
  <div class="app-container" v-if="isInitialized">
    <Toolbar 
      @file-upload="onFileUpload" 
      @sounds-upload="onSoundsUpload"
      :has-document="hasDocument" 
      :is-loading="appStore.state.isLoading" 
    />

    <div v-if="appStore.state.error" class="error-banner">
      <span>{{ appStore.state.error }}</span>
      <button @click="appStore.setError(null)">×</button>
    </div>

    <div class="main-content" :style="{ gridTemplateColumns: gridTemplateColumns }">
      <Sidebar />
      <DocumentViewer @file-upload="onFileUpload" />
      <RightPanel />
    </div>
  </div>
  <div v-else class="loading-screen">
    Initializing features...
  </div>
</template>

<style scoped>
@import './css/App.css';

.loading-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  font-size: 1.2em;
  color: var(--color-text-secondary);
}
</style>
