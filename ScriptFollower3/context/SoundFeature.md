# Sound Feature - Reference Implementation

## Overview

The Sound Feature is a complete reference implementation of `IFeaturePlugin` showing:
- How to store feature data
- How to declare keybindings
- How to declare annotations
- How to register custom highlights
- How to respond to events

## Feature Declaration

```typescript
class SoundFeature implements FeaturePlugin {
  readonly id = 'sound'
  readonly name = 'Sound'
  readonly version = '1.0.0'
  readonly description = 'Play audio cues synchronized with script lines'
}
```

## Data Structures

```typescript
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
}

class SoundFeature {
  private cuesByLineId: Map<string, SoundCue[]> = new Map()
  private currentlyPlaying: Set<string> = new Set()  // cue IDs
  private audioElements: Map<string, HTMLAudioElement> = new Map()
}
```

## Initialization

```typescript
async init(): Promise<void> {
  // Subscribe to document events
  this.eventBus.subscribe(EVENT_TYPES.DOCUMENT_LOADED, (event) => {
    this.onDocumentLoaded(event)
  })

  this.eventBus.subscribe(EVENT_TYPES.DOCUMENT_UNLOADED, (event) => {
    this.onDocumentUnloaded(event)
  })

  console.log(`Sound Feature initialized`)
}

private onDocumentLoaded(event: Event) {
  const { documentId } = event.payload
  console.log(`Sound Feature: Preparing for document ${documentId}`)
  // Initialize sound data for this document
}

private onDocumentUnloaded(event: Event) {
  // Stop all playing sounds
  this.stopAll()
  // Clear sound data
  this.cuesByLineId.clear()
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
playSoundForLine(lineId: string) {
  const cues = this.cuesByLineId.get(lineId) ?? []
  
  // Check for stop annotation
  const stopAnnotation = this.getStopAnnotation(lineId)
  if (stopAnnotation) {
    this.executeStopAction(stopAnnotation)
  }
  
  // Play all cues for this line
  for (const cue of cues) {
    this.playCue(cue)
  }
  
  this.selectionManager.addHighlight(lineId, 'sound:playing')
}

async playCue(cue: SoundCue) {
  try {
    const audio = new Audio(cue.url)
    audio.volume = cue.volume / 100
    audio.playbackRate = cue.speed
    
    if (cue.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, cue.delay))
    }
    
    audio.play()
    this.currentlyPlaying.add(cue.id)
    this.audioElements.set(cue.id, audio)
    
    audio.onended = () => {
      this.currentlyPlaying.delete(cue.id)
      this.audioElements.delete(cue.id)
    }
  } catch (error) {
    this.eventBus.emit({
      type: EVENT_TYPES.FEATURE_ERROR,
      payload: {
        featureId: this.id,
        error: `Failed to play cue ${cue.id}: ${error}`
      },
      timestamp: new Date()
    })
  }
}

stopAll() {
  for (const audio of this.audioElements.values()) {
    audio.pause()
    audio.currentTime = 0
  }
  this.audioElements.clear()
  this.currentlyPlaying.clear()
  
  // Remove all playing highlights
  for (const line of this.cuesByLineId.keys()) {
    this.selectionManager.removeHighlight(line, 'sound:playing')
  }
}

playOrPause(lineId: string | null) {
  if (!lineId) return
  
  const isPlaying = this.currentlyPlaying.size > 0
  if (isPlaying) {
    this.stopAll()
  } else {
    this.playSoundForLine(lineId)
  }
}

executeStopAction(action: string) {
  if (action === 'all') {
    this.stopAll()
  } else if (action === 'previous') {
    // Stop sound from previous line only
    const currentLine = this.selectionManager.getCurrentLine()
    if (currentLine) {
      const lines = this.appStore.getLines()
      const idx = lines.findIndex(l => l.id === currentLine)
      if (idx > 0) {
        const prevLine = lines[idx - 1]
        this.stopLineSound(prevLine.id)
      }
    }
  } else {
    // Comma-separated cue IDs
    const cueIds = action.split(',').map(id => id.trim())
    for (const cueId of cueIds) {
      const audio = this.audioElements.get(cueId)
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    }
  }
}

increaseVolume() {
  // Increase master volume for all currently playing sounds
  for (const audio of this.audioElements.values()) {
    audio.volume = Math.min(1.0, audio.volume + 0.1)
  }
}

decreaseVolume() {
  for (const audio of this.audioElements.values()) {
    audio.volume = Math.max(0.0, audio.volume - 0.1)
  }
}

jumpToNextCue(currentLineId: string | null) {
  if (!currentLineId) return
  
  const lines = this.appStore.getLines()
  const currentIdx = lines.findIndex(l => l.id === currentLineId)
  
  // Find next line with sound cue
  for (let i = currentIdx + 1; i < lines.length; i++) {
    if (this.cuesByLineId.has(lines[i].id)) {
      this.selectionManager.selectLine(lines[i].id)
      break
    }
  }
}

jumpToPreviousCue(currentLineId: string | null) {
  if (!currentLineId) return
  
  const lines = this.appStore.getLines()
  const currentIdx = lines.findIndex(l => l.id === currentLineId)
  
  // Find previous line with sound cue
  for (let i = currentIdx - 1; i >= 0; i--) {
    if (this.cuesByLineId.has(lines[i].id)) {
      this.selectionManager.selectLine(lines[i].id)
      break
    }
  }
}

addCueToLine(lineId: string, cue: SoundCue) {
  if (!this.cuesByLineId.has(lineId)) {
    this.cuesByLineId.set(lineId, [])
  }
  this.cuesByLineId.get(lineId)!.push(cue)
}

getCuesForLine(lineId: string): SoundCue[] {
  return this.cuesByLineId.get(lineId) ?? []
}

async destroy(): Promise<void> {
  this.stopAll()
  console.log(`Sound Feature destroyed`)
}
```

## Example Usage

### Load Document

```
User loads "my-script.odt"
↓
EventBus emits DOCUMENT_LOADED
↓
Sound Feature initializes cue data
```

### Play Sound with Annotation

```
Script line:
  JOHN
  {volume=60, speed=1.2}
  Hello there!

User presses Space
↓
Sound Feature plays cue at 60% volume, 1.2x speed
↓
Line highlighted as "sound:playing"
```

### Stop All Sounds

```
Script line:
  CROWD_SOUND
  {stop=all}

User navigates to this line
↓
Sound Feature stops all currently playing sounds
```

## Benefits

✅ Reference implementation for developers
✅ Shows keybinding integration
✅ Shows annotation integration
✅ Shows event integration
✅ Shows highlight registration
✅ Complete feature lifecycle
✅ Error handling patterns
✅ Feature data isolation
