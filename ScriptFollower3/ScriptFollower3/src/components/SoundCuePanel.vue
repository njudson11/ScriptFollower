<script setup lang="ts">
import { ref, inject, onMounted, onBeforeUnmount, computed, watch, watchEffect } from 'vue';
import type { AudioPlaybackManager } from '@/core/AudioPlaybackManager';
import type { IAudioPlayer, ScriptLineBase, SoundCue, EndBehaviour } from '@/types/core';
import type { AppStore } from '@/store/AppStore';
import type { ActionController } from '@/core/ActionController';
import type { AnnotationManager } from '@/core/AnnotationManager';
import { ACTION_TYPES } from '@/types/actions';
import AudioWaveform from './AudioWaveform.vue';
import { LineType } from '@/types/core';
import { ChevronDown, Play, Square, AlertCircle } from 'lucide-vue-next';

const props = defineProps<{
  line: ScriptLineBase
}>();

const audioPlaybackManager = inject('audioPlaybackManager') as AudioPlaybackManager;
const annotationManager = inject('annotationManager') as AnnotationManager;
const appStore = inject('appStore') as AppStore;
const actionController = inject('actionController') as ActionController;

const volume = ref(100);
const balance = ref(0);
const panStart = ref(0);
const panEnd = ref(0);
const isDynamicPan = ref(false);

const startTime = ref(0);
const endTime = ref(0);
const fadeIn = ref(0);
const fadeOut = ref(0);

const endBehaviour = ref<EndBehaviour>('none');
const loopCount = ref(0);
const jumpRef = ref('');

// Initialize with correctly resolved channel ID to prevent race conditions/mismatches on mount
const selectedChannelId = ref(appStore.resolveChannelId(props.line, annotationManager));

const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
let timeUpdateInterval: number | null = null;

const soundCue = computed<SoundCue | null>(() => props.line.metadata.sound || null);
const currentPlayer = computed(() => {
  if (!soundCue.value) return null;
  return audioPlaybackManager.getPlayer(soundCue.value.id, soundCue.value.url, selectedChannelId.value);
});

// --- Stop Behaviour State ---
const isStopDropdownOpen = ref(false);
type StopMode = 'none' | 'previous' | 'all' | 'refs';
const stopMode = ref<StopMode>('none');
const selectedStopRefs = ref<string[]>([]);

const recentSoundCues = computed(() => {
  const allLines = appStore.getLines();
  const currentIndex = appStore.getLineIndex(props.line.id);
  if (currentIndex === -1) return [];

  return allLines
    .slice(0, currentIndex)
    .filter(l => l.lineType === LineType.SOUND_CUE && l.metadata.soundRef)
    .slice(-5) 
    .map(l => ({
      ref: l.metadata.soundRef,
      text: l.text,
      lineNumber: l.lineNumber,
      soundDescription: l.metadata.soundDescription || l.text 
    }))
    .reverse();
});

const stopDisplayValue = computed(() => {
  switch (stopMode.value) {
    case 'previous': return 'Stop Previous';
    case 'all': return 'Stop All';
    case 'refs':
      if (selectedStopRefs.value.length === 0) return 'Select Cues...';
      if (selectedStopRefs.value.length === 1) return `Stop [${selectedStopRefs.value[0]}]`;
      return `Stop [${selectedStopRefs.value.length}] Cues`;
    default: return 'None';
  }
});
// --- End Stop Behaviour State ---

const availableChannels = computed(() => appStore.state.virtualChannels);

watchEffect(() => {
  if (currentPlayer.value) {
    currentPlayer.value.volume = volume.value / 100;
    // Only update static balance if dynamic pan is not active
    if (!isDynamicPan.value) {
      currentPlayer.value.balance = balance.value;
    }
  }
});

/**
 * Resolves the channel ID, prioritizing annotations, then line subtypes,
 * and finally defaulting to the first available virtual channel (usually 'A').
 */
const resolveChannelId = () => {
    return appStore.resolveChannelId(props.line, annotationManager);
};

