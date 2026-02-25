import { IAudioPlayer } from '@/types/core';

export class AudioPlayer implements IAudioPlayer {
  readonly id: string;
  readonly url: string;
  readonly channelId: string; // New: Associated channel ID
  private audioContext: AudioContext;
  private buffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private pannerNode: StereoPannerNode;
  
  private _isLoaded = false;
  private _isPlaying = false;
  private _currentTime = 0;
  private _volume = 1.0;
  private _balance = 0.0;
  private _startTime = 0; // When playback started in audioContext time
  private _offset = 0;    // Current offset within the buffer

  private _loadStatus: 'idle' | 'loading' | 'decoding' | 'loaded' | 'error' = 'idle';
  private _loadProgress = 0;

  private callbacks = {
    onPlay: new Set<() => void>(),
    onPause: new Set<() => void>(),
    onStop: new Set<() => void>(),
    onEnded: new Set<() => void>(),
    onError: new Set<(error: Error) => void>(),
    onLoadProgress: new Set<(progress: number, status: string) => void>()
  };

  constructor(id: string, url: string, audioContext: AudioContext, destination?: AudioNode, channelId: string = 'default') {
    this.id = id;
    this.url = url;
    this.channelId = channelId;
    this.audioContext = audioContext;

    this.gainNode = this.audioContext.createGain();
    this.pannerNode = this.audioContext.createStereoPanner();

    this.pannerNode.connect(this.gainNode);
    this.gainNode.connect(destination || this.audioContext.destination);
  }

  get isLoaded() { return this._isLoaded; }
  get isPlaying() { return this._isPlaying; }
  get duration() { return this.buffer ? this.buffer.duration : 0; }
  get loadStatus() { return this._loadStatus; }
  get loadProgress() { return this._loadProgress; }

  get currentTime() {
    if (this._isPlaying) {
      return this.audioContext.currentTime - this._startTime + this._offset;
    }
    return this._offset;
  }

  set currentTime(value: number) {
    const wasPlaying = this._isPlaying;
    if (wasPlaying) this.stopSource();
    this._offset = Math.max(0, Math.min(value, this.duration));
    if (wasPlaying) this.play();
  }

  get volume() { return this._volume; }
  set volume(value: number) {
    this._volume = Math.max(0, Math.min(value, 1));
    this.gainNode.gain.setTargetAtTime(this._volume, this.audioContext.currentTime, 0.01);
  }

  get balance() { return this._balance; }
  set balance(value: number) {
    this._balance = Math.max(-1, Math.min(value, 1));
    this.pannerNode.pan.setTargetAtTime(this._balance, this.audioContext.currentTime, 0.01);
  }

  async load(): Promise<void> {
    if (this._isLoaded) return;

    try {
      this._loadStatus = 'loading';
      this._loadProgress = 0;
      this.updateProgress();

      const response = await fetch(this.url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      let loaded = 0;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get reader');

      const chunks: Uint8Array[] = [];
      while(true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loaded += value.length;
          if (total > 0) {
            this._loadProgress = Math.round((loaded / total) * 100);
            this.updateProgress();
          }
        }
      }

      this._loadStatus = 'decoding';
      this.updateProgress();

      const allChunks = new Uint8Array(loaded);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      try {
        const bufferToDecode = allChunks.buffer.slice(0);
        this.buffer = await this.audioContext.decodeAudioData(bufferToDecode);
      } catch (decodeError) {
        throw new Error(`Failed to decode audio data. The file may be corrupted or in an unsupported format.`);
      }

      this._isLoaded = true;
      this._loadStatus = 'loaded';
      this._loadProgress = 100;
      this.updateProgress();
    } catch (error) {
      this._loadStatus = 'error';
      const err = error instanceof Error ? error : new Error(String(error));
      this.callbacks.onError.forEach(cb => cb(err));
      this.updateProgress();
      throw err;
    }
  }

  private updateProgress() {
    this.callbacks.onLoadProgress.forEach(cb => cb(this._loadProgress, this._loadStatus));
  }

  async play(startTimeSeconds?: number, endTimeSeconds?: number, fadeInDurationMs?: number, fadeOutDurationMs?: number): Promise<void> {
    if (!this._isLoaded) await this.load();
    if (!this.buffer) return;
    if (this._isPlaying) this.stopSource();

    // Ensure context is running (required for user gesture activation)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    if (startTimeSeconds !== undefined) {
      this._offset = startTimeSeconds;
    }

    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.buffer;
    this.sourceNode.connect(this.pannerNode);

    this.sourceNode.onended = () => {
      if (this._isPlaying) {
        this._isPlaying = false;
        this.callbacks.onEnded.forEach(cb => cb());
      }
    };

    if (fadeInDurationMs && fadeInDurationMs > 0) {
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(this._volume, this.audioContext.currentTime + fadeInDurationMs / 1000);
    } else {
      this.gainNode.gain.setValueAtTime(this._volume, this.audioContext.currentTime);
    }

    const start = Math.max(0, Math.min(this._offset, this.duration));
    let playDuration = undefined;

    if (endTimeSeconds !== undefined || (fadeOutDurationMs && fadeOutDurationMs > 0)) {
        const stopTime = endTimeSeconds !== undefined ? endTimeSeconds : this.duration;
        playDuration = Math.max(0, stopTime - start);
        
        if (fadeOutDurationMs && fadeOutDurationMs > 0) {
            const fadeOutStart = this.audioContext.currentTime + playDuration - (fadeOutDurationMs / 1000);
            this.gainNode.gain.setValueAtTime(this._volume, Math.max(this.audioContext.currentTime, fadeOutStart));
            this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + playDuration);
        }
    }

    this.sourceNode.start(0, start, playDuration);
    this._startTime = this.audioContext.currentTime;
    this._isPlaying = true;
    this.callbacks.onPlay.forEach(cb => cb());
  }

  pause(): void {
    if (!this._isPlaying) return;
    this._offset = this.currentTime;
    this.stopSource();
    this._isPlaying = false;
    this.callbacks.onPause.forEach(cb => cb());
  }

  stop(): void {
    this._offset = 0;
    this.stopSource();
    this._isPlaying = false;
    this.callbacks.onStop.forEach(cb => cb());
  }

  private stopSource() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {}
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  destroy(): void {
    this.stop();
    this.gainNode.disconnect();
    this.pannerNode.disconnect();
    this.buffer = null;
    Object.values(this.callbacks).forEach(set => set.clear());
  }

  getBuffer(): AudioBuffer | null {
    return this.buffer;
  }

  onPlay(callback: () => void) { this.callbacks.onPlay.add(callback); }
  onPause(callback: () => void) { this.callbacks.onPause.add(callback); }
  onStop(callback: () => void) { this.callbacks.onStop.add(callback); }
  onEnded(callback: () => void) { this.callbacks.onEnded.add(callback); }
  onError(callback: (error: Error) => void) { this.callbacks.onError.add(callback); }
  onLoadProgress(callback: (progress: number, status: string) => void) { this.callbacks.onLoadProgress.add(callback); }
}
