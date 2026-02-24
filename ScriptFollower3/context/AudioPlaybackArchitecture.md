# Audio Playback Component Architecture

## Overview

This document outlines the architecture for a dedicated Audio Playback Component designed to provide robust and flexible audio handling within ScriptFollower 3. It aims to support instant playback, comprehensive control over audio properties, real-time state feedback, and the ability to define the audio output device, integrating seamlessly with existing features like the `SoundFeature`.

## Core Component: AudioPlayer

The `AudioPlayer` will be a singleton service (or a factory-provided instance per unique audio source) responsible for managing the lifecycle, playback, and properties of individual audio files. It will leverage the Web Audio API for precise control, low-latency playback, and advanced effects like fading and balancing.

## Key Features & Requirements

1.  **Instant Playback Response**: Achieved through pre-loading and caching audio data.
2.  **Volume Control**: Global and per-instance volume adjustment.
3.  **Balance Control**: Left/Right stereo balance for positional audio.
4.  **Define Start and End Points**: Play only a specific segment of an audio file.
5.  **Fade In/Out**: Smooth transitions for audio start and end.
6.  **Play/Stop/Pause/Seek**: Standard playback controls.
7.  **Output Device Selection**: Ability to choose which audio output device to use.
8.  **State and Property Interface**: Provide real-time access to playback status and audio properties.
9.  **Global Audio Controls**: Centralized volume, mute, and pause/resume for all players.
10. **Cue Orchestration**: Ability to stop specific cues or groups of cues, and manage sequences.
11. **Dynamic Pre-loading**: Intelligent pre-loading of upcoming sounds based on proximity to the current line.

## Architecture & Interfaces

### 1. AudioBufferManager (Pre-loading & Caching)

A utility class responsible for loading and caching audio files as `AudioBuffer` objects using the Web Audio API.

```typescript
class AudioBufferManager {
  private cache: Map<string, AudioBuffer> = new Map();
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext);
  
  /**
   * Loads an audio file from a URL and caches its AudioBuffer.
   * @param url The URL of the audio file.
   * @returns A Promise that resolves with the AudioBuffer.
   */
  loadAudioBuffer(url: string): Promise<AudioBuffer>;

  /**
   * Retrieves an AudioBuffer from the cache.
   * @param url The URL key for the cached AudioBuffer.
   * @returns The AudioBuffer if found, otherwise undefined.
   */
  getAudioBuffer(url: string): AudioBuffer | undefined;

  /**
   * Clears a specific entry or the entire cache.
   * @param url Optional URL to clear a specific buffer. If omitted, clears all.
   */
  clearCache(url?: string): void;
}
```

### 2. IAudioPlayer Interface

Defines the contract for an individual audio playback instance.

```typescript
interface IAudioPlayer {
  readonly id: string;
  readonly url: string;
  readonly isLoaded: boolean;
  readonly isPlaying: boolean;
  readonly duration: number; // Total duration of the audio in seconds
  currentTime: number; // Current playback position in seconds

  volume: number; // 0.0 to 1.0
  balance: number; // -1.0 (full left) to 1.0 (full right), 0.0 (center)

  /**
   * Pre-loads the audio file, making it ready for instant playback.
   */
  load(): Promise<void>;

  /**
   * Starts playback from a specific point, with optional end time and fades.
   * @param startTimeSeconds Optional: Start playback from this time (in seconds, relative to audio file).
   * @param endTimeSeconds Optional: Stop playback at this time (in seconds, relative to audio file).
   * @param fadeInDurationMs Optional: Duration of the fade-in effect in milliseconds.
   * @param fadeOutDurationMs Optional: Duration of the fade-out effect in milliseconds.
   */
  play(
    startTimeSeconds?: number,
    endTimeSeconds?: number,
    fadeInDurationMs?: number,
    fadeOutDurationMs?: number
  ): Promise<void>;

  /**
   * Pauses playback.
   */
  pause(): void;

  /**
   * Stops playback and resets currentTime to 0.
   */
  stop(): void;

  /**
   * Disposes of audio resources.
   */
  destroy(): void;

  /**
   * Event hook for when playback starts.
   */
  onPlay: (callback: () => void) => void;

  /**
   * Event hook for when playback is paused.
   */
  onPause: (callback: () => void) => void;

  /**
   * Event hook for when playback stops.
   */
  onStop: (callback: () => void) => void;

  /**
   * Event hook for when playback ends naturally.
   */
  onEnded: (callback: () => void) => void;

  /**
   * Event hook for when a playback error occurs.
   */
  onError: (callback: (error: Error) => void) => void;
}
```

