<script setup lang="ts">
import { ref, inject, onMounted, onBeforeUnmount, computed } from 'vue';
import type { AudioPlaybackManager } from '@/core/AudioPlaybackManager';
import type { IAudioPlayer } from '@/types/core';
import { EventBus } from '@/core/EventBus';
import AudioWaveform from './AudioWaveform.vue';

const audioPlaybackManager = inject('audioPlaybackManager') as AudioPlaybackManager;
const eventBus = inject('eventBus') as EventBus;

const audioUrl = ref('/audio-proxy/examples/mp3/SoundHelix-Song-1.mp3');
const fileInput = ref<HTMLInputElement | null>(null);
const volume = ref(0.8);
const balance = ref(0);
const startTime = ref(0);
const endTime = ref(0);
const fadeIn = ref(0);
const fadeOut = ref(0);

const currentPlayer = ref<IAudioPlayer | null>(null);
const loadedFileName = ref<string>('');
const isPlaying = ref(false);
const isLoaded = ref(false);
const duration = ref(0);
const currentTime = ref(0);
const errorMessage = ref('');
const loadProgress = ref(0);
const loadStatus = ref<string>('idle');

let timeUpdateInterval: number | null = null;

const statusClass = computed(() => {
  if (isPlaying.value) return 'status-playing';
  if (loadStatus.value === 'loading' || loadStatus.value === 'decoding') return 'status-idle';
  if (isLoaded.value) return 'status-loaded';
  return 'status-idle';
});

const statusText = computed(() => {
  if (isPlaying.value) return 'Playing';
  if (loadStatus.value === 'loading') return `Loading (${loadProgress.value}%)`;
  if (loadStatus.value === 'decoding') return 'Decoding...';
  if (isLoaded.value) return 'Loaded';
  return 'Idle';
});

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const handleLoad = async () => {
  try {
    errorMessage.value = '';
    isLoaded.value = false;
    
    // If it's a URL and not a blob, try to extract filename
    if (!audioUrl.value.startsWith('blob:') && !loadedFileName.value) {
        loadedFileName.value = audioUrl.value.split('/').pop() || 'Remote Stream';
    }

    const id = 'test-player';
    const player = audioPlaybackManager.getPlayer(id, audioUrl.value);
    
    player.onLoadProgress((progress, status) => {
      loadProgress.value = progress;
      loadStatus.value = status;
    });

    player.onPlay(() => isPlaying.value = true);
    player.onPause(() => isPlaying.value = false);
    player.onStop(() => isPlaying.value = false);
    player.onEnded(() => isPlaying.value = false);
    player.onError((err) => {
        errorMessage.value = err.message;
        loadStatus.value = 'error';
    });

    await player.load();
    
    currentPlayer.value = player;
    isLoaded.value = true;
    duration.value = player.duration;
    
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err);
    loadStatus.value = 'error';
  }
};

const triggerFileSelect = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    loadedFileName.value = file.name;
    const objectUrl = URL.createObjectURL(file);
    audioUrl.value = objectUrl;
    handleLoad();
  }
};

const handlePlay = async () => {
  if (!currentPlayer.value) await handleLoad();
  if (currentPlayer.value) {
    currentPlayer.value.volume = volume.value;
    currentPlayer.value.balance = balance.value;
    
    const start = startTime.value > 0 ? startTime.value : undefined;
    const end = endTime.value > 0 ? endTime.value : undefined;
    
    await currentPlayer.value.play(start, end, fadeIn.value, fadeOut.value);
  }
};

const handlePause = () => {
  currentPlayer.value?.pause();
};

const handleStop = () => {
  currentPlayer.value?.stop();
};

const handleClear = () => {
    handleStop();
    currentPlayer.value = null;
    isLoaded.value = false;
    loadStatus.value = 'idle';
    loadProgress.value = 0;
    duration.value = 0;
    currentTime.value = 0;
    audioUrl.value = '';
    loadedFileName.value = '';
    errorMessage.value = '';
};

