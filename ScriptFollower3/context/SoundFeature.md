Can Can C# Sound Feature - Reference Implementation

## Overview

The Sound Feature is a complete reference implementation of `IFeaturePlugin`. It now leverages a dedicated Audio Playback Component (`AudioPlaybackManager` and `IAudioPlayer`) for all audio-related operations, demonstrating:
- How to integrate with a specialized audio playback system
- How to store feature data (SoundCues)
- How to declare keybindings that trigger audio actions
- How to declare annotations that configure audio playback properties (volume, fades, start/end times)
- How to register custom highlights for audio playback states
- How to respond to document lifecycle events

## Feature Declaration

```typescript
class SoundFeature implements FeaturePlugin {
  readonly id = 'sound'
  readonly name = 'Sound'
  readonly version = '1.0.0'
  readonly description = 'Play audio cues synchronized with script lines using a dedicated audio engine'
}
```

## Data Structures

```typescript
// Updated SoundCue interface to include playback offsets and reflect current code
interface SoundCue {
  readonly id: string;
  readonly url: string;
  readonly name: string;
  readonly volume: number; // 0-100
  readonly pan: 'left' | 'right' | 'center' | number; // -1 to 1, or string presets
  readonly startOffsetSeconds?: number;
  readonly endOffsetSeconds?: number;
  readonly fadeIn?: number; // ms
  readonly fadeOut?: number; // ms
}

class SoundFeature implements FeaturePlugin {
  // ... (other feature properties like id, name, version, description)
  private audioPlaybackManager: AudioPlaybackManager; // Injected dependency
  private appStore: AppStore; // Injected dependency for document access
  private selectionManager: LineSelectionManager; // Injected dependency for highlights and navigation
  private eventBus: EventBus; // Injected dependency for event communication
}
```

## Initialization

The `SoundFeature` now subscribes to both `LINE_SELECTED` and `SOUNDS_LOADED` events to trigger its `managePreloading` logic, ensuring cues are loaded both when navigating the script and when new sounds are added.

```typescript
constructor(
    featureManager: FeatureManager,
    actionController: ActionController,
    audioPlaybackManager: AudioPlaybackManager,
    appStore: AppStore,
    eventBus: EventBus,
    annotationManager: AnnotationManager,
    selectionManager: LineSelectionManager // New: Injected to handle preloading
) {
    // ...assignments
}

async init(): Promise<void> {
  // Register annotations
  this.annotationManager.registerFeatureAnnotations(this.id, this.getAnnotations())

  // Register custom UI components for SOUND_CUE lines
  this.featureManager.registerLineRenderer(LineType.SOUND_CUE, SoundCueLine, 'default')
  this.featureManager.registerLineRenderer(LineType.SOUND_CUE, SoundCuePanel, 'right-panel')

  // Listen for line selection to manage pre-loading
  this.eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, (event) => {
    if (event.payload.lineId) {
      this.managePreloading(event.payload.lineId)
    }
  })

  // Listen for when sounds are loaded to trigger preloading
  this.eventBus.subscribe(EVENT_TYPES.SOUNDS_LOADED, () => {
    const currentLineId = this.selectionManager.getCurrentLine();
    if (currentLineId) {
      this.managePreloading(currentLineId);
    }
  });

  console.log(`Sound Feature initialized`)
}

private managePreloading(currentLineId: string): void {
  // ... logic to determine which sound cues are near the current line
  // and instruct the AudioPlaybackManager to load or unload them.
}
```

## Keybindings