### 3. AudioPlayer (Implementation)

The concrete implementation of `IAudioPlayer` using the Web Audio API.

```typescript
class AudioPlayer implements IAudioPlayer {
  // ... private Web Audio API nodes (AudioBufferSourceNode, GainNode, PannerNode, etc.)
  private audioContext: AudioContext;
  private audioBufferManager: AudioBufferManager;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private pannerNode: StereoPannerNode; // For balance control

  constructor(id: string, url: string, audioContext: AudioContext, audioBufferManager: AudioBufferManager);

  // ... implementation of IAudioPlayer methods
}
```

### 4. AudioPlaybackManager (Centralized Control & Orchestration)

A singleton manager to create, retrieve, and manage multiple `IAudioPlayer` instances. This manager handles the global `AudioContext` and provides a unified interface for interacting with all audio players, as well as orchestrating higher-level playback scenarios.

```typescript
class AudioPlaybackManager {
  private audioContext: AudioContext;
  private audioPlayers: Map<string, IAudioPlayer> = new Map(); // Stores all player instances by ID
  private activePlayers: Map<string, IAudioPlayer> = new Map(); // Stores currently playing player instances by ID
  private audioBufferManager: AudioBufferManager;
  private eventBus: EventBus; // For system-wide audio events
  private currentOutputDeviceId: string = 'default';
  private masterGainNode: GainNode; // For global volume control

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.audioBufferManager = new AudioBufferManager(this.audioContext);

    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);

    // Monitor media device changes
    navigator.mediaDevices.addEventListener('devicechange', this.onMediaDeviceChange.bind(this));
  }

  private async onMediaDeviceChange() {
      console.log("Audio devices changed. Re-enumerating.");
      this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_DEVICES_UPDATED, timestamp: new Date() });
  }

  /**
   * Creates or retrieves an IAudioPlayer instance for a given URL.
   * If an instance for the URL already exists, it is returned. The player will connect to the masterGainNode.
   * @param id A unique ID for this player instance.
   * @param url The URL of the audio file.
   * @returns An IAudioPlayer instance.
   */
  getPlayer(id: string, url: string): IAudioPlayer;

  /**
   * Pre-loads all specified audio URLs.
   * @param urls An array of audio URLs to pre-load.
   */
  preloadAll(urls: string[]): Promise<void[]>;

  /**
   * Stops all active audio players and clears the activePlayers map.
   */
  stopAll(): void;

  /**
   * Stops specific audio players by their IDs.
   * @param cueIds An array of player IDs to stop.
   */
  stopCues(cueIds: string[]): void;

  /**
   * Pauses all active audio players.
   */
  pauseAll(): void;

  /**
   * Resumes all paused audio players.
   */
  resumeAll(): void;

  /**
   * Sets the global volume for all audio playback.
   * @param volume A value between 0.0 (silent) and 1.0 (full volume).
   */
  setGlobalVolume(volume: number): void;

  /**
   * Mutes or unmutes all audio playback globally.
   * @param muted True to mute, false to unmute.
   */
  setGlobalMute(muted: boolean): void;

  /**
   * Cleans up all audio players and resources.
   */
  destroy(): void;

  /**
   * Returns a list of available audio output devices.
   * @returns A Promise that resolves with an array of MediaDeviceInfo objects.
   */
  getAvailableOutputDevices(): Promise<MediaDeviceInfo[]>;

  /**
   * Sets the audio output device for the global AudioContext.
   * This method must be called in response to a user gesture.
   * @param deviceId The ID of the audio output device to use. Use 'default' for the system default.
   * @returns A Promise that resolves when the device has been set.
   */
  setOutputDevice(deviceId: string): Promise<void>;

  /**
   * Gets the ID of the currently selected audio output device.
   */
  getCurrentOutputDeviceId(): string;

  /**
   * Returns a list of currently playing IAudioPlayer instances.
   */
  getCurrentlyPlayingPlayers(): IAudioPlayer[];

  /**
   * Returns a list of IAudioPlayer instances associated with a specific lineId.
   * @param lineId The ID of the script line.
   * @returns An array of IAudioPlayer instances.
   */
  getPlayersByLineId(lineId: string): IAudioPlayer[];

  /**
   * Proactively pre-loads cues around the current line for smoother playback transitions.
   * @param currentLineId The ID of the current script line.
   * @param lookaheadLineCount The number of lines ahead and behind to consider for pre-loading.
   * @param allDocumentLines An array of all document lines, needed to determine proximity.
   * @param getCuesForLine A callback function to get SoundCues for a given lineId.
   */
  proactivelyPreloadCues(
    currentLineId: string,
    lookaheadLineCount: number,
    allDocumentLines: ScriptLineBase[],
    getCuesForLine: (lineId: string) => SoundCue[]
  ): Promise<void[]>;
}
```

