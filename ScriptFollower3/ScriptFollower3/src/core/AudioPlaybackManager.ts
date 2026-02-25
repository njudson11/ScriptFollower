import { ref, reactive } from 'vue';
import { EventBus } from './EventBus';
import { IAudioPlayer, AUDIO_EVENT_TYPES, IAudioOutputDevice } from '@/types/core';
import { AudioPlayer } from './AudioPlayer';

export class AudioPlaybackManager {
  private audioContext: AudioContext;
  private audioPlayers: Map<string, IAudioPlayer> = new Map();
  private activePlayers: Map<string, IAudioPlayer> = new Map();
  private channelGainNodes: Map<string, GainNode> = new Map();
  private eventBus: EventBus;
  private currentOutputDeviceId = ref('default');
  private masterGainNode: GainNode;
  
  // Use refs for reactive state
  private _globalVolume = ref(1.0);
  private _isMuted = ref(false);

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    // @ts-ignore
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);

    // Initialize default channel
    this.getChannelGainNode('default');

    navigator.mediaDevices.addEventListener('devicechange', this.onMediaDeviceChange.bind(this));
  }

  private async onMediaDeviceChange() {
    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_DEVICES_UPDATED, timestamp: new Date() });
  }

  private getChannelGainNode(channelId: string): GainNode {
    let gainNode = this.channelGainNodes.get(channelId);
    if (!gainNode) {
      gainNode = this.audioContext.createGain();
      gainNode.connect(this.masterGainNode);
      this.channelGainNodes.set(channelId, gainNode);
    }
    return gainNode;
  }

  getPlayer(id: string, url: string, channelId: string = 'default'): IAudioPlayer {
    let player = this.audioPlayers.get(id);
    
    if (player && (player.url !== url || player.channelId !== channelId)) {
      player.destroy();
      this.audioPlayers.delete(id);
      this.activePlayers.delete(id);
      player = undefined;
    }

    if (!player) {
      const channelGain = this.getChannelGainNode(channelId);
      player = new AudioPlayer(id, url, this.audioContext, channelGain, channelId);
      
      this.audioPlayers.set(id, player);

      player.onPlay(() => {
        this.activePlayers.set(id, player!);
        this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_PLAYING, payload: { playerId: id, url, channelId }, timestamp: new Date() });
      });

      player.onStop(() => {
        this.activePlayers.delete(id);
        this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_STOPPED, payload: { playerId: id, url, channelId }, timestamp: new Date() });
      });

      player.onEnded(() => {
        this.activePlayers.delete(id);
        this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_STOPPED, payload: { playerId: id, url, channelId }, timestamp: new Date() });
      });

      player.onError((error) => {
        this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_ERROR, payload: { playerId: id, url, error: error.message }, timestamp: new Date() });
      });
    }
    return player;
  }

  setChannelVolume(channelId: string, volume: number): void {
    const gainNode = this.channelGainNodes.get(channelId);
    if (gainNode) {
      gainNode.gain.setTargetAtTime(Math.max(0, Math.min(volume, 1)), this.audioContext.currentTime, 0.01);
    }
  }

  async preloadAll(urls: string[]): Promise<void[]> {
    const promises = urls.map(url => {
      const player = this.getPlayer(`preload_${url}`, url);
      return player.load();
    });
    return Promise.all(promises);
  }

  stopAll(): void {
    this.activePlayers.forEach(player => player.stop());
    this.activePlayers.clear();
    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_STOPPED, payload: { all: true }, timestamp: new Date() });
  }

  stopCues(cueIds: string[]): void {
    cueIds.forEach(id => {
      const player = this.activePlayers.get(id);
      if (player) player.stop();
    });
  }

  pauseAll(): void {
    this.activePlayers.forEach(player => player.pause());
    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_ALL_PAUSED, timestamp: new Date() });
  }

  resumeAll(): void {
    this.activePlayers.forEach(player => player.play());
    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_ALL_RESUMED, timestamp: new Date() });
  }

  getGlobalVolume(): number { return this._globalVolume.value; }

  setGlobalVolume(volume: number): void {
    this._globalVolume.value = Math.max(0, Math.min(volume, 1));
    if (!this._isMuted.value) {
      this.masterGainNode.gain.setTargetAtTime(this._globalVolume.value, this.audioContext.currentTime, 0.01);
    }
    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_GLOBAL_VOLUME_CHANGED, payload: { volume: this._globalVolume.value }, timestamp: new Date() });
  }

  getGlobalMute(): boolean { return this._isMuted.value; }

  setGlobalMute(muted: boolean): void {
    this._isMuted.value = muted;
    const targetVolume = muted ? 0 : this._globalVolume.value;
    this.masterGainNode.gain.setTargetAtTime(targetVolume, this.audioContext.currentTime, 0.01);
    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_GLOBAL_MUTE_CHANGED, payload: { muted: this._isMuted.value }, timestamp: new Date() });
  }

  async getAvailableOutputDevices(): Promise<IAudioOutputDevice[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'audiooutput')
      .map(device => ({ deviceId: device.deviceId, label: device.label || `Output Device ${device.deviceId.substring(0, 5)}...` }));
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    // @ts-ignore
    if (typeof this.audioContext.setSinkId === 'function') {
      // @ts-ignore
      await this.audioContext.setSinkId(deviceId);
      this.currentOutputDeviceId.value = deviceId;
      this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_DEVICE_CHANGED, payload: { deviceId }, timestamp: new Date() });
    } else {
      throw new Error('setSinkId is not supported in this browser.');
    }
  }

  getCurrentOutputDeviceId(): string {
    return this.currentOutputDeviceId.value;
  }

  getCurrentlyPlayingPlayers(): IAudioPlayer[] {
    return Array.from(this.activePlayers.values());
  }

  destroyPlayers(playerIds: string[]): void {
    playerIds.forEach(id => {
      const player = this.audioPlayers.get(id);
      if (player) {
        player.destroy();
        this.audioPlayers.delete(id);
        this.activePlayers.delete(id);
      }
    });
  }

  destroy(): void {
    this.stopAll();
    this.audioPlayers.forEach(player => player.destroy());
    this.audioPlayers.clear();
    this.channelGainNodes.forEach(node => node.disconnect());
    this.channelGainNodes.clear();
    this.audioContext.close();
    navigator.mediaDevices.removeEventListener('devicechange', this.onMediaDeviceChange);
  }
}