const updateProperties = () => {
  if (currentPlayer.value) {
    currentPlayer.value.volume = volume.value;
    currentPlayer.value.balance = balance.value;
  }
};

onMounted(() => {
  timeUpdateInterval = window.setInterval(() => {
    if (currentPlayer.value) {
      currentTime.value = currentPlayer.value.currentTime;
    }
  }, 100);
});

onBeforeUnmount(() => {
  if (timeUpdateInterval) clearInterval(timeUpdateInterval);
  currentPlayer.value?.stop();
});
</script>

<template>
  <div class="audio-test-panel">
    <div class="section">
      <h3>Audio Source</h3>
      
      <div class="input-group">
        <label>Load from URL</label>
        <div class="input-row">
          <input type="text" v-model="audioUrl" placeholder="https://..." />
          <button class="btn" @click="handleLoad" :disabled="!audioUrl">Load URL</button>
        </div>
      </div>

      <div class="divider-text">OR</div>

      <div class="input-group">
        <label>Load Local File</label>
        <input 
          type="file" 
          ref="fileInput" 
          accept="audio/*" 
          style="display: none;" 
          @change="handleFileChange" 
        />
        <button class="btn btn-primary" @click="triggerFileSelect">
          Choose Audio File...
        </button>
      </div>

      <div v-if="errorMessage" class="error-msg">
          <strong>Error:</strong> {{ errorMessage }}
          <p style="font-size: 10px; margin-top: 4px; opacity: 0.8;">Check console for technical details.</p>
      </div>
    </div>

    <div class="section">
      <div class="playback-info">
        <span :class="['status-badge', statusClass]">{{ statusText }}</span>
        <span>{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
      </div>

      <div v-if="loadedFileName" class="loaded-filename" :title="loadedFileName">
        File: {{ loadedFileName }}
      </div>
      
      <div class="controls">
        <button class="btn btn-primary" @click="handlePlay" :disabled="isPlaying || !isLoaded">Play</button>
        <button class="btn" @click="handlePause" :disabled="!isPlaying">Pause</button>
        <button class="btn" @click="handleStop" :disabled="!isLoaded">Stop</button>
        <button class="btn" @click="handleClear">Clear</button>
      </div>
    </div>

    <div class="section">
      <h3>Properties</h3>
      <div class="input-group">
        <label>Volume: {{ Math.round(volume * 100) }}%</label>
        <input type="range" min="0" max="1" step="0.01" v-model="volume" @input="updateProperties" />
      </div>
      <div class="input-group">
        <label>Balance: {{ balance < 0 ? 'Left' : balance > 0 ? 'Right' : 'Center' }} ({{ balance }})</label>
        <input type="range" min="-1" max="1" step="0.1" v-model="balance" @input="updateProperties" />
      </div>
    </div>

    <div class="section">
      <h3>Waveform & Range</h3>
      <AudioWaveform 
        :player="currentPlayer"
        v-model:startTime="startTime"
        v-model:endTime="endTime"
        v-model:fadeIn="fadeIn"
        v-model:fadeOut="fadeOut"
      />
    </div>

    <div class="section">
      <h3>Segments & Fades</h3>
      <div class="controls">
        <div class="input-group">
          <label>Start (sec)</label>
          <input type="number" v-model.number="startTime" min="0" step="0.1" />
        </div>
        <div class="input-group">
          <label>End (sec)</label>
          <input type="number" v-model.number="endTime" min="0" step="0.1" />
        </div>
        <div class="input-group">
          <label>Fade In (ms)</label>
          <input type="number" v-model.number="fadeIn" min="0" step="100" />
        </div>
        <div class="input-group">
          <label>Fade Out (ms)</label>
          <input type="number" v-model.number="fadeOut" min="0" step="100" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/AudioTestPanel.css';
</style>
