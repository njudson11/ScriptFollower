<script setup lang="ts">
import { ref, computed, onMounted, provide, onBeforeUnmount } from 'vue'
import { EventBus, EVENT_TYPES } from '@/core/EventBus'
import { LineSelectionManager } from '@/core/LineSelectionManager'
import { FeatureManager } from '@/core/FeatureManager'
import { AppStore } from '@/store/AppStore'
import { parseODT } from '@/parsers/ODTParser'
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
import { AudioTestFeature } from '@/features/AudioTestFeature'
import { SoundFeature } from '@/features/SoundFeature'
import { LineType, ScriptLineBase, SoundCue } from './types/core'
import { ACTION_TYPES } from './types/actions'

import { AnnotationManager } from '@/core/AnnotationManager'

// Initialize managers
const eventBus = new EventBus()
const annotationManager = new AnnotationManager()
const appStore = new AppStore(eventBus)
const actionController = new ActionController(eventBus)
const audioPlaybackManager = new AudioPlaybackManager(eventBus)
const selectionManager = new LineSelectionManager(eventBus, appStore, actionController)
const featureManager = new FeatureManager(eventBus, actionController)

const isInitialized = ref(false)
const unregisterActions: Array<() => void> = []

onMounted(async () => {
  // Register features
  const dialogueFeature = new DialogueRenderingFeature(featureManager)
  await featureManager.registerFeature(dialogueFeature)

  const keybindingFeature = new KeybindingFeature(featureManager, actionController, appStore)
  await featureManager.registerFeature(keybindingFeature)

  const navigationFeature = new NavigationFeature(featureManager, actionController, appStore, selectionManager)
  await featureManager.registerFeature(navigationFeature)

  const sidebarProgressBarFeature = new SidebarProgressBarFeature(selectionManager, appStore)
  await featureManager.registerFeature(sidebarProgressBarFeature)

  const audioTestFeature = new AudioTestFeature(featureManager)
  await featureManager.registerFeature(audioTestFeature)

  const soundFeature = new SoundFeature(featureManager, actionController, audioPlaybackManager, appStore, eventBus, annotationManager, selectionManager)
  await featureManager.registerFeature(soundFeature)

  // Register action handlers
  unregisterActions.push(
    actionController.registerHandler(ACTION_TYPES.LOAD_DOCUMENT, handleLoadDocumentAction),
    actionController.registerHandler(ACTION_TYPES.LOAD_SOUNDS, handleLoadSoundsAction),
    actionController.registerHandler(ACTION_TYPES.UPDATE_LINE, handleUpdateLineAction)
  )

  isInitialized.value = true
})

onBeforeUnmount(() => {
  unregisterActions.forEach(unregister => unregister())
})

// Provide managers to child components
provide('eventBus', eventBus)
provide('annotationManager', annotationManager)
provide('selectionManager', selectionManager)
provide('featureManager', featureManager)
provide('appStore', appStore)
provide('actionController', actionController)
provide('audioPlaybackManager', audioPlaybackManager)

// Action Handlers
async function handleLoadDocumentAction(action: any) {
  const { file } = action.payload
  if (!file) return

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
  }
}

async function handleLoadSoundsAction(action: any) {
  const { files } = action.payload
  if (!files || files.length === 0) return

  const document = appStore.getCurrentDocument()
  if (!document) {
    appStore.setError('Please load a document first before loading sounds.')
    return
  }

  try {
    appStore.setLoading(true)
    
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']
    const fileMap = new Map<string, File>()
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const lowerName = file.name.toLowerCase()
      if (audioExtensions.some(ext => lowerName.endsWith(ext))) {
        const match = file.name.match(/^([a-zA-Z0-9]+)/)
        if (match) fileMap.set(match[1], file)
      }
    }

    const updatedLines: ScriptLineBase[] = []
    for (const line of document.lines) {
      if (line.lineType === LineType.SOUND_CUE) {
        const soundRef = line.metadata.soundRef
        if (soundRef && fileMap.has(soundRef)) {
          const file = fileMap.get(soundRef)!
          const objectUrl = URL.createObjectURL(file)
          
          const soundCue: SoundCue = {
            id: `cue_${line.id}`,
            name: file.name,
            url: objectUrl,
            volume: 100,
            pan: 'center'
          }

          updatedLines.push({
            ...line,
            metadata: { ...line.metadata, sound: soundCue }
          })
        }
      }
    }

    if (updatedLines.length > 0) {
      appStore.updateLines(updatedLines)
      eventBus.emit({ type: EVENT_TYPES.SOUNDS_LOADED, timestamp: new Date() });
    }
  } catch (error) {
    appStore.setError('Failed to process sound files')
  } finally {
    appStore.setLoading(false)
  }
}

function handleUpdateLineAction(action: any) {
  const { lineId, updates } = action.payload
  appStore.updateLine(lineId, updates)
}

// Internal component event handlers (bridging to ActionController)
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
  if (files) {
    actionController.dispatch({ type: ACTION_TYPES.LOAD_SOUNDS, payload: { files } })
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