const parseAnnotations = () => {
  const get = (key: string, fallback: any) => {
    const val = annotationManager.getValue(props.line.annotation, key);
    return val !== undefined ? val : fallback;
  };

  volume.value = get('volume', 100);
  
  const panVal = get('pan', 0);
  if (panVal === 'left') balance.value = -1;
  else if (panVal === 'right') balance.value = 1;
  else if (panVal === 'centre') balance.value = 0;
  else balance.value = typeof panVal === 'number' ? panVal : parseFloat(panVal) || 0;

  const ps = get('pan-start', undefined);
  const pe = get('pan-end', undefined);
  
  if (ps !== undefined || pe !== undefined) {
    isDynamicPan.value = true;
    panStart.value = ps !== undefined ? ps : balance.value;
    panEnd.value = pe !== undefined ? pe : balance.value;
  } else {
    isDynamicPan.value = false;
    panStart.value = balance.value;
    panEnd.value = balance.value;
  }

  startTime.value = get('start', 0);
  endTime.value = get('end', 0);
  fadeIn.value = get('fade-in', 0);
  fadeOut.value = get('fade-out', 0);
  
  endBehaviour.value = get('end-behaviour', 'none');
  loopCount.value = get('loop-count', 0);
  jumpRef.value = get('jump-ref', '');

  selectedChannelId.value = resolveChannelId();

  const stopValue = get('stop', null);
  if (stopValue === 'previous' || stopValue === 'all') {
    stopMode.value = stopValue;
    selectedStopRefs.value = [];
  } else if (typeof stopValue === 'string' && stopValue.startsWith('[') && stopValue.endsWith(']')) {
    stopMode.value = 'refs';
    selectedStopRefs.value = stopValue.slice(1, -1).split(',').map(s => s.trim());
  } else {
    stopMode.value = 'none';
    selectedStopRefs.value = [];
  }
};

const updateAnnotations = () => {
  let stopValue: string | null = null;
  if (stopMode.value === 'previous' || stopMode.value === 'all') {
    stopValue = stopMode.value;
  } else if (stopMode.value === 'refs' && selectedStopRefs.value.length > 0) {
    stopValue = `[${selectedStopRefs.value.join(',')}]`;
  }

  const defaultChan = props.line.lineSubType || (appStore.state.virtualChannels[0]?.id || 'A');
  const chanToStore = selectedChannelId.value !== defaultChan ? selectedChannelId.value : null;

  const annotationString = annotationManager.update(props.line.annotation, {
    'volume': volume.value !== 100 ? volume.value : null,
    'pan': !isDynamicPan.value && balance.value !== 0 ? balance.value.toFixed(1) : null,
    'pan-start': isDynamicPan.value ? panStart.value.toFixed(1) : null,
    'pan-end': isDynamicPan.value ? panEnd.value.toFixed(1) : null,
    'start': startTime.value > 0 ? startTime.value.toFixed(2) : null,
    'end': endTime.value > 0 ? endTime.value.toFixed(2) : null,
    'fade-in': fadeIn.value > 0 ? fadeIn.value : null,
    'fade-out': fadeOut.value > 0 ? fadeOut.value : null,
    'chan': chanToStore,
    'stop': stopValue,
    'end-behaviour': endBehaviour.value !== 'none' ? endBehaviour.value : null,
    'loop-count': endBehaviour.value === 'loop' && loopCount.value > 0 ? loopCount.value : null,
    'jump-ref': endBehaviour.value === 'jump-to' && jumpRef.value ? jumpRef.value : null
  });
  
  if (props.line.annotation !== annotationString) {
    actionController.dispatch({
      type: ACTION_TYPES.UPDATE_LINE,
      payload: {
        lineId: props.line.id,
        updates: { annotation: annotationString }
      }
    });
  }
};

const setStopMode = (mode: StopMode) => {
  stopMode.value = mode;
  if (mode !== 'refs') {
    selectedStopRefs.value = [];
  }
  isStopDropdownOpen.value = false;
};

const toggleStopRef = (refId: string) => {
  stopMode.value = 'refs';
  const index = selectedStopRefs.value.indexOf(refId);
  if (index === -1) {
    selectedStopRefs.value.push(refId);
  } else {
    selectedStopRefs.value.splice(index, 1);
  }
};

watch([volume, balance, panStart, panEnd, isDynamicPan, startTime, endTime, fadeIn, fadeOut, stopMode, selectedStopRefs, selectedChannelId, endBehaviour, loopCount, jumpRef], () => {
  updateAnnotations();
}, { deep: true });

watch(() => props.line.id, () => {
  parseAnnotations();
}, { immediate: true });

