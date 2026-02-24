# Sound Feature - Reference Implementation

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
// Updated SoundCue interface to include playback offsets
interface SoundCue {
  readonly id: string                    // Unique cue ID
  readonly lineId: string                // Which line plays this
  readonly url: string                   // Audio file URL
  readonly volume: number                // 0-100
  readonly speed: number                 // 0.5-2.0
  readonly fadeIn: number                // ms
  readonly fadeOut: number               // ms
  readonly loop: boolean
  readonly delay: number                 // ms before play
  readonly pan: 'left' | 'center' | 'right'
  readonly createdAt: Date
  readonly startOffsetSeconds?: number;   // Start playback from this offset in the audio file
  readonly endOffsetSeconds?: number;     // End playback at this offset in the audio file
}

class SoundFeature implements FeaturePlugin {
  // ... (other feature properties like id, name, version, description)
  private cuesByLineId: Map<string, SoundCue[]> = new Map() // Feature-specific data for managing cues
  private audioPlaybackManager: AudioPlaybackManager; // Injected dependency
  private appStore: AppStore; // Injected dependency for document access
  private selectionManager: LineSelectionManager; // Injected dependency for highlights and navigation
  private eventBus: EventBus; // Injected dependency for event communication
}
```

## Initialization

```typescript
// Modified constructor to inject AudioPlaybackManager, AppStore, SelectionManager, EventBus
constructor(eventBus: EventBus, appStore: AppStore, selectionManager: LineSelectionManager, audioPlaybackManager: AudioPlaybackManager) {
    this.eventBus = eventBus;
    this.appStore = appStore;
    this.selectionManager = selectionManager;
    this.audioPlaybackManager = audioPlaybackManager;
}

async init(): Promise<void> {
  // Subscribe to document events
  this.eventBus.subscribe(EVENT_TYPES.DOCUMENT_LOADED, (event) => {
    this.onDocumentLoaded(event)
  })

  this.eventBus.subscribe(EVENT_TYPES.DOCUMENT_UNLOADED, (event) => {
    this.onDocumentUnloaded(event)
  })
  
  // Preload all known cues for the current document (example logic)
  const currentDocument = this.appStore.getCurrentDocument();
  if (currentDocument) {
      const allCueUrls = Array.from(this.cuesByLineId.values()).flat().map(cue => cue.url);
      await this.audioPlaybackManager.preloadAll(allCueUrls);
  }

  console.log(`Sound Feature initialized`)
}

private onDocumentLoaded(event: Event) {
  const { documentId } = event.payload
  console.log(`Sound Feature: Preparing for document ${documentId}`)
  // Here, we would typically load/parse sound cue data for this document
  // and then instruct the audioPlaybackManager to preload relevant files.
  // For this context file, we'll assume cue data is already populated.
}

private onDocumentUnloaded(event: Event) {
  // Stop all playing sounds managed by the AudioPlaybackManager
  this.audioPlaybackManager.stopAll();
  // Clear local sound cue data
  this.cuesByLineId.clear();
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
    }
  ]
}
```

## Annotations

```typescript
getAnnotations(): Annotation[] {
  return [
    {
      name: 'volume',
      description: 'Sound volume percentage (0-100)',
      type: 'number',
      defaultValue: 100,
      constraints: { min: 0, max: 100 },
      parseValue: (v) => parseInt(v),
      validateValue: (v) => v >= 0 && v <= 100
    },
    {
      name: 'speed',
      description: 'Playback speed (0.5-2.0)',
      type: 'number',
      defaultValue: 1.0,
      constraints: { min: 0.5, max: 2.0 },
      parseValue: (v) => parseFloat(v),
      validateValue: (v) => v >= 0.5 && v <= 2.0
    },
    {
      name: 'fade-in',
      description: 'Fade in duration in milliseconds',
      type: 'number',
      defaultValue: 0,
      constraints: { min: 0 },
      parseValue: (v) => parseInt(v),
      validateValue: (v) => v >= 0
    },
    {
      name: 'fade-out',
      description: 'Fade out duration in milliseconds',
      type: 'number',
      defaultValue: 0,
      constraints: { min: 0 },
      parseValue: (v) => parseInt(v),
      validateValue: (v) => v >= 0
    },
    {
      name: 'loop',
      description: 'Loop playback',
      type: 'boolean',
      defaultValue: false,
      parseValue: (v) => v.toLowerCase() === 'true',
      validateValue: (v) => typeof v === 'boolean'
    },
    {
      name: 'delay',
      description: 'Delay before playing in milliseconds',
      type: 'number',
      defaultValue: 0,
      constraints: { min: 0 },
      parseValue: (v) => parseInt(v),
      validateValue: (v) => v >= 0
    },
    {
      name: 'pan',
      description: 'Stereo panning',
      type: 'enum',
      defaultValue: 'center',
      constraints: { enum: ['left', 'center', 'right'] },
      parseValue: (v) => v.toLowerCase(),
      validateValue: (v) => ['left', 'center', 'right'].includes(v)
    },
    {
      name: 'start-offset',
      description: 'Start playback from this offset (seconds) in the audio file',
      type: 'number',
      constraints: { min: 0 },
      parseValue: (v) => parseFloat(v),
      validateValue: (v) => v >= 0
    },
    {
      name: 'end-offset',
      description: 'End playback at this offset (seconds) in the audio file',
      type: 'number',
      constraints: { min: 0 },
      parseValue: (v) => parseFloat(v),
      validateValue: (v) => v >= 0
    },
    {
      name: 'stop',
      description: 'Stop behavior: "all" (stop all), "previous" (stop last), or comma-separated cue IDs',
      type: 'string',
      parseValue: (v) => v.trim(),
      validateValue: (v) => {
        if (v === 'all' || v === 'previous') return true
        return v.split(',').every(id => id.trim().match(/^cue_\d+$/))
      }
    }
  ]
}
```

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
