import { EventBus } from './EventBus';
import { IAudioPlayer, AUDIO_EVENT_TYPES } from '@/types/core';
import { AudioPlayer } from './AudioPlayer';

export class AudioPlaybackManager {
  private audioContext: AudioContext;
  private audioPlayers: Map<string, IAudioPlayer> = new Map();
  private activePlayers: Map<string, IAudioPlayer> = new Map();
  private eventBus: EventBus;
  private currentOutputDeviceId: string = 'default';
  private masterGainNode: GainNode;
  private _globalVolume = 1.0;
  private _isMuted = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    // @ts-ignore - webkitAudioContext for older browsers if needed, though ScriptFollower targets modern
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);

    navigator.mediaDevices.addEventListener('devicechange', this.onMediaDeviceChange.bind(this));
  }

  private async onMediaDeviceChange() {
    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_DEVICES_UPDATED, timestamp: new Date() });
  }

  getPlayer(id: string, url: string): IAudioPlayer {
    let player = this.audioPlayers.get(id);
    
    // If player exists but URL is different, destroy it and create a new one
    if (player && player.url !== url) {
      player.destroy();
      this.audioPlayers.delete(id);
      this.activePlayers.delete(id);
      player = undefined;
    }

    if (!player) {
      player = new AudioPlayer(id, url, this.audioContext);
      
      this.audioPlayers.set(id, player);

      player.onPlay(() => {
        this.activePlayers.set(id, player!);
        this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_PLAYING, payload: { playerId: id, url }, timestamp: new Date() });
      });

      player.onStop(() => {
        this.activePlayers.delete(id);
        this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_STOPPED, payload: { playerId: id, url }, timestamp: new Date() });
      });

      player.onEnded(() => {
        this.activePlayers.delete(id);
        this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_STOPPED, payload: { playerId: id, url }, timestamp: new Date() });
      });

      player.onError((error) => {
        this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_ERROR, payload: { playerId: id, url, error: error.message }, timestamp: new Date() });
      });
    }
    return player;
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

  getGlobalVolume(): number { return this._globalVolume; }

  setGlobalVolume(volume: number): void {
    this._globalVolume = Math.max(0, Math.min(volume, 1));
    if (!this._isMuted) {
      this.masterGainNode.gain.setTargetAtTime(this._globalVolume, this.audioContext.currentTime, 0.01);
    }
    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_GLOBAL_VOLUME_CHANGED, payload: { volume: this._globalVolume }, timestamp: new Date() });
  }

  getGlobalMute(): boolean { return this._isMuted; }

  setGlobalMute(muted: boolean): void {
    this._isMuted = muted;
    const targetVolume = muted ? 0 : this._globalVolume;
    this.masterGainNode.gain.setTargetAtTime(targetVolume, this.audioContext.currentTime, 0.01);
    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_GLOBAL_MUTE_CHANGED, payload: { muted: this._isMuted }, timestamp: new Date() });
  }

  async getAvailableOutputDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audiooutput');
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    // @ts-ignore - setSinkId is still experimental but widely supported in Chromium
    if (typeof this.audioContext.setSinkId === 'function') {
      // @ts-ignore
      await this.audioContext.setSinkId(deviceId);
      this.currentOutputDeviceId = deviceId;
      this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_DEVICE_CHANGED, payload: { deviceId }, timestamp: new Date() });
    } else {
      throw new Error('setSinkId is not supported in this browser.');
    }
  }

  getCurrentOutputDeviceId(): string {
    return this.currentOutputDeviceId;
  }

  getCurrentlyPlayingPlayers(): IAudioPlayer[] {
    return Array.from(this.activePlayers.values());
  }

  destroy(): void {
    this.stopAll();
    this.audioPlayers.forEach(player => player.destroy());
    this.audioPlayers.clear();
    this.audioContext.close();
    navigator.mediaDevices.removeEventListener('devicechange', this.onMediaDeviceChange);
  }
}
