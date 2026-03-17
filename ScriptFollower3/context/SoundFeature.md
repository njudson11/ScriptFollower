# Sound Feature Implementation

## Overview

The Sound Feature is a core plugin for ScriptFollower 3 that handles synchronized audio playback. It leverages the advanced `AudioPlaybackManager` to provide low-latency, multi-channel audio directly controlled by script cues and annotations. It supports dynamic stereo panning (moving sounds between speakers), annotation-only actions, and intelligent resource management.

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
  readonly pan: 'left' | 'right' | 'centre';
  readonly panStart?: number; // -1.0 to 1.0, optional override for start balance
  readonly panEnd?: number;   // -1.0 to 1.0, optional override for end balance
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
- **Annotation Override**: Users can manually override the routing via the `{chan=X}` annotation.

### 3. Dynamic Stereo Panning
The feature supports moving sounds across the stereo field during playback:
- **Balance Range**: Users can set independent start and end balance values (-1.0 Left to 1.0 Right).
- **Linear Transition**: The system automatically ramps the balance from the start value to the end value over the duration of the playback segment.
- **Visualization**: The `AudioWaveform` component displays an orange dashed "Balance Path" line indicating the movement of the sound.

### 4. End Behaviour (New)
The system can trigger specific actions when a sound effect reaches the end of its playback:
- **Loop**: Restarts the sound effect. Can be set to a specific `loop-count` or indefinite (0).
- **Next Line**: Automatically selects the next sequential line in the script.
- **Next Cue**: Jumps to the next line of type `SOUND_CUE`.
- **Jump to Reference**: Navigates directly to a specific cue identified by its `soundRef`. The UI provides a search-ahead dropdown to help find valid references.

### 5. Comprehensive Annotations
The feature supports fine-grained playback control via script annotations:
- `volume`: `0-100`
- `pan`: `-1` to `1`, or `left/centre/right` (Static balance)
- `pan-start`: `-1` to `1` (Dynamic start position)
- `pan-end`: `-1` to `1` (Dynamic end position)
- `chan`: Virtual channel ID (matches names in Mixing Desk)
- `start`: Start offset in seconds
- `end`: End offset in seconds
- `fade-in`: Duration in milliseconds
- `fade-out`: Duration in milliseconds
- `stop`: Stop behavior (`all`, `previous`, or a list of SoundRefs like `[0001,0004]`)
- `end-behaviour`: One of `none`, `loop`, `next-line`, `next-cue`, `jump-to`
- `loop-count`: Number of loops (for `loop` behaviour)
- `jump-ref`: Target `soundRef` (for `jump-to` behaviour)
- `preload`: `true/false`. If true, forces the audio buffer to stay in memory regardless of script position.
- **Trigger-only Annotations**: Lines with `SOUND_CUE` type can have annotations that trigger actions (e.g., `{stop:all}`) even without an associated sound file. These display a 'Trigger' button in the UI.

## UI Components & Modular Widgets

The Sound Feature leverages the **Modular Widget System** instead of a standalone custom renderer:
- **`WidgetToggle`**: Handles Play/Stop logic with professional monochrome icons (`Play`, `Square`, `Loader`, `Zap`).
- **`WidgetTimer`**: Displays real-time time-remaining with **2-digit millisecond precision** (`M:SS.mm`) in the main Document Viewer.
- **`WidgetProgress`**: Provides a compact progress bar with embedded time-remaining text for the Sidebar.
- **Persistent Visibility**: Timer and Progress widgets are displayed as soon as a sound is **loaded**, providing a duration preview even when not playing.
- **`SoundCuePanel.vue`**: Detailed settings panel in the right sidebar featuring controls for all parameters, including a checkbox for **Pre-load (Keep Loaded)**.
- **Master Audio Panel**: Integrated mixing desk for global and per-channel volume, mute, hardware output device mapping, and ad-hoc audio playback testing.

## Keybindings

- `Space`: Toggle Play/Stop for the currently selected sound cue, or trigger the annotation for annotation-only cues.
- `Escape`: Stop all currently playing sounds globally.
- `ArrowDown`: Navigate to the next line.
- `ArrowUp`: Navigate to the previous line.

## Pre-loading Strategy
The feature implements an intelligent, proactive pre-loading engine:
- **Window Monitoring**: Automatically pre-loads audio buffers for cues within a specific window (e.g., 10 lines ahead of the current selection).
- **Active Playback Protection**: The system explicitly **prevents unloading or destroying players that are currently playing**, even if they move outside the pre-loading window.
- **Cleanup**: Idle players are disposed of to manage memory effectively.
