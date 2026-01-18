# WebAudioSoundManager.js

## Purpose

The `WebAudioSoundManager.js` module is an advanced audio playback controller designed as a drop-in replacement for `SoundManager.js`. It leverages the Web Audio API to provide more granular control over sound playback, including stereo balance (panning) and accurate volume control, while maintaining compatibility with the existing application interface.

## Class: `WebAudioSoundManager`

This is the main class that encapsulates all Web Audio API-based sound management logic.

### Constructor

- `constructor(soundProcessor)`: Initializes the manager and a single `AudioContext` instance.
    - **Requires**: An instance of the `SoundProcessor` class.
    - Initializes `audioContext`: Creates a new `AudioContext` to manage all Web Audio API nodes. Includes error handling for browser compatibility.

### Properties

- **`playingAudios`**: A Vue `ref` object. It holds a record of all currently playing sounds, indexed by their reference ID. Each record contains:
    - `audio`: The `AudioBufferSourceNode` instance, which is the actual sound source.
    - `gainNode`: The `GainNode` connected to the source, used for volume control.
    - `pannerNode`: The `StereoPannerNode` connected after the `gainNode`, used for stereo balance.
    - `timeLeft`: The remaining playback time in seconds (for UI display).
    - `duration`: The total duration of the audio.
    - `interval`: The ID of the `setInterval` used to update `timeLeft` (for UI).
    - `line`: The original line object associated with the sound, for context.
- **`onSoundEndCallbacks`**: An array of callback functions executed when a sound finishes playing.
- **`audioContext`**: The instance of `AudioContext` used for all audio processing.

### Methods

- **`playOrStopSound(line, lines)`**: Toggles playback for a sound cue.
    - `line`: The line object for the sound cue.
    - `lines`: The full array of document lines, used for "Stop Prev" functionality.

- **`isPreloaded(ref)`**: Checks if a sound's data is available. (Note: `SoundProcessor` would ideally preload `ArrayBuffers` for optimal Web Audio API use).

- **`playSound(line, lines)`**: Plays a sound cue using the Web Audio API.
    1.  **Context Resume**: Ensures `audioContext` is resumed if suspended (common for browser autoplay policies).
    2.  **File Processing**: Reads the sound file as an `ArrayBuffer` and decodes it into an `AudioBuffer`.
    3.  **Node Creation**: Creates an `AudioBufferSourceNode`, `GainNode` (for volume), and `StereoPannerNode` (for balance).
    4.  **Connect Nodes**: Establishes the audio graph: `sourceNode -> gainNode -> pannerNode -> audioContext.destination`.
    5.  **Initial Settings**: Sets initial volume and balance (`pan`) based on `line.soundCue` properties.
    6.  **`onended` Handler**: Sets up `sourceNode.onended` to call `stopSound` and trigger `onSoundEndCallbacks` when the sound finishes.
    7.  **Playback**: Calls `sourceNode.start(0)` to begin playback.
    8.  **Tracking**: Calls `updatePlayingAudios` to manage the sound's state in `playingAudios`.
    9.  **Stop Other Cues**: Handles `line.soundCue.stopAll` and `line.soundCue.stopPrev` logic similar to `SoundManager.js`.

- **`updatePlayingAudios(ref, sourceNode, gainNode, pannerNode, duration, line)`**: Manages the reactive state for a playing sound.
    - Calculates `timeLeft` and `duration` and sets up an `setInterval` for UI updates.

- **`stopSound(ref)`**: Stops a currently playing sound.
    - Stops the `AudioBufferSourceNode`.
    - Disconnects all associated audio nodes (`sourceNode`, `gainNode`, `pannerNode`) from the audio graph.
    - Clears the UI update interval.
    - Removes the sound's record from `playingAudios`.

- **`stopAllSounds()`**: Stops all active sounds.

- **`setVolume(ref, volume)`**: Sets the volume of a playing sound.
    - Updates the `gainNode.gain.value` (converts 0-100 to 0.0-1.0).

- **`setBalance(ref, balance)`**: Sets the stereo balance of a playing sound.
    - Updates the `pannerNode.pan.value` (converts -100 to 100 to -1.0 to 1.0).

- **`isPlaying(ref)`**: Checks if a sound is currently playing.

- **`isSoundAvailable(ref)`**: Checks `soundProcessor` if a file exists.

- **`clear()`**: Clears all sounds and releases Web Audio API resources by closing the `AudioContext`.

## Dependencies

- **Vue (`ref`)**: Used for reactive state management.
- **`soundProcessor.js`**: Relies on this module to find and access audio file data.
- **Web Audio API**: Core browser API for advanced audio processing.