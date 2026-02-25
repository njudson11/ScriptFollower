# Global Audio UI Feature (Master Audio Panel)

## Overview

The Global Audio UI is implemented via the **Master Audio Panel**. It serves as the centralized mixing desk and monitoring hub for all audio operations within ScriptFollower 3. It integrates directly with the `AudioPlaybackManager` to provide global output control, virtual channel mixing, and real-time playback monitoring.

## Feature Declaration

```typescript
class MasterAudioPanelFeature implements FeaturePlugin {
  readonly id = 'master-audio-panel'
  readonly name = 'Master Audio'
  readonly version = '1.0.0'
  readonly description = 'Provides a centralized mixing desk and real-time playback monitor.'
}
```

## Core UI Components

### 1. Master Bus Section
Provides global control over the application's audio hardware integration:
- **Global Volume & Mute**: Master fader and toggle that synchronizes across all active audio contexts.
- **Hardware Output Selector**: Maps the entire application signal to a specific physical device.
- **Enable Device Names**: A privacy-aware button that requests temporary microphone permission to "unlock" and display friendly hardware labels (e.g., "External Headphones" instead of "Output 1").

### 2. Mixing Desk (Virtual Channels)
Provides independent control over routed audio streams:
- **Automatic Channel strips**: Dynamically generated strips for every unique sound cue subtype (e.g., "Channel A", "Channel B", "FX").
- **Independent Faders**: Per-channel volume and mute controls.
- **Environment-Aware Routing**: In supported environments (like Electron or multi-device enabled browsers), each strip includes a hardware mapping selector. In standard browsers, these are hidden to prevent confusion, with a clear "Browser Limitation" notice provided.

### 3. Now Playing monitor
A live, real-time list of all active audio players across the application:
- **Sound Identification**: Displays the `soundRef` (from script) or filename for every playing cue.
- **Routing indicator**: Shows which virtual channel each sound is currently mixed into.
- **Progress Monitoring**: Real-time progress bars and time-remaining displays for each individual sound.
- **Individual Stop**: Dedicated stop buttons for surgically terminating specific active sounds.

## Integration & Lifecycle

- **Reactivity**: The panel uses the `EventBus` to subscribe to `AUDIO_EVENT_TYPES`. It automatically refreshes the device list when hardware is plugged/unplugged and updates playback progress every 100ms.
- **Persistence**: Virtual channel settings (volume, mute, and device mapping) are persisted in the `AppStore`, ensuring the mixing desk state is preserved when navigating between different application views.
- **Cleanup**: The feature implements a strict cleanup lifecycle, ensuring all global listeners and intervals are destroyed when the component is unmounted or the feature is unregistered.

## Browser vs. Desktop Support

| Feature | Browser (Standard) | Desktop (Electron / Supported) |
| :--- | :--- | :--- |
| **Global Output** | Functional | Functional |
| **Per-Channel Output** | Hidden (Global Default) | Functional (Multi-Context) |
| **Mixing Desk** | Functional | Functional |
| **Device Labels** | Needs "Enable" click | Always Visible |
