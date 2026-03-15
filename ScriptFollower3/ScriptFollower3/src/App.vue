<script setup lang="ts">
import { ref, computed, onMounted, provide, onBeforeUnmount, watch } from 'vue'
import { EventBus, EVENT_TYPES } from '@/core/EventBus'
import { LineSelectionManager } from '@/core/LineSelectionManager'
import { FeatureManager } from '@/core/FeatureManager'
import { AppStore } from '@/store/AppStore'
import Toolbar from '@/components/Toolbar.vue'
import Sidebar from '@/components/Sidebar.vue'
import DocumentViewer from '@/components/DocumentViewer.vue'
import RightPanel from '@/components/RightPanel.vue'
import TouchControls from '@/components/TouchControls.vue'
import { DialogueRenderingFeature } from '@/features/DialogueRenderingFeature'
import { ActionController } from '@/core/ActionController'
import { KeybindingFeature } from '@/features/KeybindingFeature'
import { NavigationFeature } from '@/features/NavigationFeature'
import { SidebarProgressBarFeature } from '@/features/SidebarProgressBarFeature'
import { AudioPlaybackManager } from '@/core/AudioPlaybackManager'
import { MasterAudioPanelFeature } from '@/features/MasterAudioPanelFeature'
import { SoundFeature } from '@/features/SoundFeature'
import { SearchFeature } from '@/features/SearchFeature'
import { VoiceRecognitionFeature } from '@/features/VoiceRecognitionFeature'
import { WebSpeechEngine } from '@/core/WebSpeechEngine'
import { ProjectManager } from '@/core/ProjectManager'
import { ACTION_TYPES } from './types/actions'
import { AnnotationManager } from '@/core/AnnotationManager'
import { PersistenceManager } from '@/core/PersistenceManager'
import { AppConfig } from '@/config/AppConfig'
import { useTouch } from '@/composables/useTouch'
import { Upload } from 'lucide-vue-next'
import { BaseCueFeature } from '@/features/BaseCueFeature'

// Initialize core managers
const eventBus = new EventBus()
const annotationManager = new AnnotationManager()
const appStore = new AppStore(eventBus)
const actionController = new ActionController(eventBus)
const audioPlaybackManager = new AudioPlaybackManager(eventBus)
const selectionManager = new LineSelectionManager(eventBus, appStore, actionController)
const featureManager = new FeatureManager(eventBus, actionController, selectionManager)
const persistenceManager = new PersistenceManager(appStore)

// Initialize business logic manager
const projectManager = new ProjectManager(appStore, actionController, selectionManager, eventBus, audioPlaybackManager)

const isInitialized = ref(false)
const registeredFeatureIds: string[] = []

// Touch device detection
const appContainerRef = ref<HTMLElement | null>(null)
const { isTouchDevice } = useTouch()
watch(isTouchDevice, (isTouch) => {
  appStore.setIsTouchDevice(isTouch);
  if (appContainerRef.value) {
    appContainerRef.value.classList.toggle('touch-device', isTouch);
    appContainerRef.value.classList.toggle('no-touch-device', !isTouch);
  }
}, { immediate: true });

// Drag and Drop Logic
const isDragging = ref(false)
let dragCounter = 0

const onDragEnter = (e: DragEvent) => {
  e.preventDefault()
  dragCounter++
  if (e.dataTransfer?.types.includes('Files')) {
    isDragging.value = true
  }
}

const onDragLeave = (e: DragEvent) => {
  e.preventDefault()
  dragCounter--
  if (dragCounter <= 0) {
    isDragging.value = false
    dragCounter = 0
  }
}

const onDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

const traverseFileTree = async (item: any, path?: string): Promise<File[]> => {
  path = path || ''
  if (item.isFile) {
    return new Promise((resolve) => {
      item.file((file: File) => {
        resolve([file])
      })
    })
  } else if (item.isDirectory) {
    const dirReader = item.createReader()
    const entries: any[] = await new Promise((resolve) => {
      dirReader.readEntries((results: any[]) => {
        resolve(results)
      })
    })
    
    const files: File[] = []
    for (const entry of entries) {
      const childFiles = await traverseFileTree(entry, path + item.name + '/')
      files.push(...childFiles)
    }
    return files
  }
  return []
}