```typescript
getKeybindings(): KeyBinding[] {
  return [
    {
      id: 'sound-play-pause',
      featureId: 'sound',
      keys: ['space'],
      modifiers: {},
      action: 'playOrPause',
      isActive: (context) => context.hasDocument && context.currentLineId,
      handler: (context) => this.playOrPause(context.currentLineId)
    },
    {
      id: 'sound-stop-all',
      featureId: 'sound',
      keys: ['escape'],
      modifiers: {},
      action: 'stopAll',
      isActive: () => true,
      handler: () => this.stopAll()
    },
    {
      id: 'sound-volume-up',
      featureId: 'sound',
      keys: ['+'],
      modifiers: { ctrl: true },
      action: 'volumeUp',
      isActive: (context) => context.hasDocument,
      handler: () => this.increaseVolume()
    },
    {
      id: 'sound-volume-down',
      featureId: 'sound',
      keys: ['-'],
      modifiers: { ctrl: true },
      action: 'volumeDown',
      isActive: (context) => context.hasDocument,
      handler: () => this.decreaseVolume()
    },
    {
      id: 'sound-next-cue',
      featureId: 'sound',
      keys: ['n'],
      modifiers: { ctrl: true },
      action: 'nextCue',
      isActive: (context) => context.hasDocument,
      handler: (context) => this.jumpToNextCue(context.currentLineId)
    },
    {
      id: 'sound-prev-cue',
      featureId: 'sound',
      keys: ['p'],
      modifiers: { ctrl: true },
      action: 'previousCue',
      isActive: (context) => context.hasDocument,
      handler: (context) => this.jumpToPreviousCue(context.currentLineId)
    },
    {
      id: 'sound-reset-pan',
      featureId: 'sound',
      keys: ['c'],
      modifiers: { ctrl: true, shift: true },
      action: 'resetPan',
      isActive: (context) => context.currentLineId && context.currentLineType === LineType.SOUND_CUE,
      handler: (context) => this.resetPan(context.currentLineId)
    },
    {
      id: 'sound-pan-left',
      featureId: 'sound',
      keys: ['left'],
      modifiers: { ctrl: true },
      action: 'panLeft',
      isActive: (context) => context.currentLineId && context.currentLineType === LineType.SOUND_CUE,
      handler: (context) => this.panAdjust(context.currentLineId, -0.1)
    },
    {
      id: 'sound-pan-right',
      featureId: 'sound',
      keys: ['right'],
      modifiers: { ctrl: true },
      action: 'panRight',
      isActive: (context) => context.currentLineId && context.currentLineType === LineType.SOUND_CUE,
      handler: (context) => this.panAdjust(context.currentLineId, 0.1)
    }
  ]
}
```

## Annotations

The annotations for `pan`, `fade-in`, and `fade-out` have been updated to correctly handle numeric and decimal values.

```typescript
getAnnotations(): Annotation[] {
  return [
    {
      name: 'volume',
      description: 'Sound volume (0-100)',
      type: 'number',
      defaultValue: 100,
      constraints: { min: 0, max: 100 },
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0 && val <= 100
    },
    {
        name: 'pan',
        description: 'Stereo pan (-1 to 1, or left/center/right)',
        type: 'string', // Can be string or number
        defaultValue: 'center',
        parseValue: (val) => {
          const lowerVal = val.toLowerCase();
          if (['left', 'center', 'right'].includes(lowerVal)) {
            return lowerVal;
          }
          const num = parseFloat(val);
          return isNaN(num) ? lowerVal : num;
        },
        validateValue: (val) => {
          if (typeof val === 'string') {
            return ['left', 'center', 'right'].includes(val);
          }
          if (typeof val === 'number') {
            return val >= -1 && val <= 1;
          }
          return false;
        }
    },
    {
      name: 'start',
      description: 'Start offset in seconds',
      type: 'number',
      defaultValue: 0,
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0
    },
    {
      name: 'end',
      description: 'End offset in seconds',
      type: 'number',
      defaultValue: 0,
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0
    },
    {
      name: 'fade-in',
      description: 'Fade in duration (milliseconds)',
      type: 'number',
      defaultValue: 0,
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0
    },
    {
      name: 'fade-out',
      description: 'Fade out duration (milliseconds)',
      type: 'number',
      defaultValue: 0,
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0
    },
    {
      name: 'loop',
      description: 'Loop playback',
      type: 'boolean',
      defaultValue: false,
      parseValue: (val) => val.toLowerCase() === 'true',
      validateValue: (val) => typeof val === 'boolean'
    },
    {
      name: 'delay',
      description: 'Delay before playing in milliseconds',
      type: 'number',
      defaultValue: 0,
      constraints: { min: 0 },
      parseValue: (val) => parseInt(val),
      validateValue: (val) => val >= 0
    },
    {
      name: 'speed',
      description: 'Playback speed (0.5-2.0)',
      type: 'number',
      defaultValue: 1.0,
      constraints: { min: 0.5, max: 2.0 },
      parseValue: (val) => parseFloat(val),
      validateValue: (val) => val >= 0.5 && val <= 2.0
    },
    {
      name: 'stop',
      description: 'Stop behavior: "previous", "all", or a comma-separated list of SoundRefs e.g., "[0001,0002]"',
      type: 'string',
      parseValue: (val) => val.trim(),
      validateValue: (val) => {
        if (val === 'all' || val === 'previous') return true;
        // Match a comma-separated list of sound refs in brackets
        return /^\[\s*\w+(\s*,\s*\w+)*\s*\]$/.test(val);
      }
    }
  ]
}
```