## Proposed Audio Event Types

To facilitate system-wide communication of audio-related state changes, the `AudioPlaybackManager` will emit the following events via the `EventBus`. These should be added to `EVENT_TYPES` in `src/types/core.ts` during implementation.

```typescript
export const AUDIO_EVENT_TYPES = {
  AUDIO_PLAYER_PLAYING: 'audio:playerPlaying',        // An IAudioPlayer started playback
  AUDIO_PLAYER_PAUSED: 'audio:playerPaused',         // An IAudioPlayer was paused
  AUDIO_PLAYER_STOPPED: 'audio:playerStopped',       // An IAudioPlayer was stopped (or ended naturally)
  AUDIO_PLAYER_LOADED: 'audio:playerLoaded',         // An IAudioPlayer's audio buffer has loaded
  AUDIO_PLAYER_ERROR: 'audio:playerError',           // An error occurred during loading or playback
  AUDIO_DEVICE_CHANGED: 'audio:deviceChanged',       // The audio output device has been changed
  AUDIO_DEVICES_UPDATED: 'audio:devicesUpdated',     // The list of available audio devices has changed
  AUDIO_GLOBAL_VOLUME_CHANGED: 'audio:globalVolumeChanged', // Global volume was adjusted
  AUDIO_GLOBAL_MUTE_CHANGED: 'audio:globalMuteChanged',   // Global mute state was toggled
  AUDIO_ALL_PAUSED: 'audio:allPaused',                // All players were paused
  AUDIO_ALL_RESUMED: 'audio:allResumed',              // All players were resumed
};
```

**Payload examples:**

-   `AUDIO_PLAYER_PLAYING`: `{ playerId: string, url: string, currentTime: number }`
-   `AUDIO_PLAYER_ERROR`: `{ playerId: string, url: string, error: string }`
-   `AUDIO_DEVICE_CHANGED`: `{ newDeviceId: string, oldDeviceId: string }`
-   `AUDIO_GLOBAL_VOLUME_CHANGED`: `{ volume: number }`
-   `AUDIO_GLOBAL_MUTE_CHANGED`: `{ muted: boolean }`

## Integration with Existing System

### App.vue

-   Instantiate `AudioPlaybackManager` and provide it via dependency injection.
-   Provide UI for device selection (e.g., in `Toolbar` or `RightPanel`).

```typescript
// App.vue setup script
const audioPlaybackManager = new AudioPlaybackManager(eventBus);
provide('audioPlaybackManager', audioPlaybackManager);

// Example of device selection in a component (e.g., Toolbar, SettingsPanel)
const availableDevices = ref<MediaDeviceInfo[]>([]);
const selectedDeviceId = ref<string>(audioPlaybackManager.getCurrentOutputDeviceId());

onMounted(async () => {
  // Request microphone permissions if needed, to ensure all devices are listed.
  // This is a common browser security measure.
  await navigator.mediaDevices.getUserMedia({ audio: true }).catch(e => console.warn("Microphone access denied, some devices might not be listed.", e));
  availableDevices.value = await audioPlaybackManager.getAvailableOutputDevices();

  // Subscribe to device updates
  eventBus.subscribe(AUDIO_EVENT_TYPES.AUDIO_DEVICES_UPDATED, async () => {
    availableDevices.value = await audioPlaybackManager.getAvailableOutputDevices();
  });
});

const handleDeviceChange = async (event: Event) => {
  const newDeviceId = (event.target as HTMLSelectElement).value;
  // Ensure this is called on a user gesture (e.g., button click, select change)
  await audioPlaybackManager.setOutputDevice(newDeviceId);
  selectedDeviceId.value = newDeviceId;
};

// Example of global volume control UI
const globalVolume = ref(audioPlaybackManager.getGlobalVolume()); // Assume getGlobalVolume exists
watch(globalVolume, (newVal) => {
    audioPlaybackManager.setGlobalVolume(newVal);
});
```

### SoundFeature

The existing `SoundFeature` will be a primary consumer of the `AudioPlaybackManager`. Instead of directly creating `HTMLAudioElement`s, it will now request `IAudioPlayer` instances from the `AudioPlaybackManager`. It will also leverage the higher-level orchestration capabilities.

