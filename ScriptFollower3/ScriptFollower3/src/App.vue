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
import { ActionController } from '@/core/ActionController'
import { KeybindingFeature } from '@/features/KeybindingFeature'
import { NavigationFeature } from '@/features/NavigationFeature'
import { SidebarProgressBarFeature } from '@/features/SidebarProgressBarFeature'
import { AudioPlaybackManager } from '@/core/AudioPlaybackManager'
import { AudioTestFeature } from '@/features/AudioTestFeature'
import { SoundFeature } from '@/features/SoundFeature'
import { LineType, ScriptLineBase, SoundCue } from './types/core'

// Initialize managers
const eventBus = new EventBus()
const appStore = new AppStore(eventBus)
const actionController = new ActionController(eventBus)
const audioPlaybackManager = new AudioPlaybackManager(eventBus)
const selectionManager = new LineSelectionManager(eventBus, appStore, actionController)
const featureManager = new FeatureManager(eventBus, actionController)

const isInitialized = ref(false)

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

  const soundFeature = new SoundFeature(featureManager, actionController, audioPlaybackManager, appStore, eventBus)
  await featureManager.registerFeature(soundFeature)

  isInitialized.value = true
})

// Provide managers to child components
provide('eventBus', eventBus)
provide('selectionManager', selectionManager)
provide('featureManager', featureManager)
provide('appStore', appStore)
provide('actionController', actionController)
provide('audioPlaybackManager', audioPlaybackManager)

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

const handleSoundsUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files || files.length === 0) {
    return
  }

  const document = appStore.getCurrentDocument()
  if (!document) {
    appStore.setError('Please load a document first before loading sounds.')
    return
  }

  try {
    appStore.setLoading(true)
    
    // Valid audio extensions
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac']
    
    // Create a map of filename start patterns to File objects
    const fileMap = new Map<string, File>()
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const lowerName = file.name.toLowerCase()
      
      if (audioExtensions.some(ext => lowerName.endsWith(ext))) {
        // Extract the leading alphanumeric part (e.g., "0101" from "0101 - sound.mp3")
        const match = file.name.match(/^([a-zA-Z0-9]+)/)
        if (match) {
          fileMap.set(match[1], file)
        }
      }
    }

    const updatedLines: ScriptLineBase[] = []
    let matchCount = 0

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
            volume: 80, // Default volume
            pan: 'center'
          }

          updatedLines.push({
            ...line,
            metadata: {
              ...line.metadata,
              sound: soundCue
            }
          })
          matchCount++
        }
      }
    }

    if (updatedLines.length > 0) {
      appStore.updateLines(updatedLines)
      console.log(`[App] Matched ${matchCount} sound files to cues.`)
    } else {
      console.warn('[App] No sound files matched current document cues.')
    }

  } catch (error) {
    appStore.setError(error instanceof Error ? error.message : 'Failed to process sound files')
  } finally {
    appStore.setLoading(false)
    input.value = ''
  }
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
      @file-upload="handleFileUpload" 
      @sounds-upload="handleSoundsUpload"
      :has-document="hasDocument" 
      :is-loading="appStore.state.isLoading" 
    />

    <div v-if="appStore.state.error" class="error-banner">
      <span>{{ appStore.state.error }}</span>
      <button @click="appStore.setError(null)">×</button>
    </div>

    <div class="main-content" :style="{ gridTemplateColumns: gridTemplateColumns }">
      <Sidebar />
      <DocumentViewer @file-upload="handleFileUpload" />
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