### Stop Annotation Details
The `stop` annotation provides powerful control over audio playback, allowing one line to stop other sounds.

- **`{stop=previous}`**: Stops the sound cue from the immediately preceding line, if it is currently playing.
- **`{stop=all}`**: Stops all sounds that are currently playing in the application.
- **`{stop=[0001,0004,0201]}`**: Stops specific sound cues by their SoundRef. The value should be a comma-separated list of SoundRefs enclosed in square brackets.

## Highlights

```typescript
registerHighlightTypes(registry: HighlightTypeRegistry) {
  registry.register('sound:playing', 90, {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
    borderWidth: '2px'
  })

  registry.register('sound:queued', 75, {
    backgroundColor: '#e1f5fe',
    borderColor: '#03a9f4',
    borderWidth: '1px'
  })

  registry.register('sound:error', 65, {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: '1px'
  })
}
```

## Core Methods

```typescript
// Refactored to use AudioPlaybackManager and IAudioPlayer
async playSoundForLine(lineId: string) {
  const cues = this.cuesByLineId.get(lineId) ?? [];
  
  // Check for stop annotation and execute action
  const stopAnnotation = this.getStopAnnotation(lineId); // Assume this method extracts the 'stop' annotation value
  if (stopAnnotation) {
    this.executeStopAction(stopAnnotation);
  }
  
  // Play all cues for this line using the AudioPlaybackManager
  for (const cue of cues) {
    await this.playCue(cue);
  }
  
  this.selectionManager.addHighlight(lineId, 'sound:playing');
}

async playCue(cue: SoundCue) {
  try {
    const player = this.audioPlaybackManager.getPlayer(cue.id, cue.url);
    await player.load(); // Ensure the audio is loaded and ready

    player.volume = cue.volume / 100;
    player.balance = (cue.pan === 'left' ? -1 : cue.pan === 'right' ? 1 : 0);

    // Subscribe to player events to update highlights
    player.onEnded(() => {
      this.selectionManager.removeHighlight(cue.lineId, 'sound:playing');
      this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_STOPPED, payload: { playerId: cue.id, url: cue.url }, timestamp: new Date() });
    });
    player.onError((error) => {
      this.selectionManager.removeHighlight(cue.lineId, 'sound:playing');
      this.selectionManager.addHighlight(cue.lineId, 'sound:error', { message: error.message });
      this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_ERROR, payload: { playerId: cue.id, url: cue.url, error: error.message }, timestamp: new Date() });
    });

    // Start playback
    await player.play(cue.startOffsetSeconds, cue.endOffsetSeconds, cue.fadeIn, cue.fadeOut);
    this.eventBus.emit({ type: AUDIO_EVENT_TYPES.AUDIO_PLAYER_PLAYING, payload: { playerId: cue.id, url: cue.url }, timestamp: new Date() });

  } catch (error) {
    console.error(`SoundFeature: Failed to play cue ${cue.id}:`, error);
    this.eventBus.emit({
      type: EVENT_TYPES.FEATURE_ERROR,
      payload: {
        featureId: this.id,
        error: `Failed to play cue ${cue.id}: ${error instanceof Error ? error.message : String(error)}`
      },
      timestamp: new Date()
    });
    this.selectionManager.addHighlight(cue.lineId, 'sound:error', { message: `Failed to play: ${error instanceof Error ? error.message : String(error)}` });
  }
}

stopAll() {
  this.audioPlaybackManager.stopAll();
  // Ensure all 'sound:playing' highlights are removed
  this.appStore.getLines().forEach(line => {
    this.selectionManager.removeHighlight(line.id, 'sound:playing');
  });
}

playOrPause(lineId: string | null) {
  if (!lineId) return;

  // Assuming AudioPlaybackManager provides a way to check if any player is active
  const isPlaying = this.audioPlaybackManager.getCurrentlyPlayingPlayers().length > 0; 
  
  if (isPlaying) {
    this.stopAll();
  } else {
    this.playSoundForLine(lineId);
  }
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
        // Need a way to stop sounds specific to a line. 
        // AudioPlaybackManager could provide stopByLineId(lineId)
        // For now, assuming direct access to player by cue ID or enhance AudioPlaybackManager.
        const cues = this.cuesByLineId.get(prevLine.id) ?? [];
        cues.forEach(cue => {
          const player = this.audioPlaybackManager.getPlayer(cue.id, cue.url);
          if (player.isPlaying) player.stop();
        });
      }
    }
  } else {
    // Comma-separated cue IDs
    const cueIds = action.split(',').map(id => id.trim());
    cueIds.forEach(cueId => {
      const player = this.audioPlaybackManager.getPlayer(cueId, ''); // URL might not be needed for stopping if player exists
      if (player && player.isPlaying) player.stop();
    });
  }
}

increaseVolume() {
  // Assuming AudioPlaybackManager could expose a global volume or iterate all players
  // For now, iterate through all currently managed players and adjust
  this.audioPlaybackManager.getCurrentlyPlayingPlayers().forEach(player => {
    player.volume = Math.min(1.0, player.volume + 0.1);
  });
}

decreaseVolume() {
  this.audioPlaybackManager.getCurrentlyPlayingPlayers().forEach(player => {
    player.volume = Math.max(0.0, player.volume - 0.1);
  });
}

jumpToNextCue(currentLineId: string | null) {
  if (!currentLineId) return;
  
  const lines = this.appStore.getLines();
  const currentIdx = lines.findIndex(l => l.id === currentLineId);
  
  for (let i = currentIdx + 1; i < lines.length; i++) {
    if (this.cuesByLineId.has(lines[i].id)) {
      this.selectionManager.selectLine(lines[i].id);
      break;
    }
  }
}

jumpToPreviousCue(currentLineId: string | null) {
  if (!currentLineId) return;
  
  const lines = this.appStore.getLines();
  const currentIdx = lines.findIndex(l => l.id === currentLineId);
  
  for (let i = currentIdx - 1; i >= 0; i--) {
    if (this.cuesByLineId.has(lines[i].id)) {
      this.selectionManager.selectLine(lines[i].id);
      break;
    }
  }
}

addCueToLine(lineId: string, cue: SoundCue) {
  if (!this.cuesByLineId.has(lineId)) {
    this.cuesByLineId.set(lineId, []);
  }
  this.cuesByLineId.get(lineId)!.push(cue);

  // Preload the new cue immediately
  this.audioPlaybackManager.getPlayer(cue.id, cue.url).load().catch(e => {
    console.error(`SoundFeature: Failed to preload cue ${cue.id}:`, e);
    // Potentially add an error highlight to the line
  });
}

getCuesForLine(lineId: string): SoundCue[] {
  return this.cuesByLineId.get(lineId) ?? [];
}

async destroy(): Promise<void> {
  this.audioPlaybackManager.stopAll();
  console.log(`Sound Feature destroyed`);
}
```

