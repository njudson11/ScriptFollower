/**
 * Core type definitions for ScriptFollower 3
 * Immutable data structures and interfaces
 */

// Line types for stage play scripts
export enum LineType {
  TITLE = 'TITLE',
  SUBTITLE = 'SUBTITLE',
  ACT_HEADING = 'ACT_HEADING',
  SCENE_HEADING = 'SCENE_HEADING',
  CHARACTER_LIST = 'CHARACTER_LIST',
  DIALOGUE = 'DIALOGUE',
  STAGE_DIRECTION = 'STAGE_DIRECTION',
  TECH_CUE = 'TECH_CUE',
  SOUND_CUE = 'SOUND_CUE',
  LIGHT_CUE = 'LIGHT_CUE',
  PAGE_NUMBER = 'PAGE_NUMBER',
  BLANK = 'BLANK'
}

/**
 * Core immutable data structure representing a single script line
 */
export interface ScriptLineBase {
  readonly id: string;
  readonly documentId: string;
  readonly lineNumber: number;
  readonly lineType: LineType;
  readonly lineSubType?: string;
  readonly text: string;
  readonly annotation?: string;
  readonly metadata: Readonly<Record<string, any>>;
  readonly pageNumber: number | null; // New: Page number associated with the line
}

/**
 * Style information for document formatting
 */
export interface StyleInfo {
  readonly name: string;
  readonly displayName?: string;
  readonly parent?: string;
}

/**
 * Document structure containing script lines
 */
export interface Document {
  readonly id: string;
  readonly name: string;
  readonly format: 'DOCX' | 'ODT' | 'PDF' | 'XML';
  readonly lines: readonly ScriptLineBase[];
  readonly styles?: readonly StyleInfo[];
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Event emitted through the event bus
 */
export interface Event {
  type: string;
  payload?: any;
  timestamp: Date;
}

/**
 * Feature data associated with a line
 */
export interface FeatureData {
  readonly featureId: string;
  readonly lineId: string;
  readonly data: Readonly<Record<string, any>>;
}

/**
 * Highlight information for a line
 */
export interface Highlight {
  readonly lineId: string;
  readonly type: string;
  readonly priority: number;
  readonly expiresAt?: Date;
  readonly data?: Readonly<Record<string, any>>;
}

/**
 * Selection state for line selection
 */
export interface SelectionState {
  readonly currentLineId: string | null;
  readonly selectedLineIds: readonly string[];
  readonly highlights: readonly Highlight[];
  readonly history: readonly string[];
  readonly historyIndex: number;
}

/**
 * Feature keybinding definition
 */
export interface KeyBinding {
  readonly id: string;
  readonly featureId: string;
  readonly keys: readonly string[]; // e.g., ['space'], ['ctrl', 'shift', 'n']
  readonly modifiers: {
    readonly shift?: boolean;
    readonly ctrl?: boolean;
    readonly alt?: boolean;
    readonly meta?: boolean;
  };
  readonly actionType: string; // The type of action to dispatch
  readonly actionPayload?: any; // Optional payload to dispatch with the action
  readonly isActive?: (context: any) => boolean; // Optional, to check if the keybinding is active in current context
}

/**
 * Annotation definition for per-line feature configuration
 */
export interface Annotation {
  readonly name: string;
  readonly description: string;
  readonly type: 'string' | 'number' | 'boolean' | 'enum' | 'color';
  readonly defaultValue?: any;
  readonly constraints?: {
    readonly min?: number;
    readonly max?: number;
    readonly pattern?: string;
    readonly enum?: readonly any[];
  };
  readonly parseValue: (value: string) => any;
  readonly validateValue: (value: any) => boolean;
}

/**
 * Plugin feature definition
 */
export interface FeaturePlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  init(): Promise<void>;
  destroy(): Promise<void>;
  getKeybindings?(): KeyBinding[];
  getAnnotations?(): Annotation[];
  registerHighlightTypes?(registry: HighlightTypeRegistry): void;
}

/**
 * Highlight type registry for managing custom highlight types
 */
export interface HighlightTypeRegistry {
  register(type: string, priority: number, style: HighlightStyle): void;
  unregister(type: string): void;
  get(type: string): HighlightStyle | undefined;
  getAll(): Map<string, HighlightStyle>;
}

/**
 * Visual style for a highlight type
 */
export interface HighlightStyle {
  readonly backgroundColor?: string;
  readonly color?: string;
  readonly borderColor?: string;
  readonly borderWidth?: string;
  readonly opacity?: number;
}

/**
 * Interface for an individual audio playback instance
 */
export interface IAudioPlayer {
  readonly id: string;
  readonly url: string;
  readonly isLoaded: boolean;
  readonly isPlaying: boolean;
  readonly duration: number;
  readonly loadStatus: 'idle' | 'loading' | 'decoding' | 'loaded' | 'error';
  readonly loadProgress: number; // 0 to 100
  readonly channelId?: string; // Associated channel ID
  currentTime: number;
  volume: number;
  balance: number;

  load(): Promise<void>;
  play(startTimeSeconds?: number, endTimeSeconds?: number, fadeInDurationMs?: number, fadeOutDurationMs?: number): Promise<void>;
  pause(): void;
  stop(): void;
  destroy(): void;
  getBuffer(): AudioBuffer | null;

  onPlay(callback: () => void): void;
  onPause(callback: () => void): void;
  onStop(callback: () => void): void;
  onEnded(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
  onLoadProgress(callback: (progress: number, status: string) => void): void;
}

/**
 * Representation of a virtual audio mixing channel
 */
export interface IVirtualChannel {
  readonly id: string;
  readonly name: string;
  readonly volume: number; // 0.0 to 1.0
  readonly isMuted: boolean;
  readonly outputDeviceId: string; // references deviceId
}

/**
 * Representation of an available audio output device
 */
export interface IAudioOutputDevice {
  readonly deviceId: string;
  readonly label: string;
}

/**
 * Configuration for a specific sound cue
 */
export interface SoundCue {
  readonly id: string;
  readonly url: string;
  readonly name: string;
  readonly volume: number; // 0-100
  readonly pan: 'left' | 'right' | 'center';
  readonly startOffsetSeconds?: number;
  readonly endOffsetSeconds?: number;
  readonly fadeIn?: number; // ms
  readonly fadeOut?: number; // ms
  readonly channelId?: string; // Target virtual audio channel
}

/**
 * Standardized audio event types
 */
export const AUDIO_EVENT_TYPES = {
  AUDIO_PLAYER_PLAYING: 'audio:playerPlaying',
  AUDIO_PLAYER_PAUSED: 'audio:playerPaused',
  AUDIO_PLAYER_STOPPED: 'audio:playerStopped',
  AUDIO_PLAYER_LOADED: 'audio:playerLoaded',
  AUDIO_PLAYER_ERROR: 'audio:playerError',
  AUDIO_DEVICE_CHANGED: 'audio:deviceChanged',
  AUDIO_DEVICES_UPDATED: 'audio:devicesUpdated',
  AUDIO_GLOBAL_VOLUME_CHANGED: 'audio:globalVolumeChanged',
  AUDIO_GLOBAL_MUTE_CHANGED: 'audio:globalMuteChanged',
  AUDIO_ALL_PAUSED: 'audio:allPaused',
  AUDIO_ALL_RESUMED: 'audio:allResumed',
} as const;
