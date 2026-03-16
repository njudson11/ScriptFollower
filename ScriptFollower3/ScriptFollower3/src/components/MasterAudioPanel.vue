<script setup lang="ts">
import { ref, inject, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import type { AudioPlaybackManager } from '@/core/AudioPlaybackManager';
import type { IAudioPlayer, IVirtualChannel, IAudioOutputDevice } from '@/types/core';
import type { AppStore } from '@/store/AppStore';
import { EventBus } from '@/core/EventBus';
import { AUDIO_EVENT_TYPES } from '@/types/core';
import { AppConfig } from '@/config/AppConfig';
import AudioWaveform from './AudioWaveform.vue';
import { VolumeX, Volume2, RefreshCw, Info, X, Square, Plus } from 'lucide-vue-next';

const audioPlaybackManager = inject('audioPlaybackManager') as AudioPlaybackManager;
const appStore = inject('appStore') as AppStore;
const eventBus = inject('eventBus') as EventBus;

// Detect multi-device support from manager
const isMultiDeviceSupported = audioPlaybackManager.isMultiDeviceSupported;

// Ad-hoc Audio State
const audioUrl = ref('/audio-proxy/examples/mp3/SoundHelix-Song-1.mp3');
const fileInput = ref<HTMLInputElement | null>(null);
const adhocVolume = ref(0.8);
const adhocBalance = ref(0);
const adhocStartTime = ref(0);
const adhocEndTime = ref(0);
const adhocFadeIn = ref(0);
const adhocFadeOut = ref(0);
const selectedChannelId = ref(AppConfig.audio.baseChannelId);

const adhocPlayer = ref<IAudioPlayer | null>(null);
const loadedFileName = ref<string>('');
const isAdhocPlaying = ref(false);
const isAdhocLoaded = ref(false);
const adhocDuration = ref(0);
const adhocCurrentTime = ref(0);
const errorMessage = ref('');
const adhocLoadProgress = ref(0);
const adhocLoadStatus = ref<string>('idle');

// Global Controls State
const masterVolume = computed({
  get: () => audioPlaybackManager.getGlobalVolume(),
  set: (val) => audioPlaybackManager.setGlobalVolume(val)
});

const isMuted = ref(audioPlaybackManager.getGlobalMute());
const toggleMasterMute = () => {
  isMuted.value = !isMuted.value;
  audioPlaybackManager.setGlobalMute(isMuted.value);
};

const currentOutputDeviceId = computed({
  get: () => audioPlaybackManager.getCurrentOutputDeviceId(),
  set: (val) => audioPlaybackManager.setOutputDevice(val)
});

const availableDevices = ref<IAudioOutputDevice[]>([]);
const hasLabels = computed(() => {
    return availableDevices.value.some(d => d.label && !d.label.startsWith('Output Device'));
});

const refreshDevices = async () => {
    availableDevices.value = await audioPlaybackManager.getAvailableOutputDevices();
};

const requestLabels = async () => {
    const success = await audioPlaybackManager.requestPermissions();
    if (success) {
        await refreshDevices();
    }
};

// Channels State - Use reactive binding to store
const virtualChannels = computed(() => appStore.state.virtualChannels);

// Currently Playing State
const activePlayers = ref<IAudioPlayer[]>([]);
let stateUpdateInterval: number | null = null;
let unregisterDeviceUpdate: (() => void) | null = null;

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// --- Ad-hoc Methods ---

const handleAdhocLoad = async () => {
  try {
    errorMessage.value = '';
    isAdhocLoaded.value = false;
    
    if (!audioUrl.value.startsWith('blob:') && !loadedFileName.value) {
        loadedFileName.value = audioUrl.value.split('/').pop() || 'Remote Stream';
    }

    const id = 'adhoc-test-player';
    const player = audioPlaybackManager.getPlayer(id, audioUrl.value, selectedChannelId.value);
    
    player.onLoadProgress((progress, status) => {
      adhocLoadProgress.value = progress;
      adhocLoadStatus.value = status;
    });

    player.onPlay(() => isAdhocPlaying.value = true);
    player.onPause(() => isAdhocPlaying.value = false);
    player.onStop(() => isAdhocPlaying.value = false);
    player.onEnded(() => isAdhocPlaying.value = false);
    player.onError((err) => {
        errorMessage.value = err.message;
        adhocLoadStatus.value = 'error';
    });

    await player.load();
    
    adhocPlayer.value = player;
    isAdhocLoaded.value = true;
    adhocDuration.value = player.duration;
    
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : String(err);
    adhocLoadStatus.value = 'error';
  }
};

const handleAdhocPlay = async () => {
  if (!adhocPlayer.value) await handleAdhocLoad();
  if (adhocPlayer.value) {
    adhocPlayer.value.volume = adhocVolume.value;
    adhocPlayer.value.balance = adhocBalance.value;
    
    const start = adhocStartTime.value > 0 ? adhocStartTime.value : undefined;
    const end = adhocEndTime.value > 0 ? adhocEndTime.value : undefined;
    
    await adhocPlayer.value.play({
      startTimeSeconds: start,
      endTimeSeconds: end,
      fadeInDurationMs: adhocFadeIn.value,
      fadeOutDurationMs: adhocFadeOut.value
    });
  }
};

const handleAdhocStop = () => {
  adhocPlayer.value?.stop();
};

const handleAdhocClear = () => {
    handleAdhocStop();
    adhocPlayer.value = null;
    isAdhocLoaded.value = false;
    adhocLoadStatus.value = 'idle';
    adhocLoadProgress.value = 0;
    adhocDuration.value = 0;
    adhocCurrentTime.value = 0;
    audioUrl.value = '';
    loadedFileName.value = '';
    errorMessage.value = '';
};

// --- Channel Methods ---

const addChannel = () => {
  const currentCount = virtualChannels.value.length;
  const charCode = 65 + currentCount; 
  const channelLetter = String.fromCharCode(charCode);
  
  const id = channelLetter;
  appStore.addVirtualChannel({
    id,
    name: `Channel ${channelLetter}`,
    volume: 0.8,
    isMuted: false,
    outputDeviceId: 'default'
  });
};

const removeChannel = (id: string) => {
  if (id === AppConfig.audio.baseChannelId && virtualChannels.value.length === 1) return;
  appStore.removeVirtualChannel(id);
};

const updateChannelVolume = (id: string, volume: number) => {
  appStore.updateVirtualChannel(id, { volume });
  audioPlaybackManager.setChannelVolume(id, volume);
};

const updateChannelOutputDevice = (id: string, deviceId: string) => {
  appStore.updateVirtualChannel(id, { outputDeviceId: deviceId });
  audioPlaybackManager.setChannelDevice(id, deviceId);
};

const toggleChannelMute = (id: string) => {
  const channel = virtualChannels.value.find(c => c.id === id);
  if (channel) {
    const newMuted = !channel.isMuted;
    appStore.updateVirtualChannel(id, { isMuted: newMuted });
    audioPlaybackManager.setChannelVolume(id, newMuted ? 0 : channel.volume);
  }
};

const getChannelName = (channelId?: string) => {
  if (!channelId) return 'Unknown';
  return virtualChannels.value.find(c => c.id === channelId)?.name || channelId;
};

const getPlayerLabel = (player: IAudioPlayer) => {
  if (player.id === 'adhoc-test-player') return loadedFileName.value || 'Ad-hoc';
  
  const lineId = player.id.replace('cue_', '');
  const line = appStore.getLineById(lineId);
  return line?.metadata?.soundRef || player.id;
};

const getPlayerProgress = (player: IAudioPlayer) => {
  if (player.duration <= 0) return 0;
  return Math.min(100, (player.currentTime / player.duration) * 100);
};

const stopPlayer = (playerId: string) => {
  audioPlaybackManager.stopCues([playerId]);
};

// --- Initial Load ---

onMounted(async () => {
  await refreshDevices();
  
  unregisterDeviceUpdate = eventBus.subscribe(AUDIO_EVENT_TYPES.AUDIO_DEVICES_UPDATED, async () => {
      await refreshDevices();
  });

  // Ensure AudioPlaybackManager is aware of initial channel device mappings
  if (isMultiDeviceSupported) {
    virtualChannels.value.forEach(ch => {
        audioPlaybackManager.setChannelDevice(ch.id, ch.outputDeviceId);
    });
  }

  stateUpdateInterval = window.setInterval(() => {
    if (adhocPlayer.value) {
      adhocCurrentTime.value = adhocPlayer.value.currentTime;
    }
    activePlayers.value = audioPlaybackManager.getCurrentlyPlayingPlayers();
  }, AppConfig.audio.refreshIntervalMs);
});

onBeforeUnmount(() => {
  if (stateUpdateInterval) clearInterval(stateUpdateInterval);
  if (unregisterDeviceUpdate) unregisterDeviceUpdate();
});
</script>

<template>
  <div class="master-audio-panel">
    
    <!-- Master Bus (Global Controls) -->
    <div class="section master-controls">
      <div class="section-header">
        <h3>Master Bus</h3>
        <button v-if="!hasLabels" class="btn btn-small btn-warn" @click="requestLabels" title="Allow microphone access to see device names">
          Enable Device Names
        </button>
      </div>
      <div class="master-main">
        <div class="volume-slider-container">
          <label>Global Volume: {{ Math.round(masterVolume * 100) }}%</label>
          <div class="slider-row">
            <button class="btn btn-icon" @click="toggleMasterMute" :title="isMuted ? 'Unmute' : 'Mute'">
              <component :is="isMuted ? VolumeX : Volume2" :size="20" />
            </button>
            <input type="range" min="0" max="1" step="0.01" v-model="masterVolume" />
          </div>
        </div>
        
        <div class="input-group">
          <label>Global Default Output</label>
          <div class="input-row">
            <select v-model="currentOutputDeviceId" class="device-select">
                <option value="default">System Default</option>
                <option v-for="device in availableDevices" :key="device.deviceId" :value="device.deviceId">
                {{ device.label }}
                </option>
            </select>
            <button class="btn btn-icon" @click="refreshDevices" title="Refresh list">
              <RefreshCw :size="16" />
            </button>
          </div>
          
          <!-- Informative message about browser limitations -->
          <div v-if="!isMultiDeviceSupported" class="limitation-box">
            <span class="info-icon"><Info :size="16" /></span>
            <p>Your browser supports output to one device at a time. Multi-device routing will be available in the desktop app.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Virtual Mixing Desk -->
    <div class="section virtual-channels">
      <div class="section-header">
        <h3>Mixing Desk</h3>
        <button class="btn btn-small btn-primary" @click="addChannel">
          <Plus :size="14" style="margin-right: 4px;" /> Add Channel
        </button>
      </div>
      
      <div class="channels-grid">
        <div v-for="channel in virtualChannels" :key="channel.id" class="channel-strip">
          <div class="channel-header">
            <span class="channel-name">{{ channel.name }}</span>
            <button v-if="channel.id !== AppConfig.audio.baseChannelId" class="btn-remove" @click="removeChannel(channel.id)">
              <X :size="14" />
            </button>
          </div>
          
          <div v-if="isMultiDeviceSupported" class="channel-device-mapping">
            <select 
              :value="channel.outputDeviceId" 
              @change="e => updateChannelOutputDevice(channel.id, (e.target as HTMLSelectElement).value)"
              class="device-select-mini"
              title="Target hardware device"
            >
              <option value="default">Default</option>
              <option v-for="device in availableDevices" :key="device.deviceId" :value="device.deviceId">
                {{ device.label }}
              </option>
            </select>
          </div>

          <div class="fader-container">
            <input 
              type="range" 
              orient="vertical" 
              min="0" max="1" step="0.01" 
              :value="channel.isMuted ? 0 : channel.volume" 
              @input="e => updateChannelVolume(channel.id, parseFloat((e.target as HTMLInputElement).value))" 
            />
          </div>
          <button 
            class="btn btn-small mute-btn" 
            :class="{ active: channel.isMuted }"
            @click="toggleChannelMute(channel.id)"
          >
            MUTE
          </button>
        </div>
      </div>
    </div>

    <!-- Currently Playing Sounds -->
    <div class="section playing-sounds">
      <h3>Now Playing</h3>
      <div v-if="activePlayers.length === 0" class="empty-state-mini">
        No active playback
      </div>
      <div v-else class="active-players-list">
        <div v-for="player in activePlayers" :key="player.id" class="active-player-item">
          <div class="player-info">
            <span class="player-name" :title="player.url">{{ getPlayerLabel(player) }}</span>
            <span class="player-channel">{{ getChannelName(player.channelId) }}</span>
          </div>
          <div class="player-progress-container">
            <div class="player-progress-bar">
              <div class="progress-fill" :style="{ width: getPlayerProgress(player) + '%' }"></div>
            </div>
            <span class="time-display">{{ formatTime(player.currentTime) }}</span>
            <button class="btn btn-mini" @click="stopPlayer(player.id)" title="Stop">
              <Square :size="10" fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Ad-hoc Playback -->
    <div class="section adhoc-playback">
      <h3>Ad-hoc Playback</h3>
      
      <div class="input-group">
        <label>Route to Channel</label>
        <select v-model="selectedChannelId" class="device-select">
          <option v-for="ch in virtualChannels" :key="ch.id" :value="ch.id">{{ ch.name }}</option>
        </select>
      </div>

      <div class="input-group">
        <div class="input-row">
          <input type="text" v-model="audioUrl" placeholder="URL or choose local file..." />
          <button class="btn" @click="handleAdhocLoad" :disabled="!audioUrl">Load</button>
        </div>
      </div>

      <AudioWaveform 
        :player="adhocPlayer"
        v-model:startTime="adhocStartTime"
        v-model:endTime="adhocEndTime"
        v-model:fadeIn="adhocFadeIn"
        v-model:fadeOut="adhocFadeOut"
        :panStart="adhocBalance"
        :panEnd="adhocBalance"
      />
    </div>

  </div>
</template>

<style scoped>
@import '../css/MasterAudioPanel.css';
</style>