## Example Usage

### Load Document

```
User loads "my-script.odt"
↓
EventBus emits DOCUMENT_LOADED
↓
Sound Feature (in onDocumentLoaded) instructs AudioPlaybackManager to preload all cues for the document.
```

### Play Sound with Annotation

```
Script line:
  JOHN
  {volume=60, speed=1.2, fade-in=100, start-offset=5}
  Hello there!

User presses Space (triggers playOrPause for current line)
↓
Sound Feature gets IAudioPlayer for the cue from AudioPlaybackManager.
↓
Sound Feature calls player.play(5, undefined, 100) with volume and balance set.
↓
AudioPlaybackManager plays the sound with specified parameters.
↓
Line highlighted as "sound:playing" (controlled by SoundFeature observing player state or directly).
```

### Stop All Sounds

```
Script line:
  CROWD_SOUND
  {stop=all}

User navigates to this line (triggering an action that leads to executeStopAction)
OR User presses Escape (triggers stopAll)
↓
Sound Feature calls audioPlaybackManager.stopAll().
↓
AudioPlaybackManager stops all currently playing IAudioPlayer instances.
```

## Benefits

✅ Reference implementation for developers
✅ Shows integration with dedicated Audio Playback Component
✅ Shows keybinding integration
✅ Shows annotation integration (including new start/end offset, fade annotations)
✅ Shows event integration (now reacting to and triggering AudioPlaybackManager)
✅ Shows highlight registration
✅ Complete feature lifecycle
✅ Error handling patterns (now via AudioPlaybackManager)
✅ Feature data isolation (SoundCues managed by SoundFeature, audio handled by AudioPlaybackManager)
✅ Improved control and lower latency via Web Audio API
