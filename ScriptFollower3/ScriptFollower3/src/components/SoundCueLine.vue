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

const soundCue = computed<SoundCue | null>(() => props.line.metadata.sound || null)
const isPlaying = ref(false)
const isPreloaded = ref(false)
const remainingTime = ref(0)
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
    
    if (isPlaying.value) {
      const cue = soundCue.value
      const duration = (cue.endOffsetSeconds && cue.endOffsetSeconds > 0)
          ? cue.endOffsetSeconds 
          : player.duration
      
      remainingTime.value = Math.max(0, duration - player.currentTime)
    } else {
      remainingTime.value = 0
    }
  } else {
    isPlaying.value = false
    isPreloaded.value = false
    remainingTime.value = 0
  }
}

onMounted(() => {
  if (props.contextClass === 'context-document-viewer') {
    timeUpdateInterval = window.setInterval(updateState, 100)
  }
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
      
      <div v-if="soundCue && contextClass === 'context-document-viewer'" class="sound-cue-controls">
        <button 
          class="playback-btn" 
          :class="{ 'btn-stop': isPlaying, 'btn-play': !isPlaying, 'is-preloaded': isPreloaded && !isPlaying }"
          @click.stop="togglePlayback"
        >
          <span class="icon">{{ isPlaying ? '■' : '▶' }}</span>
          <span class="label">
            {{ isPlaying ? 'Stop' : (isPreloaded ? 'Play' : 'Load & Play') }}
          </span>
        </button>
        
        <div v-show="isPlaying" class="remaining-time">
          {{ formatTime(remainingTime) }}
        </div>
      </div>

      <div class="line-meta">Line {{ line.lineNumber }}</div>
      <div v-if="line.annotation" class="line-annotation">
        Annotation: {{ line.annotation }}
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
