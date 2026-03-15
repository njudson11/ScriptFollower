<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, inject, ref, onMounted, onBeforeUnmount } from 'vue'
import type { ScriptLineBase, SoundCue } from '@/types/core'
import type { AppStore } from '@/store/AppStore'
import type { ActionController } from '@/core/ActionController'
import type { AudioPlaybackManager } from '@/core/AudioPlaybackManager'
import type { AnnotationManager } from '@/core/AnnotationManager'
import { ACTION_TYPES } from '@/types/actions'
import { AppConfig } from '@/config/AppConfig'
import LineAnnotation from './LineAnnotation.vue'

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
const annotationManager = inject('annotationManager') as AnnotationManager

const soundCue = computed<SoundCue | null>(() => props.line.metadata.sound || null)
const hasTriggerableAnnotation = computed(() => !!props.line.annotation)
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

/**
 * Resolves the channel ID, prioritizing annotations, then line subtypes,
 * and finally defaulting to the base virtual channel from config.
 */
const resolveChannelId = () => {
    return appStore.resolveChannelId(props.line, annotationManager);
};

const togglePlayback = (event?: MouseEvent) => {
  // Blur the button to prevent spacebar double-triggers if focus is kept
  if (event && event.currentTarget instanceof HTMLElement) {
    event.currentTarget.blur();
  }

  if (soundCue.value && isPlaying.value) {
    actionController.dispatch({
      type: ACTION_TYPES.STOP_SOUND_CUE,
      payload: { cueId: soundCue.value.id }
    })
  } else {
    if (soundCue.value && !isPreloaded.value) {
      isLoading.value = true;
    }
    actionController.dispatch({
      type: ACTION_TYPES.PLAY_SOUND_CUE,
      payload: { cue: soundCue.value, lineId: props.line.id }
    })
  }
}

const updateState = () => {
  if (!soundCue.value) {
    isPlaying.value = false
    isPreloaded.value = false
    isLoading.value = false
    remainingTime.value = 0
    playbackProgress.value = 0
    return
  }
  
  const channelId = resolveChannelId();
  const player = audioPlaybackManager.getPlayer(soundCue.value.id, soundCue.value.url, channelId)
  
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
  timeUpdateInterval = window.setInterval(updateState, AppConfig.audio.refreshIntervalMs)
})

onBeforeUnmount(() => {
  if (timeUpdateInterval) clearInterval(timeUpdateInterval)
})
</script>

<template>
  <div :class="lineClasses">
    <div class="line-content">
      <p class="line-text">{{ line.text }}</p>
    </div>
    
    <!-- Unified Action row below content for Document Viewer -->
    <div v-if="(soundCue || hasTriggerableAnnotation) && contextClass === 'context-document-viewer'" class="line-actions">
      <button 
        class="btn-trigger" 
        :class="{ 
          'btn-stop': isPlaying, 
          'btn-play': !isPlaying && !isLoading && soundCue,
          'btn-loading': isLoading,
          'is-preloaded': isPreloaded && !isPlaying,
        }"
        @click.stop="togglePlayback"
        :disabled="isLoading"
      >
        <span class="icon">{{ isPlaying ? '■' : (isLoading ? '⋯' : (soundCue ? '▶' : '⚡')) }}</span>
        <span class="label">
          {{ isPlaying ? 'Stop' : (isLoading ? 'Loading...' : (soundCue ? (isPreloaded ? 'Play' : 'Load & Play') : 'Trigger')) }}
        </span>
      </button>
      
      <div v-show="isPlaying" class="remaining-time">
        {{ formatTime(remainingTime) }}
      </div>
    </div>

    <!-- Sidebar Controls (Keep as is for compact view) -->
    <div v-if="(soundCue || hasTriggerableAnnotation) && contextClass === 'context-sidebar'" class="sidebar-sound-controls">
      <button 
        class="playback-btn-icon-only" 
        :class="{ 
          'btn-stop': isPlaying, 
          'btn-play': !isPlaying && !isLoading && soundCue,
          'btn-loading': isLoading,
        }"
        @click.stop="togglePlayback"
        :disabled="isLoading"
        :title="isPlaying ? 'Stop' : (isLoading ? 'Loading...' : (soundCue ? 'Play' : 'Trigger'))"
      >
        <span class="icon">{{ isPlaying ? '■' : (isLoading ? '⋯' : (soundCue ? '▶' : '⚡')) }}</span>
      </button>
      
      <div v-if="soundCue" class="sound-cue-sidebar-progress" :class="{ 'is-active': isPlaying }">
        <div class="sound-cue-sidebar-progress-fill" :style="{ width: playbackProgress + '%' }"></div>
        <div class="sound-cue-sidebar-progress-text">
          {{ isPlaying ? formatTime(remainingTime) : (isLoading ? 'Loading...' : (isPreloaded ? 'Ready' : 'Not Loaded')) }}
        </div>
      </div>
      <div v-else-if="hasTriggerableAnnotation" class="sidebar-annotation-trigger-label">
          Trigger Only
      </div>
    </div>

    <LineAnnotation v-if="line.annotation" :annotation="line.annotation" />
  </div>
</template>

<style scoped>
@import '../css/DefaultLineComponent.css';
@import '../css/SoundCueLine.css';

/* Override some btn-trigger defaults for sound cues specifically */
.btn-trigger.btn-stop {
    color: var(--color-error);
    border-color: var(--color-error);
}

.btn-trigger.btn-play {
    color: var(--color-success);
    border-color: var(--color-success);
}

.btn-trigger.is-preloaded:not(.btn-stop) {
    background: var(--color-success-bg);
}
</style>