```typescript
// SoundFeature.ts
class SoundFeature implements FeaturePlugin {
  // ... existing properties
  private audioPlaybackManager: AudioPlaybackManager; // Injected dependency
  private appStore: AppStore; // Injected for document access to support proactive pre-loading
  private selectionManager: LineSelectionManager; // Injected for current line info

  constructor( /* ... */, audioPlaybackManager: AudioPlaybackManager, appStore: AppStore, selectionManager: LineSelectionManager) {
    // ...
    this.audioPlaybackManager = audioPlaybackManager;
    this.appStore = appStore;
    this.selectionManager = selectionManager;

    // Proactively preload around the current line whenever selection changes
    this.eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, (event) => {
      if (event.payload.lineId) {
        this.audioPlaybackManager.proactivelyPreloadCues(
          event.payload.lineId,
          10, // Lookahead 10 lines
          this.appStore.getLines(),
          (lineId) => this.getCuesForLine(lineId) // Pass feature's way to get cues
        );
      }
    });
  }

  async playCue(cue: SoundCue) {
    const player = this.audioPlaybackManager.getPlayer(cue.id, cue.url);
    await player.load(); // Ensure pre-loaded
    player.volume = cue.volume / 100;
    player.balance = (cue.pan === 'left' ? -1 : cue.pan === 'right' ? 1 : 0);
    
    // Play with start/end/fades
    player.play(
      cue.startOffsetSeconds,
      cue.endOffsetSeconds,
      cue.fadeIn,
      cue.fadeOut
    );
    
    // Listen to player state for highlights or UI updates
    player.onEnded(() => {
        // Remove 'playing' highlight
    });
  }

  stopAll() {
    this.audioPlaybackManager.stopAll();
  }

  // Example of using new orchestration methods
  increaseVolume() {
      const currentVolume = this.audioPlaybackManager.getGlobalVolume(); // Assume this method exists
      this.audioPlaybackManager.setGlobalVolume(Math.min(1.0, currentVolume + 0.1));
  }

  decreaseVolume() {
      const currentVolume = this.audioPlaybackManager.getGlobalVolume();
      this.audioPlaybackManager.setGlobalVolume(Math.max(0.0, currentVolume - 0.1));
  }

  executeStopAction(action: string) {
      if (action === 'all') {
          this.audioPlaybackManager.stopAll();
      } else if (action === 'previous') {
          const currentLine = this.selectionManager.getCurrentLine();
          if (currentLine) {
              const lines = this.appStore.getLines();
              const idx = lines.findIndex(l => l.id === currentLine);
              if (idx > 0) {
                  const prevLine = lines[idx - 1];
                  const cuesToStop = this.getCuesForLine(prevLine.id).map(cue => cue.id);
                  this.audioPlaybackManager.stopCues(cuesToStop);
              }
          }
      } else {
          // Comma-separated cue IDs
          const cueIds = action.split(',').map(id => id.trim());
          this.audioPlaybackManager.stopCues(cueIds);
      }
  }

  // ... other methods
}
```

### ScriptLineBase (Metadata Enhancement)

To support start/end points and fades, the `SoundCue` interface (and potentially `ScriptLineBase` metadata) would need to be extended.

```typescript
interface SoundCue {
  // ... existing properties
  startOffsetSeconds?: number; // Start playback from this offset in the audio file
  endOffsetSeconds?: number;   // End playback at this offset in the audio file
}
```

## Technical Considerations

### Web Audio API vs. HTML Audio Element

-   **Choice**: Web Audio API.
-   **Rationale**: Offers precise timing, sample-accurate control, direct access to audio buffers for pre-loading, advanced routing (panning, effects), and lower latency critical for instant playback and synchronized cues. HTML Audio Element is simpler but lacks the fine-grained control required for features like precise start/end points and fade envelopes.

### Pre-loading Strategy

-   `AudioBufferManager` handles loading into `AudioBuffer` objects.
-   `AudioPlaybackManager.preloadAll` can be used for initial bulk loading.
-   `AudioPlaybackManager.proactivelyPreloadCues` will enable dynamic, intelligent pre-loading and caching of cues around the current script line, improving responsiveness as the user navigates.
-   Individual `IAudioPlayer.load()` ensures a specific player's audio is ready just before `play()`.

### Performance

