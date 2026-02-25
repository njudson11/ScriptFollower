<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, inject, ref, onMounted, onBeforeUnmount } from 'vue'
import type { ScriptLineBase, SoundCue, IAudioPlayer } from '@/types/core'
import type { AppStore } from '@/store/AppStore'
import type { ActionController } from '@/core/ActionController'
import type { AudioPlaybackManager } from '@/core/AudioPlaybackManager'
import { ACTION_TYPES } from '@/types/actions'

const props = defineProps({
  line: {
    type: Object as PropType<ScriptLineBase>,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  contextClass: {
    type: String,
    default: ''
  }
})

const appStore = inject('appStore') as AppStore
const actionController = inject('actionController') as ActionController
const audioPlaybackManager = inject('audioPlaybackManager') as AudioPlaybackManager

const copyAnnotation = (text: string) => {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy annotation: ', err);
  });
}

const soundCue = computed<SoundCue | null>(() => props.line.metadata.sound || null)
const isPlaying = ref(false)
const isPreloaded = ref(false)
const isLoading = ref(false)
const remainingTime = ref(0)
const playbackProgress = ref(0)
let timeUpdateInterval: number | null = null

const lineClasses = computed(() => {
  const classes: string[] = ['script-line'];
  if (props.isActive) {
    classes.push('active');
  }
  if (props.contextClass) {
    classes.push(props.contextClass);
  }
  // Add generic classes from AppStore (e.g., line-type-SOUND-CUE)
  classes.push(...appStore.getLineClasses(props.line));
  return classes;
});

const formatTime = (seconds: number) => {
  const s = Math.max(0, seconds)
  const mins = Math.floor(s / 60)
  const secs = Math.floor(s % 60)
  const ms = Math.floor((s % 1) * 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

const togglePlayback = () => {
  if (!soundCue.value) return

  if (isPlaying.value) {
    actionController.dispatch({
      type: ACTION_TYPES.STOP_SOUND_CUE,
      payload: { cueId: soundCue.value.id }
    })
  } else {
    // Optimistically set loading if not preloaded
    if (!isPreloaded.value) {
      isLoading.value = true;
    }
    actionController.dispatch({
      type: ACTION_TYPES.PLAY_SOUND_CUE,
      payload: { cue: soundCue.value, lineId: props.line.id }
    })
  }
}

const updateState = () => {
  if (!soundCue.value) return
  
  // getPlayer is safe to call as it returns existing player if available
  const player = audioPlaybackManager.getPlayer(soundCue.value.id, soundCue.value.url)
  
  if (player) {
    isPlaying.value = player.isPlaying
    isPreloaded.value = player.isLoaded
    isLoading.value = player.loadStatus === 'loading' || player.loadStatus === 'decoding'
    
    if (player.duration > 0) {
      const cue = soundCue.value
      const start = cue.startOffsetSeconds || 0
      const duration = (cue.endOffsetSeconds && cue.endOffsetSeconds > 0)
          ? cue.endOffsetSeconds 
          : player.duration
      
      const totalToPlay = duration - start
      const currentPos = player.currentTime - start
      
      remainingTime.value = Math.max(0, duration - player.currentTime)
      playbackProgress.value = Math.min(100, Math.max(0, (currentPos / totalToPlay) * 100))
    } else {
      remainingTime.value = 0
      playbackProgress.value = 0
    }
  } else {
    isPlaying.value = false
    isPreloaded.value = false
    isLoading.value = false
    remainingTime.value = 0
    playbackProgress.value = 0
  }
}

onMounted(() => {
  // Run update interval in both contexts to keep UI in sync
  timeUpdateInterval = window.setInterval(updateState, 100)
})

onBeforeUnmount(() => {
  if (timeUpdateInterval) clearInterval(timeUpdateInterval)
})
</script>

<template>
  <div :class="lineClasses">
    <div class="line-type-badge">
      {{ line.lineType }}
    </div>
    <div class="line-content">
      <p class="line-text">{{ line.text }}</p>
      
      <!-- Document Viewer Controls -->
      <div v-if="soundCue && contextClass === 'context-document-viewer'" class="sound-cue-controls">
        <button 
          class="playback-btn" 
          :class="{ 
            'btn-stop': isPlaying, 
            'btn-play': !isPlaying && !isLoading,
            'btn-loading': isLoading,
            'is-preloaded': isPreloaded && !isPlaying 
          }"
          @click.stop="togglePlayback"
          :disabled="isLoading"
        >
          <span class="icon">{{ isPlaying ? '■' : (isLoading ? '⋯' : '▶') }}</span>
          <span class="label">
            {{ isPlaying ? 'Stop' : (isLoading ? 'Loading...' : (isPreloaded ? 'Play' : 'Load & Play')) }}
          </span>
        </button>
        
        <div v-show="isPlaying" class="remaining-time">
          {{ formatTime(remainingTime) }}
        </div>
      </div>

      <!-- Sidebar Controls -->
      <div v-if="soundCue && contextClass === 'context-sidebar'" class="sidebar-sound-controls">
        <button 
          class="playback-btn-icon-only" 
          :class="{ 
            'btn-stop': isPlaying, 
            'btn-play': !isPlaying && !isLoading,
            'btn-loading': isLoading 
          }"
          @click.stop="togglePlayback"
          :disabled="isLoading"
          :title="isPlaying ? 'Stop' : (isLoading ? 'Loading...' : 'Play')"
        >
          <span class="icon">{{ isPlaying ? '■' : (isLoading ? '⋯' : '▶') }}</span>
        </button>
        
        <div class="sidebar-progress-container">
          <div class="sidebar-progress-fill" :style="{ width: playbackProgress + '%' }"></div>
          <div class="sidebar-progress-text">
            {{ isPlaying ? formatTime(remainingTime) : (isLoading ? 'Loading...' : (isPreloaded ? 'Ready' : 'Not Loaded')) }}
          </div>
        </div>
      </div>

      <div class="line-meta">Line {{ line.lineNumber }}</div>
      <div v-if="line.annotation" class="line-annotation">
        <span class="annotation-label">Annotation:</span>
        <span class="annotation-text">{{ line.annotation }}</span>
        <button class="copy-btn" title="Copy Annotation" @click.stop="copyAnnotation(line.annotation)">
          <span class="copy-icon">📋</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/DefaultLineComponent.css';
@import '../css/SoundCueLine.css';

.playback-btn.is-preloaded {
    border: 1px solid var(--color-status-success-text);
}
</style>