const togglePlayback = () => {
  if (!soundCue.value) return;

  if (isPlaying.value) {
    actionController.dispatch({
      type: ACTION_TYPES.STOP_SOUND_CUE,
      payload: { cueId: soundCue.value.id }
    });
  } else {
    const updatedCue: SoundCue = {
      ...soundCue.value,
      volume: volume.value,
      pan: (balance.value < -0.1 ? 'left' : balance.value > 0.1 ? 'right' : 'centre') as any, 
      panStart: isDynamicPan.value ? panStart.value : undefined,
      panEnd: isDynamicPan.value ? panEnd.value : undefined,
      startOffsetSeconds: startTime.value,
      endOffsetSeconds: endTime.value,
      fadeIn: fadeIn.value,
      fadeOut: fadeOut.value,
      channelId: selectedChannelId.value,
      endBehaviour: endBehaviour.value,
      loopCount: loopCount.value,
      jumpRef: jumpRef.value
    };
    
    actionController.dispatch({
      type: ACTION_TYPES.PLAY_SOUND_CUE,
      payload: { 
        cue: updatedCue, 
        lineId: props.line.id,
        overridePan: isDynamicPan.value ? undefined : balance.value 
      }
    });
  }
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

onMounted(() => {
  timeUpdateInterval = window.setInterval(() => {
    if (currentPlayer.value) {
      isPlaying.value = currentPlayer.value.isPlaying;
      currentTime.value = currentPlayer.value.currentTime;
      duration.value = currentPlayer.value.duration;
    } else {
      isPlaying.value = false;
      currentTime.value = 0;
      duration.value = 0;
    }
  }, 100);
});

onBeforeUnmount(() => {
  if (timeUpdateInterval) clearInterval(timeUpdateInterval);
});
</script>

<template>
  <div class="sound-cue-panel">
    <div class="panel-header">
      <span :class="['status-badge', isPlaying ? 'status-playing' : (soundCue ? 'status-loaded' : 'status-idle')]">
        {{ isPlaying ? 'Playing' : (soundCue ? 'Ready' : 'No Audio') }}
      </span>
      <span v-if="soundCue" class="cue-file-info">
        {{ soundCue.name }}
      </span>
      <span v-else class="no-cue-label">
        <AlertCircle :size="14" />
        (No audio file associated)
      </span>
    </div>

    <div class="section-row">
      
      <div class="main-controls">
        <button class="btn btn-primary" @click="togglePlayback" :disabled="!soundCue">
          <component :is="isPlaying ? Square : Play" :size="16" fill="currentColor" style="margin-right: 6px;" />
          {{ isPlaying ? 'Stop' : 'Play Preview' }}
        </button>
      </div>
      <span class="playback-status">
        <span class="time-display">{{ formatTime(currentTime) }}/{{ formatTime(duration) }}</span>
      </span>
    </div>

    <!-- Behaviour & Channel Section -->
    <div class="section-column">
      <div class="input-group">
        <label>Stop Behaviour</label>
        <div class="custom-dropdown">
          <button class="dropdown-toggle" @click="isStopDropdownOpen = !isStopDropdownOpen">
            {{ stopDisplayValue }}
            <ChevronDown :size="14" class="dropdown-arrow" />
          </button>
          <div v-if="isStopDropdownOpen" class="dropdown-menu stopBehaviour">
            <button @click="setStopMode('none')">None</button>
            <button @click="setStopMode('previous')">Stop Previous</button>
            <button @click="setStopMode('all')">Stop All</button>
            <div class="dropdown-divider"></div>
            <div class="dropdown-header">Stop Specific Cues:</div>
            <div v-for="cue in recentSoundCues" :key="cue.ref" class="checkbox-item">
              <input 
                type="checkbox" 
                :id="`stop-ref-${cue.ref}`"
                :value="cue.ref" 
                :checked="selectedStopRefs.includes(cue.ref)"
                @change="toggleStopRef(cue.ref)"
              />
              <label :for="`stop-ref-${cue.ref}`">
                <span class="ref-id">[{{ cue.ref }}]</span> 
                <span class="ref-text">{{ cue.soundDescription }}</span>
              </label>
            </div>
             <div v-if="recentSoundCues.length === 0" class="no-recent-cues">
              No recent sound cues found.
            </div>
          </div>
        </div>
      </div>

      <div class="input-group">
        <label>End Behaviour</label>
        <select v-model="endBehaviour" class="behaviour-select">
          <option value="none">None</option>
          <option value="loop">Loop</option>
          <option value="next-line">Next Line</option>
          <option value="next-cue">Next Cue</option>
          <option value="jump-to">Jump to Reference</option>
        </select>
      </div>

      <div v-if="endBehaviour === 'loop'" class="input-group nested-input">
        <label>Loop Count (0 = infinite)</label>
        <input type="number" v-model.number="loopCount" min="0" step="1" />
      </div>

      <div v-if="endBehaviour === 'jump-to'" class="input-group nested-input">
        <label>Jump to Cue Reference</label>
        <div class="input-row">
          <span class="ref-symbol">#</span>
          <input type="text" v-model="jumpRef" placeholder="e.g. 0005" />
        </div>
      </div>

      <div class="input-group">
        <label>Virtual Channel</label>
        <select v-model="selectedChannelId" class="channel-select">
          <option v-for="ch in availableChannels" :key="ch.id" :value="ch.id">
            {{ ch.name }} {{ ch.id === line.lineSubType ? '(Default)' : '' }}
          </option>
        </select>
      </div>
    </div>

    <div class="section-column">
      <div class="input-group">
        <label>Volume: {{ volume }}%</label>
        <input type="range" min="0" max="100" v-model.number="volume" />
      </div>
      
      <div class="input-group">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label>Balance: {{ balance < 0 ? 'Left' : balance > 0 ? 'Right' : 'Centre' }} ({{ balance.toFixed(1) }})</label>
          <div style="display: flex; align-items: center; gap: 4px;">
            <input type="checkbox" id="dynamic-pan-toggle" v-model="isDynamicPan" />
            <label for="dynamic-pan-toggle" style="margin:0; font-size: 10px; cursor: pointer;">Dynamic Pan</label>
          </div>
        </div>
        <input v-if="!isDynamicPan" type="range" min="-1" max="1" step="0.1" v-model.number="balance" />
        
        <div v-if="isDynamicPan" style="display: flex; gap: 12px; margin-top: 4px;">
          <div class="input-group">
            <label>Start: {{ panStart.toFixed(1) }}</label>
            <input type="range" min="-1" max="1" step="0.1" v-model.number="panStart" />
          </div>
          <div class="input-group">
            <label>End: {{ panEnd.toFixed(1) }}</label>
            <input type="range" min="-1" max="1" step="0.1" v-model.number="panEnd" />
          </div>
        </div>
      </div>
    </div>


    <div class="section-column" :class="{ 'is-disabled': !soundCue }">
      <h4>Waveform & Range</h4>
      <AudioWaveform 
        :player="currentPlayer"
        v-model:startTime="startTime"
        v-model:endTime="endTime"
        v-model:fadeIn="fadeIn"
        v-model:fadeOut="fadeOut"
        :panStart="isDynamicPan ? panStart : balance"
        :panEnd="isDynamicPan ? panEnd : balance"
      />
    </div>

    <div class="section-column grid-controls cropping">
      <div class="input-group">
        <label>Start (s)</label>
        <input type="number" v-model.number="startTime" step="0.1" min="0" :disabled="!soundCue" />
      </div>
      <div class="input-group">
        <label>Fade In (ms)</label>
        <input type="number" v-model.number="fadeIn" step="100" min="0" />
      </div>
      <div class="input-group">
        <label>Fade Out (ms)</label>
        <input type="number" v-model.number="fadeOut" step="100" min="0" />
      </div>
      <div class="input-group">
        <label>End (s)</label>
        <input type="number" v-model.number="endTime" step="0.1" min="0" :disabled="!soundCue" />
      </div>
    </div>

    <div v-if="!soundCue" class="no-cue-warning-footer">
      Association Hint: Use "Load Sounds" in toolbar to match local files by SoundRef.
    </div>
  </div>
</template>

<style scoped>
@import '../css/SoundCuePanel.css';

.behaviour-select {
  width: 100%;
  padding: 6px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  border-radius: 4px;
}

.input-row {
  display: flex;
  align-items: stretch;
}

.ref-symbol {
  padding: 0 8px;
  background: var(--palette-gray-800);
  border: 1px solid var(--color-border);
  border-right: none;
  border-radius: 4px 0 0 4px;
  display: flex;
  align-items: center;
  color: var(--color-text-secondary);
}

.input-row input {
  flex: 1;
  border-radius: 0 4px 4px 0;
}

.nested-input {
  margin-left: 12px;
  padding-left: 12px;
  border-left: 2px solid var(--palette-gray-700);
}
</style>