const onDrop = async (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  dragCounter = 0

  if (!e.dataTransfer || !e.dataTransfer.items) return

  const files: File[] = []
  const items = Array.from(e.dataTransfer.items)
  
  for (const item of items) {
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry()
      if (entry) {
        const foundFiles = await traverseFileTree(entry)
        files.push(...foundFiles)
      }
    }
  }

  if (files.length === 0) return

  // Logic: 
  // 1. If exactly one .odt file and nothing else, LOAD_DOCUMENT
  // 2. Otherwise, treat as a potential project folder/collection of sounds, LOAD_SOUNDS
  
  const odtFiles = files.filter(f => f.name.toLowerCase().endsWith('.odt'))
  
  if (files.length === 1 && odtFiles.length === 1) {
    actionController.dispatch({ type: ACTION_TYPES.LOAD_DOCUMENT, payload: { file: files[0] } })
  } else {
    actionController.dispatch({ type: ACTION_TYPES.LOAD_SOUNDS, payload: { files } })
  }
}

onMounted(async () => {
  // Initialize persistence layer first to load saved state
  await persistenceManager.init()

  // Create voice engine
  const voiceEngine = new WebSpeechEngine(AppConfig.voice.language || 'en-GB')

  // Create features
  const features = [
    new BaseCueFeature(featureManager, actionController, appStore, annotationManager, eventBus, selectionManager),
    new DialogueRenderingFeature(featureManager),
    new KeybindingFeature(featureManager, actionController, appStore, selectionManager),
    new NavigationFeature(featureManager, actionController, appStore, selectionManager),
    new SidebarProgressBarFeature(selectionManager, appStore),
    new MasterAudioPanelFeature(featureManager),
    new SoundFeature(featureManager, actionController, audioPlaybackManager, appStore, eventBus, annotationManager, selectionManager),
    new SearchFeature(actionController, appStore),
    new VoiceRecognitionFeature(appStore, eventBus, actionController, selectionManager, voiceEngine)
  ]

  // Register all features and track IDs for cleanup
  for (const feature of features) {
    await featureManager.registerFeature(feature)
    registeredFeatureIds.push(feature.id)
  }

  // If a document was loaded from persistence, select the first line if nothing is selected
  if (appStore.state.currentDocument && !selectionManager.getCurrentLine()) {
    if (appStore.state.currentDocument.lines.length > 0) {
      selectionManager.selectLine(appStore.state.currentDocument.lines[0].id)
    }
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
provide('persistenceManager', persistenceManager)

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
  const rightPanelWidth = appStore.state.isRightPanelCollapsed 
    ? AppConfig.layout.collapsedPanelWidth 
    : AppConfig.layout.rightPanelWidth;
  return `${AppConfig.layout.sidebarWidth} 1fr ${rightPanelWidth}`;
});
</script>

<template>
  <div 
    class="app-container" 
    :class="{ 
      'has-touch-controls': isTouchDevice,
      'is-dragging': isDragging
    }"
    ref="appContainerRef" 
    v-if="isInitialized"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Drag Overlay -->
    <div v-if="isDragging" class="drag-overlay">
      <div class="drag-message">
        <Upload :size="48" />
        <h2>Drop to Load</h2>
        <p>Drop an .odt script or a folder of sound files</p>
      </div>
    </div>

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
    <TouchControls v-if="isTouchDevice" />
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

.drag-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* Let the drop event pass through to the container */
}

.drag-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: white;
  text-align: center;
  padding: 40px;
  border: 3px dashed rgba(255, 255, 255, 0.3);
  border-radius: 16px;
}

.drag-message h2 {
  margin: 0;
  font-size: 2em;
}

.drag-message p {
  margin: 0;
  opacity: 0.8;
}
</style>
