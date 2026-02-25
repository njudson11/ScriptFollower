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
  readonly channelId?: string; // Target virtual audio channel
}
```

## Core Functionality

### 1. Script-Based Sound Matching
Sound cues are automatically associated with audio files based on a numerical prefix matching strategy:
- **ODT Extraction**: The parser extracts the leading numerical ID from a `SOUND_CUE` line (e.g., `"SOUND A	0001 – PreShow House.mp3"` extracts `soundRef: "0001"`).
- **Audio Filenames**: Audio files are mapped by their leading numerical/alphanumeric part (e.g., `"0001 PreShow.mp3"` is mapped to key `"0001"`).
- **Automatic Association**: When a project folder is loaded, the feature matches these IDs to link playback controls to script lines.

### 2. Multi-Channel Routing
Sounds can be mixed into independent virtual channels via annotations:
- **Annotation**: `{chan=FX}` or `{chan=Music}`.
- **Routing**: The `AudioPlaybackManager` creates independent mixing buses for each channel, allowing for individual volume and mute control via the **Master Audio Panel**.

### 3. Comprehensive Annotations
The feature supports fine-grained playback control via script annotations:
- `volume`: `0-100`
- `pan`: `-1` to `1`, or `left/center/right`
- `chan`: Virtual channel ID (matches names in Master Audio Panel)
- `start`: Start offset in seconds
- `end`: End offset in seconds
- `fade-in`: Duration in milliseconds
- `fade-out`: Duration in milliseconds
- `stop`: Stop behavior (`all`, `previous`, or a list of SoundRefs like `[0001,0004]`)

## UI Components

- **`SoundCueLine.vue`**: Custom renderer for script lines of type `SOUND_CUE`, providing inline Play/Stop buttons and progress indicators.
- **`SoundCuePanel.vue`**: Detailed settings panel in the right sidebar for the selected sound cue.
- **Master Audio Panel**: Integrated view for global mixing, channel management, and a live monitor of all active sounds.

## Keybindings

- `Space`: Toggle Play/Stop for the currently selected sound cue.
- `Escape`: Stop all currently playing sounds globally.

## Pre-loading Strategy
The feature implements intelligent proactive pre-loading:
- Monitors the current script line.
- Automatically instructs `AudioPlaybackManager` to load audio buffers for cues within a specific window (configurable, e.g., 10 lines ahead).
- Unloads distant cues to optimize memory usage.
