<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import type { IAudioPlayer } from '@/types/core';

interface Props {
  player: IAudioPlayer | null;
  startTime: number;
  endTime: number;
  fadeIn: number;
  fadeOut: number;
  panStart?: number; // -1 to 1
  panEnd?: number;   // -1 to 1
}

const props = withDefaults(defineProps<Props>(), {
  panStart: 0,
  panEnd: 0
});

const emit = defineEmits(['update:startTime', 'update:endTime', 'update:fadeIn', 'update:fadeOut']);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const currentTime = ref(0);
const loadingStatus = ref<string>('idle');
const loadingProgress = ref(0);

let timeUpdateInterval: number | null = null;
let resizeObserver: ResizeObserver | null = null;

const drawWaveform = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  
  if (width === 0 || height === 0) return;

  // Clear Background
  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, width, height);

  // Draw Center Line
  ctx.fillStyle = '#333';
  ctx.fillRect(0, height / 2, width, 1);

  if (!props.player) return;
  const buffer = props.player.getBuffer();
  if (!buffer) return;

  try {
    const dataLen = buffer.length;
    const channels = buffer.numberOfChannels;
    
    // Select the best channel (the one with the highest peak)
    let absoluteMax = 0;
    let bestChannel = 0;
    
    for (let c = 0; c < channels; c++) {
        const probeLen = Math.min(dataLen, 100000);
        const probe = new Float32Array(probeLen);
        buffer.copyFromChannel(probe, c, 0);
        
        let channelMax = 0;
        for (let i = 0; i < probeLen; i++) {
            const v = Math.abs(probe[i]);
            if (v > channelMax) channelMax = v;
        }
        
        if (channelMax > absoluteMax) {
            absoluteMax = channelMax;
            bestChannel = c;
        }
    }

    if (absoluteMax === 0) return;

    const data = buffer.getChannelData(bestChannel);

    // Auto-gain boost for quiet files
    const multiplier = (absoluteMax > 0 && absoluteMax < 0.1) ? (0.8 / absoluteMax) : 1.0;

    const step = dataLen / width;
    const amp = height / 2;

    ctx.fillStyle = '#00e5ff'; // Bright Cyan

    for (let i = 0; i < width; i++) {
      const start = Math.floor(i * step);
      const end = Math.floor((i + 1) * step);
      
      let min = 0;
      let max = 0;
      
      const maxSamples = 500;
      const subStep = Math.max(1, Math.ceil((end - start) / maxSamples));

      for (let j = start; j < end; j += subStep) {
        const val = data[j] * multiplier;
        if (val < min) min = val;
        if (val > max) max = val;
      }
      
      const yMin = amp + (Math.max(-1.0, min) * amp * 0.9);
      const yMax = amp + (Math.min(1.0, max) * amp * 0.9);
      
      const barHeight = Math.max(2, yMax - yMin);
      ctx.fillRect(i, yMin, 1, barHeight);
    }
  } catch (err) {
    // Silently fail if drawing fails during a transition
  }
};

const updateCanvasSize = () => {
  if (containerRef.value && canvasRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    if (rect.width > 0) {
      canvasRef.value.width = rect.width;
      canvasRef.value.height = 100;
      drawWaveform();
    }
  }
};

const timeToX = (time: number) => {
  if (!props.player || props.player.duration === 0 || !canvasRef.value) return 0;
  return (time / props.player.duration) * canvasRef.value.width;
};

const xToTime = (x: number) => {
  if (!props.player || props.player.duration === 0 || !canvasRef.value) return 0;
  return (x / canvasRef.value.width) * props.player.duration;
};

// Interaction logic
const isDragging = ref<'start' | 'end' | 'fadeIn' | 'fadeOut' | null>(null);

const onMouseDown = (event: MouseEvent, type: 'start' | 'end' | 'fadeIn' | 'fadeOut') => {
  event.stopPropagation();
  isDragging.value = type;
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
};

const onMouseMove = (event: MouseEvent) => {
  if (!isDragging.value || !containerRef.value || !props.player) return;
  
  const rect = containerRef.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
  const time = xToTime(x);

  if (isDragging.value === 'start') {
    emit('update:startTime', Math.min(time, props.endTime > 0 ? props.endTime : props.player.duration));
  } else if (isDragging.value === 'end') {
    emit('update:endTime', Math.max(time, props.startTime));
  } else if (isDragging.value === 'fadeIn') {
    const fadeInMs = Math.max(0, (time - props.startTime) * 1000);
    emit('update:fadeIn', fadeInMs);
  } else if (isDragging.value === 'fadeOut') {
    const duration = props.endTime > 0 ? props.endTime : props.player.duration;
    const fadeOutMs = Math.max(0, (duration - time) * 1000);
    emit('update:fadeOut', fadeOutMs);
  }
};

const onMouseUp = () => {
  isDragging.value = null;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
};

