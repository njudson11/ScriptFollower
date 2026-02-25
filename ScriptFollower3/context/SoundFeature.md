# Sound Feature Implementation

## Overview

The Sound Feature is a core plugin for ScriptFollower 3 that handles synchronized audio playback. It leverages the advanced `AudioPlaybackManager` to provide low-latency, multi-channel audio directly controlled by script cues and annotations.

## Feature Declaration

```typescript
class SoundFeature implements FeaturePlugin {
  readonly id = 'sound-feature'
  readonly name = 'Sound Cues'
  readonly version = '1.0.0'
  readonly description = 'Provides playback controls for sound cues within the script.'
}
```

## Data Structures

### SoundCue
```typescript
interface SoundCue {
  readonly id: string;
  readonly url: string;
  readonly name: string;
  readonly volume: number; // 0-100
  readonly pan: 'left' | 'right' | 'center';
  readonly startOffsetSeconds?: number;
  readonly endOffsetSeconds?: number;
  readonly fadeIn?: number; // ms
  readonly fadeOut?: number; // ms
  readonly channelId: string; // Target virtual audio channel (e.g., 'A', 'FX')
}
```

## Core Functionality

### 1. Script-Based Sound Matching
Sound cues are automatically associated with audio files based on a numerical prefix matching strategy:
- **ODT Extraction**: The parser extracts the leading numerical ID from a `SOUND_CUE` line (e.g., `"SOUND A	0001 – PreShow House.mp3"` extracts `soundRef: "0001"`).
- **Audio Filenames**: Audio files are mapped by their leading numerical/alphanumeric part (e.g., `"0001 PreShow.mp3"` is mapped to key `"0001"`).
- **Automatic Association**: When a project folder is loaded, the feature matches these IDs to link playback controls to script lines.

### 2. Multi-Channel Routing
The system implements a flexible routing logic controlled by the script and mixing desk:
- **Automatic Channel Creation**: Upon loading a script, the feature scans for unique `lineSubType` values (e.g., "A", "B", "FX") and automatically creates a corresponding virtual mixing channel for each.
- **Default Routing**: Sound cues automatically route to the virtual channel that matches their script subtype. If no subtype is specified, it defaults to **"Channel A"**.
- **Annotation Override**: Users can manually override the routing via the `{chan=X}` annotation, which is easily managed through the UI settings panel.

### 3. Comprehensive Annotations
The feature supports fine-grained playback control via script annotations:
- `volume`: `0-100`
- `pan`: `-1` to `1`, or `left/center/right`
- `chan`: Virtual channel ID (matches names in Mixing Desk)
- `start`: Start offset in seconds
- `end`: End offset in seconds
- `fade-in`: Duration in milliseconds
- `fade-out`: Duration in milliseconds
- `stop`: Stop behavior (`all`, `previous`, or a list of SoundRefs like `[0001,0004]`)

## UI Components

- **`SoundCueLine.vue`**: Custom renderer for script lines of type `SOUND_CUE`, providing inline Play/Stop buttons and progress indicators.
- **`SoundCuePanel.vue`**: Detailed settings panel in the right sidebar featuring a **Virtual Channel selector** for routing overrides.
- **Master Audio Panel**: Integrated mixing desk for global and per-channel volume, mute, and hardware output device mapping.

## Keybindings

- `Space`: Toggle Play/Stop for the currently selected sound cue.
- `Escape`: Stop all currently playing sounds globally.

## Pre-loading Strategy
The feature implements an intelligent, proactive pre-loading engine:
- **Window Monitoring**: Automatically pre-loads audio buffers for cues within a specific window (e.g., 10 lines ahead of the current selection).
- **Active Playback Protection**: The system explicitly **prevents unloading or destroying players that are currently playing**, even if they move outside the pre-loading window.
- **Cleanup**: Idle players are disposed of to manage memory effectively as the user navigates the script.
