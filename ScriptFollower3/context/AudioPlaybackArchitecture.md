# Audio Playback Component Architecture

## Overview

This document outlines the architecture for the robust and flexible Audio Playback system in ScriptFollower 3. It leverages the Web Audio API to provide instant playback, virtual mixing channels, real-time monitoring, and independent hardware routing via a multi-context engine.

## Core Component: AudioPlayer

The `AudioPlayer` manages the lifecycle and playback of individual audio buffers. It handles loading, decoding, gain (volume), panning (balance), and precise timing for start/stop and fades.

### Key Features
1.  **Low Latency**: Direct Web Audio API usage for near-instant response.
2.  **Independent Mixing**: Each player is connected to a virtual channel mixing bus.
3.  **Sample-Accurate Segments**: Play specific segments with millisecond precision.
4.  **Envelopes**: Linear ramp volume fades for smooth entry/exit.

## Mixing Engine: Multi-Context Routing

The system implements a hierarchical mixing structure that can span multiple hardware devices:
`AudioPlayer` -> `VirtualChannel (GainNode)` -> `MasterGainNode` -> `AudioContext (Hardware Mapped)`

### 1. IVirtualChannel Interface
```typescript
interface IVirtualChannel {
  readonly id: string;
  readonly name: string;
  readonly volume: number; // 0.0 to 1.0
  readonly isMuted: boolean;
  readonly outputDeviceId: string; // Target hardware device ID
}
```

### 2. Multi-Context Architecture
To overcome the browser's single-output limitation, the `AudioPlaybackManager` maintains a pool of `AudioContext` instances:
- **Dedicated Contexts**: A unique `AudioContext` is created or retrieved for every unique physical output device in use.
- **Hardware Mapping**: Each context is mapped to hardware using `setSinkId`.
- **Synchronized Global Bus**: Master volume and mute commands are broadcast to all active contexts simultaneously.

### 3. Mixing Desk structure
- **Primary Default**: The system leads with **"Channel A"** as the base mixing target.
- **Automatic Generation**: Upon script load, virtual channels are automatically generated for each unique sound subtype found.
- **Persistent Routing**: Mappings between virtual channels and hardware devices are persisted in the `AppStore`.

## Management & Monitoring

### 1. AudioPlaybackManager
The central singleton managing the context pool and orchestrating all playback.
- **`isMultiDeviceSupported`**: Detects if the environment allows independent hardware routing (`setSinkId` support).
- **`getPlayer(id, url, channelId)`**: Obtains a player instance, automatically routing it to the correct device-mapped context based on the channel's assignment.
- **`requestPermissions()`**: Triggers a microphone request to unlock hardware device labels for the user.

### 2. Real-Time Playback monitor
Tracks every active sound across all contexts, providing:
- **Identifier**: `soundRef` (from script metadata) or filename.
- **Target**: Which virtual channel it is being mixed into.
- **Progress**: Real-time position and duration monitoring.

## Technical Implementation

### Pre-loading & Caching
- **Intelligent Pre-loading**: `SoundFeature` monitors the current script line and pre-loads buffers for nearby cues.
- **Active Playback Protection**: The system explicitly prevents unloading or destroying players that are currently audible, even if they move outside the preloading window.
- **Resource Disposal**: Idle players are disposed of to manage memory effectively when navigating large scripts.

## Security & Permissions
- **User Gesture**: Hardware device selection and playback activation are tied to direct user interactions.
- **Privacy Compliance**: Device labels are hidden until the user explicitly "unlocks" them via the permission request button.

## Future Roadmap
- **3D Spatialization**: Support for PannerNodes to place sounds in a 3D space.
- **Effects Routing**: Ability to insert dynamic effects (reverb, compression) per virtual channel.
- **Electron Integration**: Native file system streaming and multi-device simultaneous output without browser context overhead.