const progressX = computed(() => timeToX(currentTime.value));
const startX = computed(() => timeToX(props.startTime));
const endX = computed(() => timeToX(props.endTime > 0 ? props.endTime : (props.player?.duration || 0)));
const fadeInX = computed(() => timeToX(props.startTime + (props.fadeIn / 1000)));
const fadeOutX = computed(() => {
    const end = props.endTime > 0 ? props.endTime : (props.player?.duration || 0);
    return timeToX(end - (props.fadeOut / 1000));
});

// Balance mapping: -1 (Left) -> 10px, 0 (Center) -> 50px, 1 (Right) -> 90px
const panToY = (pan: number) => 50 + (pan * 40);
const panStartY = computed(() => panToY(props.panStart));
const panEndY = computed(() => panToY(props.panEnd));

watch(() => props.player, (newPlayer) => {
  if (newPlayer) {
    loadingStatus.value = newPlayer.loadStatus;
    loadingProgress.value = newPlayer.loadProgress;

    newPlayer.onLoadProgress((progress, status) => {
      loadingProgress.value = progress;
      loadingStatus.value = status;
      if (status === 'loaded') {
        setTimeout(drawWaveform, 150); 
      }
    });

    if (newPlayer.isLoaded) {
      drawWaveform();
    }
  } else {
    loadingStatus.value = 'idle';
    loadingProgress.value = 0;
    drawWaveform();
  }
}, { immediate: true });

onMounted(() => {
  updateCanvasSize();
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
        nextTick(updateCanvasSize);
    });
    resizeObserver.observe(containerRef.value);
  }
  timeUpdateInterval = window.setInterval(() => {
    if (props.player) currentTime.value = props.player.currentTime;
  }, 50);
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
  if (timeUpdateInterval) clearInterval(timeUpdateInterval);
});
</script>

<template>
  <div class="audio-waveform-container" ref="containerRef">
    <div v-if="loadingStatus === 'loading'" class="waveform-placeholder">
      <div class="loading-container">
        <span>Downloading... {{ loadingProgress }}%</span>
        <div class="loading-bar-bg"><div class="loading-bar-fill" :style="{ width: loadingProgress + '%' }"></div></div>
      </div>
    </div>
    <div v-else-if="loadingStatus === 'decoding'" class="waveform-placeholder">
      <div class="decoding-container"><span class="pulse">Decoding Audio...</span></div>
    </div>
    <div v-else-if="loadingStatus === 'error'" class="waveform-placeholder error">
      Failed to load audio
    </div>
    <div v-else-if="!player || loadingStatus === 'idle'" class="waveform-placeholder">
      No audio loaded
    </div>
    
    <canvas ref="canvasRef" class="waveform-canvas"></canvas>
    
    <div v-if="player && loadingStatus === 'loaded'" class="waveform-overlay">
      <div class="dimmed-area" :style="{ width: startX + 'px' }"></div>
      <div class="active-area" :style="{ left: startX + 'px', width: Math.max(0, endX - startX) + 'px' }"></div>
      <div class="dimmed-area" :style="{ left: endX + 'px', right: 0 }"></div>

      <div class="handle handle-start" :style="{ left: startX + 'px' }" @mousedown="onMouseDown($event, 'start')">
        <div class="handle-label">S</div>
      </div>
      <div class="handle handle-end" :style="{ left: endX + 'px' }" @mousedown="onMouseDown($event, 'end')">
        <div class="handle-label">E</div>
      </div>

      <svg class="fade-lines" width="100%" height="100%">
        <!-- Fade indicators -->
        <line :x1="startX" y1="100" :x2="fadeInX" y2="0" stroke="rgba(255,255,255,0.6)" stroke-dasharray="4" />
        <line :x1="fadeOutX" y1="0" :x2="endX" y2="100" stroke="rgba(255,255,255,0.6)" stroke-dasharray="4" />
        
        <!-- Balance Path indicator -->
        <line :x1="startX" :y1="panStartY" :x2="endX" :y2="panEndY" stroke="rgba(255, 152, 0, 0.8)" stroke-width="2" stroke-dasharray="2,2" />
        <circle :cx="startX" :cy="panStartY" r="3" fill="rgba(255, 152, 0, 1)" />
        <circle :cx="endX" :cy="panEndY" r="3" fill="rgba(255, 152, 0, 1)" />
        
        <!-- L/R Labels -->
        <text x="5" y="15" fill="rgba(255,255,255,0.3)" font-size="10" font-family="sans-serif">L</text>
        <text x="5" y="95" fill="rgba(255,255,255,0.3)" font-size="10" font-family="sans-serif">R</text>
      </svg>

      <div class="handle handle-fade-in" :style="{ left: fadeInX + 'px' }" @mousedown="onMouseDown($event, 'fadeIn')" title="Fade In"></div>
      <div class="handle handle-fade-out" :style="{ left: fadeOutX + 'px' }" @mousedown="onMouseDown($event, 'fadeOut')" title="Fade Out"></div>

      <div class="playhead" :style="{ left: progressX + 'px' }"></div>
    </div>
  </div>
</template>

<style scoped>
@import '../css/AudioWaveform.css';
</style>
