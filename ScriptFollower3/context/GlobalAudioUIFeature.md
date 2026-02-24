# Global Audio UI Feature

## Overview

The Global Audio UI Feature (`GlobalAudioUIFeature`) is responsible for providing user interface elements that control global audio settings within ScriptFollower 3. This includes selecting the audio output device, adjusting the global volume, and toggling the global mute state. This feature will inject the `AudioPlaybackManager` and provide Vue components that can be integrated into various parts of the main application UI (e.g., Toolbar, RightPanel, or a dedicated Settings Modal).

## Feature Declaration

```typescript
class GlobalAudioUIFeature implements FeaturePlugin {
  readonly id = 'global-audio-ui'
  readonly name = 'Global Audio UI'
  readonly version = '1.0.0'
  readonly description = 'Provides UI for global audio settings like device selection, volume, and mute.'
}
```

## Data Structures

This feature primarily interacts with the `AudioPlaybackManager`'s state (available devices, current device, global volume, global mute) and does not maintain significant internal state beyond what's needed for its UI components.

## Dependencies

-   `AudioPlaybackManager`: For all audio-related operations and state.
-   `EventBus`: To subscribe to audio-related events (e.g., `AUDIO_DEVICES_UPDATED`, `AUDIO_GLOBAL_VOLUME_CHANGED`, `AUDIO_GLOBAL_MUTE_CHANGED`) and keep its UI reactive.
-   `AppStore`: (Optional) If UI needs to be aware of other global app states (e.g., if a settings panel is open).

## UI Components

This feature will primarily expose Vue components designed to be integrated into other parts of the application's UI.

### 1. `AudioSettingsPanel.vue` (Main UI Component)

This component will encapsulate the core global audio settings. It can be rendered in a `RightPanel` tab or a settings modal.

**Props**: None (relies on injected managers)
**Injected Managers**: `audioPlaybackManager`, `eventBus`

```vue
<template>
  <div class="audio-settings-panel">
    <h3>Audio Output</h3>
    <div class="setting-group">
      <label for="audio-device-select">Output Device:</label>
      <select id="audio-device-select" v-model="selectedDeviceId" @change="handleDeviceChange" :disabled="!availableDevices.length">
        <option v-for="device in availableDevices" :key="device.deviceId" :value="device.deviceId">
          {{ device.label || `Device ${device.deviceId.substring(0, 8)}` }}
        </option>
      </select>
      <p v-if="!availableDevices.length" class="warning">No audio output devices found. Ensure permissions are granted.</p>
    </div>

    <h3>Global Volume</h3>
    <div class="setting-group volume-control">
      <input type="range" min="0" max="1" step="0.01" v-model="globalVolume" @input="handleVolumeChange" />
      <span>{{ Math.round(globalVolume * 100) }}%</span>
      <button @click="toggleMute" class="mute-button">
        <span v-if="isMuted">🔇</span>
        <span v-else>🔊</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, inject, watch } from 'vue';
import type { AudioPlaybackManager } from '@/core/AudioPlaybackManager'; // Assuming core/AudioPlaybackManager
import { EventBus, AUDIO_EVENT_TYPES } from '@/core/EventBus'; // Assuming core/EventBus and AUDIO_EVENT_TYPES

const audioPlaybackManager = inject('audioPlaybackManager') as AudioPlaybackManager;
const eventBus = inject('eventBus') as EventBus;

const availableDevices = ref<MediaDeviceInfo[]>([]);
const selectedDeviceId = ref<string>(audioPlaybackManager.getCurrentOutputDeviceId());
const globalVolume = ref<number>(audioPlaybackManager.getGlobalVolume());
const isMuted = ref<boolean>(audioPlaybackManager.getGlobalMute());

let unsubscribeDeviceUpdates: (() => void) | null = null;
let unsubscribeVolumeChanges: (() => void) | null = null;
let unsubscribeMuteChanges: (() => void) | null = null;

onMounted(async () => {
  // Ensure we have permission to list devices (getUserMedia often required)
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (e) {
    console.warn("Microphone access denied, some audio output devices might not be listed.", e);
  }
  
  availableDevices.value = await audioPlaybackManager.getAvailableOutputDevices();
  selectedDeviceId.value = audioPlaybackManager.getCurrentOutputDeviceId(); // Re-fetch in case it changed

  unsubscribeDeviceUpdates = eventBus.subscribe(AUDIO_EVENT_TYPES.AUDIO_DEVICES_UPDATED, async () => {
    availableDevices.value = await audioPlaybackManager.getAvailableOutputDevices();
    selectedDeviceId.value = audioPlaybackManager.getCurrentOutputDeviceId();
  });

  unsubscribeVolumeChanges = eventBus.subscribe(AUDIO_EVENT_TYPES.AUDIO_GLOBAL_VOLUME_CHANGED, (event) => {
    globalVolume.value = event.payload.volume;
  });

  unsubscribeMuteChanges = eventBus.subscribe(AUDIO_EVENT_TYPES.AUDIO_GLOBAL_MUTE_CHANGED, (event) => {
    isMuted.value = event.payload.muted;
  });
});

onBeforeUnmount(() => {
  unsubscribeDeviceUpdates?.();
  unsubscribeVolumeChanges?.();
  unsubscribeMuteChanges?.();
});

const handleDeviceChange = async (event: Event) => {
  const newDeviceId = (event.target as HTMLSelectElement).value;
  await audioPlaybackManager.setOutputDevice(newDeviceId); // Will trigger AUDIO_DEVICE_CHANGED event
};

const handleVolumeChange = () => {
  audioPlaybackManager.setGlobalVolume(globalVolume.value); // Will trigger AUDIO_GLOBAL_VOLUME_CHANGED event
};

const toggleMute = () => {
  audioPlaybackManager.setGlobalMute(!isMuted.value); // Will trigger AUDIO_GLOBAL_MUTE_CHANGED event
};
</script>

<style scoped>
.audio-settings-panel {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
}

.audio-settings-panel h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--color-text-secondary);
}

.setting-group {
  margin-bottom: 15px;
}

.setting-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 13px;
}

.setting-group select, .setting-group input[type="range"] {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  font-size: 13px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.volume-control input[type="range"] {
  flex-grow: 1;
}

.volume-control span {
  width: 40px;
  text-align: right;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.mute-button {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 16px;
  cursor: pointer;
  color: var(--color-text);
}

.mute-button:hover {
  background-color: var(--color-hover);
}

.warning {
  font-size: 12px;
  color: var(--color-warning); /* Define this CSS var if not exists */
  margin-top: 5px;
}
</style>
```

