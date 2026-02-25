import { ref, reactive } from 'vue';
import { EventBus } from './EventBus';
import { IAudioPlayer, AUDIO_EVENT_TYPES, IAudioOutputDevice } from '@/types/core';
import { AudioPlayer } from './AudioPlayer';

/**
 * Enhanced AudioPlaybackManager supporting multi-device output via multiple AudioContexts.
 */
export class AudioPlaybackManager {
  // Map of deviceId -> { context, masterGain, channelGains: Map<channelId, GainNode> }
  private deviceContexts: Map<string, { 
    context: AudioContext, 
    masterGain: GainNode,
    channelGains: Map<string, GainNode>
  }> = new Map();

  private audioPlayers: Map<string, IAudioPlayer> = new Map();
  private activePlayers: Map<string, IAudioPlayer> = new Map();
  private eventBus: EventBus;
  private globalOutputDeviceId = ref('default');
  
  // Reactive state for global settings
  private _globalVolume = ref(1.0);
  private _isMuted = ref(false);

  // Store for channel-to-device mapping
  private channelDeviceMap: Map<string, string> = new Map();

  /**
   * Check if the current browser environment supports independent output device routing.
   * This requires the 'setSinkId' API on AudioContext.
   */
  public readonly isMultiDeviceSupported = typeof (window.AudioContext || (window as any).webkitAudioContext).prototype.setSinkId === 'function';

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    
    // Initialize default context
    this.getOrCreateDeviceContext('default');

    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener('devicechange', this.onMediaDeviceChange.bind(this));
    }
  }

  private async onMediaDeviceChange() {
    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_DEVICES_UPDATED, timestamp: new Date() });
  }

  private getOrCreateDeviceContext(deviceId: string) {
    let devCtx = this.deviceContexts.get(deviceId);
    
    if (!devCtx) {
      // @ts-ignore
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const masterGain = context.createGain();
      masterGain.connect(context.destination);
      
      const targetVol = this._isMuted.value ? 0 : this._globalVolume.value;
      masterGain.gain.setValueAtTime(targetVol, context.currentTime);

      // Attempt to route to specific hardware if supported
      if (deviceId !== 'default' && typeof context.setSinkId === 'function') {
          context.setSinkId(deviceId).catch(err => {
              console.warn(`[AudioPlaybackManager] Failed to set hardware sink ${deviceId}. Routing to default.`, err);
          });
      }

      devCtx = {
        context,
        masterGain,
        channelGains: new Map()
      };
      this.deviceContexts.set(deviceId, devCtx);
    }
    
    return devCtx;
  }

  private getDeviceContextForChannel(channelId: string) {
      // If multi-device isn't supported, always use the default context/global device
      if (!this.isMultiDeviceSupported) {
          return this.getOrCreateDeviceContext('default');
      }

      const deviceId = this.channelDeviceMap.get(channelId) || this.globalOutputDeviceId.value;
      return this.getOrCreateDeviceContext(deviceId);
  }

  private getChannelGainNode(channelId: string): GainNode {
    const devCtx = this.getDeviceContextForChannel(channelId);
    
    let gainNode = devCtx.channelGains.get(channelId);
    if (!gainNode) {
      gainNode = devCtx.context.createGain();
      gainNode.connect(devCtx.masterGain);
      devCtx.channelGains.set(channelId, gainNode);
    }
    return gainNode;
  }

  setChannelDevice(channelId: string, deviceId: string): void {
      if (!this.isMultiDeviceSupported) return;

      const oldDeviceId = this.channelDeviceMap.get(channelId);
      if (oldDeviceId === deviceId) return;

      this.channelDeviceMap.set(channelId, deviceId);
  }

  getPlayer(id: string, url: string, channelId: string = 'A'): IAudioPlayer {
    let player = this.audioPlayers.get(id);
    const targetDevCtx = this.getDeviceContextForChannel(channelId);
    
    // Check if context migration is needed (e.g. device changed)
    const currentContext = (player as any)?.audioContext;
    const contextMismatch = currentContext && currentContext !== targetDevCtx.context;

    if (player && (player.url !== url || player.channelId !== channelId || contextMismatch)) {
      player.destroy();
      this.audioPlayers.delete(id);
      this.activePlayers.delete(id);
      player = undefined;
    }

    if (!player) {
      const channelGain = this.getChannelGainNode(channelId);
      player = new AudioPlayer(id, url, targetDevCtx.context, channelGain, channelId);
      
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
    const devCtx = this.getDeviceContextForChannel(channelId);
    const gainNode = devCtx.channelGains.get(channelId);
    if (gainNode) {
      gainNode.gain.setTargetAtTime(Math.max(0, Math.min(volume, 1)), devCtx.context.currentTime, 0.01);
    }
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
    const targetVol = this._isMuted.value ? 0 : this._globalVolume.value;
    
    this.deviceContexts.forEach(devCtx => {
        devCtx.masterGain.gain.setTargetAtTime(targetVol, devCtx.context.currentTime, 0.01);
    });

    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_GLOBAL_VOLUME_CHANGED, payload: { volume: this._globalVolume.value }, timestamp: new Date() });
  }

  getGlobalMute(): boolean { return this._isMuted.value; }

  setGlobalMute(muted: boolean): void {
    this._isMuted.value = muted;
    const targetVol = muted ? 0 : this._globalVolume.value;

    this.deviceContexts.forEach(devCtx => {
        devCtx.masterGain.gain.setTargetAtTime(targetVol, devCtx.context.currentTime, 0.01);
    });

    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_GLOBAL_MUTE_CHANGED, payload: { muted: this._isMuted.value }, timestamp: new Date() });
  }

  async getAvailableOutputDevices(): Promise<IAudioOutputDevice[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === 'audiooutput')
      .map(device => ({ deviceId: device.deviceId, label: device.label || `Output Device ${device.deviceId.substring(0, 5)}...` }));
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    this.globalOutputDeviceId.value = deviceId;
    
    // Update the default context
    const devCtx = this.deviceContexts.get('default');
    if (devCtx && typeof devCtx.context.setSinkId === 'function') {
        await devCtx.context.setSinkId(deviceId);
    }

    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_DEVICE_CHANGED, payload: { deviceId }, timestamp: new Date() });
  }

  getCurrentOutputDeviceId(): string {
    return this.globalOutputDeviceId.value;
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

  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      this.onMediaDeviceChange();
      return true;
    } catch (err) {
      console.warn('Audio permissions denied:', err);
      return false;
    }
  }

  destroy(): void {
    this.stopAll();
    this.audioPlayers.forEach(player => player.destroy());
    this.audioPlayers.clear();
    this.deviceContexts.forEach(devCtx => {
        devCtx.channelGains.forEach(node => node.disconnect());
        devCtx.masterGain.disconnect();
        devCtx.context.close();
    });
    this.deviceContexts.clear();
    if (navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', this.onMediaDeviceChange);
    }
  }
}
