# soundManager.js

## Purpose

The `SoundManager.js` module is the primary controller for all audio playback within the ScriptFollower application. It is responsible for playing, stopping, and tracking the state of sounds referenced in the script. It acts as an abstraction layer over the browser's `Audio` API, providing a clean and reactive interface for the Vue components to interact with.

## Class: `SoundManager`

This is the main class that encapsulates all sound management logic.

### Constructor

- `constructor(soundProcessor)`: Initializes the manager.
    - **Requires**: An instance of the `SoundProcessor` class. This dependency is crucial as the `SoundManager` uses the `soundProcessor` to find and retrieve the actual audio files based on their reference IDs.

### Properties

- **`playingAudios`**: A Vue `ref` object. This is the reactive heart of the manager. It holds a record of all currently playing sounds, indexed by their reference ID. Each record contains:
    - `audio`: The `HTMLAudioElement` instance.
    - `timeLeft`: The remaining playback time in seconds.
    - `duration`: The total duration of the audio.
    - `interval`: The ID of the `setInterval` used to update `timeLeft`.
    - `url`: The object URL created for the audio file.
- **`onSoundEndCallbacks`**: An array of callback functions that are executed when a sound finishes playing naturally (i.e., not when explicitly stopped). This is used, for example, to automatically advance to the next line in the script.

### Methods

- **`playOrStopSound(line, lines)`**: A public toggle function. If the sound is playing, it stops it; otherwise, it plays it. This is the main method used by UI buttons.
    - `line`: The line object corresponding to the sound cue.
    - `lines`: The full array of document lines, used to find the previous cue for the "Stop Prev" functionality.

- **`playSound(line, lines)`**: The internal method to start playback.
    1.  **Stop Other Cues**: It first checks the line's `soundCue` properties. If `stopAll` is true, it stops all currently playing sounds. If `stopPrev` is true, it searches backwards through the `lines` array to find the most recent previous sound cue and stops it if it's playing.
    2.  **Check Availability**: Checks if the sound is available via `soundProcessor`.
    3.  **Get File**: Finds the sound file or preloaded audio object from `soundProcessor`.
    4.  **Create Audio Object**: Creates a new `Audio` object if one isn't preloaded.
    5.  **Track Playback**: Sets up an `onloadedmetadata` event to get the audio's duration and then calls `updatePlayingAudios` to add the sound to the reactive `playingAudios` record.
    6.  **Play**: Calls `audio.play()`.
    7.  **Handle End**: Sets up an `onended` event to clean up the sound state and trigger the `onSoundEndCallbacks`.

- **`stopSound(ref)`**: Stops a currently playing sound.
    1.  Finds the sound in the `playingAudios` record.
    2.  Pauses the audio and resets its `currentTime`.
    3.  Clears the `setInterval` that was updating the `timeLeft`.
    4.  Revokes the object URL to free up memory.
    5.  Removes the sound's record from the reactive `playingAudios` object.

- **`stopAllSounds()`**: Iterates through all sounds in `playingAudios` and calls `stopSound` for each one. This is a cleanup utility, often used when the component is unmounted.

- **`updatePlayingAudios(ref, audio, url)`**: Adds a new sound to the `playingAudios` state. It also initiates a `setInterval` to periodically update the `timeLeft` property for that sound, creating the countdown effect in the UI.

- **`isPreloaded(ref)`**: Checks with the `soundProcessor` to see if a sound has been preloaded into memory.

- **`isPlaying(ref)`**: A simple getter that checks if a sound with the given `ref` exists in the `playingAudios` record.

- **`isSoundAvailable(ref)`**: A passthrough method that asks the `soundProcessor` if a file for the given `ref` exists.

- **`clear()`**: A full cleanup method that stops all sounds, clears the `playingAudios` state, and calls the `clear` method on the associated `soundProcessor`.

## Dependencies

- **Vue (`ref`)**: Used to create the reactive `playingAudios` state, which automatically updates the UI when changed.
- **`soundProcessor.js`**: Relies on this module to find and access the audio file data.