### 2. Integration into RightPanel

The `RightPanel` (or a dedicated settings modal) would be the ideal place to render the `AudioSettingsPanel.vue`.

```typescript
// GlobalAudioUIFeature.ts
// ... inside the feature's class
getPanelComponent() {
    return AudioSettingsPanel; // A method to return the main UI component
}
```

## Integration with FeatureManager

The `GlobalAudioUIFeature` will be registered with the `FeatureManager` like other features.

```typescript
// App.vue (after AudioPlaybackManager instantiation)
const globalAudioUIFeature = new GlobalAudioUIFeature(eventBus, audioPlaybackManager);
featureManager.registerFeature(globalAudioUIFeature);
```

## Lifecycle

### `init()`

-   Subscribe to relevant `AudioPlaybackManager` events (via `EventBus`) to ensure UI state (`availableDevices`, `selectedDeviceId`, `globalVolume`, `isMuted`) is always synchronized.
-   Perform initial device enumeration and set UI state.

### `destroy()`

-   Unsubscribe from all `EventBus` events to prevent memory leaks.

## Testing

1.  **Unit Tests**:
    *   **`GlobalAudioUIFeature`**: Test its `init()` and `destroy()` methods for correct event subscriptions/unsubscriptions and initial state setup.
    *   **`AudioSettingsPanel.vue`**: Test component rendering, user interactions (changing device, volume, mute), and verification that `AudioPlaybackManager` methods are called with correct arguments. Mock `audioPlaybackManager` and `eventBus` injections.
2.  **Integration Tests**:
    *   Verify that `GlobalAudioUIFeature` correctly updates its UI when `AudioPlaybackManager` emits events (e.g., `AUDIO_DEVICES_UPDATED`).
    *   Ensure that changes made in the UI (e.g., selecting a new device) are correctly propagated through `AudioPlaybackManager`.
3.  **E2E Tests**:
    *   Load the application, open the settings panel, and interact with the audio controls.
    *   Verify the list of devices, change the device, adjust volume/mute, and confirm that these changes affect audio playback (if an audio file is playing).