-   **Memory**: `AudioBuffer` objects can consume significant memory for large, uncompressed audio files. `AudioPlaybackManager.proactivelyPreloadCues` should also consider unloading distant cues to manage memory effectively.
-   **CPU**: Web Audio API operations are generally performant, but complex graph configurations or numerous simultaneous players could impact performance. Optimizations like re-using `AudioBufferSourceNode`s are crucial. Global gain node for volume control minimizes per-player updates.

### Error Handling

-   Audio loading failures (e.g., network issues, unsupported format) will be caught by `AudioBufferManager` and propagated.
-   `IAudioPlayer` will expose an `onError` event for runtime playback issues.
-   `AudioPlaybackManager` should report errors to `EventBus` (e.g., `EVENT_TYPES.AUDIO_ERROR`).

### Device Selection

-   **`navigator.mediaDevices.enumerateDevices()`**: Used to get a list of all connected media input and output devices. Filtering by `kind: 'audiooutput'` will provide the list of speaker/headphone devices.
-   **`AudioContext.setSinkId(deviceId)`**: This method allows changing the audio output device for the `AudioContext`. It's crucial that this call is made in response to a user gesture (e.g., a button click, a selection from a dropdown), otherwise it will likely fail due to browser security restrictions.
-   **User Interface**: A dropdown or similar UI element would be needed (e.g., in a settings panel or the toolbar) to allow the user to select their preferred output device from the list provided by `getAvailableOutputDevices()`.
-   **Default Device**: The `deviceId` 'default' can be used to select the system's default audio output.

## Concurrency and Multiple Players

The `AudioPlaybackManager` is designed to handle multiple simultaneous `IAudioPlayer` instances. Each `IAudioPlayer` manages its own Web Audio API source and gain nodes, allowing independent playback control. `stopAll()`, `pauseAll()`, `resumeAll()`, `setGlobalVolume()`, and `setGlobalMute()` will provide orchestration over all active and future players managed by `AudioPlaybackManager`. Considerations for maximum concurrent players and their impact on performance will be addressed during implementation and optimization phases.

## Testing Strategy

To ensure the reliability and correctness of the Audio Playback Component, the following testing strategy will be employed:

1.  **Unit Tests**:
    *   **`AudioBufferManager`**: Test loading, caching, and retrieval of audio buffers. Mock `AudioContext` and `fetch` APIs.
    *   **`AudioPlayer`**: Test `play`, `pause`, `stop`, `volume`, `balance`, and `fade` logic. Mock Web Audio API nodes and verify their configuration. Test event emissions (`onPlay`, `onEnded`, `onError`).
    *   **`AudioPlaybackManager`**: Test player creation/retrieval, `preloadAll`, `stopAll`, `stopCues`, `pauseAll`, `resumeAll`, `setGlobalVolume`, `setGlobalMute`. Mock `AudioPlayer` instances and `EventBus`. Test device enumeration, setting, and proactive pre-loading logic.
2.  **Integration Tests**:
    *   Verify seamless interaction between `AudioPlaybackManager` and `SoundFeature`.
    *   Test `SoundFeature`'s ability to trigger `AudioPlayer` actions and orchestration commands based on `SoundCue` annotations and user navigation.
    *   Confirm `EventBus` events are correctly emitted by `AudioPlaybackManager` and subscribed to by other components/features.
3.  **End-to-End (E2E) Tests**:
    *   Simulate user interaction with a document containing sound cues.
    *   Verify actual audio playback (if feasible with testing frameworks, otherwise focus on UI/state changes).
    *   Test device selection and global volume control through the UI and confirm functional change.

## Security Considerations

1.  **Untrusted Audio Sources**: The component should be resilient against malicious or malformed audio files. Parsers (`decodeAudioData`) should handle errors gracefully.
2.  **Browser Permissions**: Access to `navigator.mediaDevices.enumerateDevices()` and `AudioContext.setSinkId()` is subject to browser security policies.
    *   `enumerateDevices()` might return empty or generic labels without user media permissions (e.g., microphone access). The UI should guide the user to grant necessary permissions.
    *   `setSinkId()` must be triggered by a direct user gesture to succeed.
3.  **Information Disclosure**: Device enumeration should not expose sensitive user information beyond device names and IDs.

## Future Enhancements

-   **Spatial Audio**: 3D positioning of sounds.
-   **Effects Chain**: Add dynamic effects like reverb, delay, EQ.
-   **Recording**: Integrate audio input for recording.
-   **Visualizers**: Hook into audio data for real-time visualizations.
-   **Multi-channel Audio**: Support for more complex audio setups.
