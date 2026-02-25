# Audio Playback Component Architecture

## Overview

This document outlines the architecture for the robust and flexible Audio Playback system in ScriptFollower 3. It leverages the Web Audio API to provide instant playback, virtual mixing channels, real-time monitoring, and system-level output device selection.

## Core Component: AudioPlayer

The `AudioPlayer` manages the lifecycle and playback of individual audio buffers. It handles loading, decoding, gain (volume), panning (balance), and precise timing for start/stop and fades.

### Key Features
1.  **Low Latency**: Direct Web Audio API usage for near-instant response.
2.  **Independent Mixing**: Each player is connected to a virtual channel mixing bus.
3.  **Sample-Accurate Segments**: Play specific segments with millisecond precision.
4.  **Envelopes**: Linear ramp volume fades for smooth entry/exit.

## Mixing Engine: Virtual Channels

The system implements a hierarchical mixing structure:
`AudioPlayer` -> `VirtualChannel (GainNode)` -> `MasterGainNode` -> `AudioContext Destination`

### 1. IVirtualChannel Interface
```typescript
interface IVirtualChannel {
  readonly id: string;
  readonly name: string;
  readonly volume: number; // 0.0 to 1.0
  readonly isMuted: boolean;
  readonly outputDeviceId: string;
}
```

### 2. Multi-Channel Routing
- **Default Routing**: All sounds default to the "Master Out" channel.
- **Custom Routing**: Sounds can be routed to specific virtual channels (e.g., "FX", "Vocals", "Monitors") via the `chan` annotation in the script or ad-hoc selection.
- **Independent Control**: Each channel has its own volume and mute state, allowing for complex sub-mixes.

## Management & Monitoring

### 1. AudioPlaybackManager
The central singleton managing the `AudioContext` and orchestrating all playback.

- **`getPlayer(id, url, channelId)`**: Obtains a player instance, automatically routing it to the specified virtual channel's gain node.
- **`getCurrentlyPlayingPlayers()`**: Returns a live array of active `IAudioPlayer` instances for real-time UI monitoring.
- **Global Orchestration**: `stopAll()`, `pauseAll()`, `setGlobalVolume()`, and `setGlobalMute()`.

### 2. Real-Time Playback monitor
The system tracks every active sound across the application, providing:
- **Identifier**: `soundRef` (from script) or filename.
- **Target**: Which virtual channel it is being mixed into.
- **Progress**: Current playback position relative to duration.
- **Control**: Dedicated stop buttons for individual active sounds.

## Technical Implementation

### Web Audio API Integration
- **`AudioContext`**: Single shared context for the entire application.
- **`GainNode` Hierarchy**: Managed by `AudioPlaybackManager` to ensure efficient mixing without redundant node creation.
- **`setSinkId`**: Used for global output device selection, triggered by user interaction in the UI.

### Pre-loading & Caching
- **Intelligent Pre-loading**: `SoundFeature` monitors the current script line and proactively pre-loads audio buffers for nearby cues.
- **Memory Management**: Transient `IAudioPlayer` instances are disposed of when they are no longer in the proximity window or have finished playback.

## Security & Permissions
- **User Gesture**: Playback and device selection (`setSinkId`) are initiated by direct user actions to comply with browser security models.
- **Device Labels**: `getUserMedia` is optionally used to ensure system-level audio output labels (e.g., "Realtek High Definition Audio") are accessible to the user.

## Future Roadmap
- **3D Spatialization**: Support for PannerNodes to place sounds in a 3D space.
- **Effects Routing**: Ability to insert dynamic effects (reverb, compression) per virtual channel.
- **Electron Integration**: Direct file system streaming and multi-device simultaneous output.
