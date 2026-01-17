# soundProcessor.js

## Purpose

The `SoundProcessor.js` module is responsible for managing the collection of sound files provided by the user. Its primary roles are to index these files based on a naming convention (a 4-digit prefix), preload them for faster playback, and provide a way for the `SoundManager` to look up and access them.

## Class: `SoundProcessor`

This is the main class that encapsulates the logic for handling the sound file collection.

### Constructor

- `constructor(files = [])`: Initializes a new `SoundProcessor`.
    - Takes an optional `files` array (expected to be a `FileList` from a folder input).
    - Initializes an `audioMap` (`Map`) to store preloaded `Audio` objects.
    - Immediately calls `setFiles` to process the initial set of files.

### Methods

- **`setFiles(files)`**: Sets or resets the collection of sound files.
    - Stores the `files` array.
    - Calls `preloadFiles` to begin loading the audio data into memory.

- **`clear()`**: Clears out all stored files and the preloaded audio map. It also empties the `src` of each `Audio` object to help release memory.

- **`preloadFiles(files)`**: The core preloading mechanism.
    1.  Clears any existing `audioMap`.
    2.  Iterates through each `File` in the provided `files` array.
    3.  For each file, it creates an `Object URL`.
    4.  It instantiates a new `Audio` object with this URL.
    5.  It sets the audio element's `preload` property to `'auto'` to hint to the browser that it should start downloading the file.
    6.  It extracts a `ref` by taking the first 4 characters of the filename (e.g., "0001" from "0001-explosion.mp3").
    7.  It stores the `Audio` object in the `audioMap` with the `ref` as the key.

- **`findPreloadedSound(ref)`**: Retrieves a preloaded `Audio` object from the `audioMap` using its 4-digit reference key. This provides instant access to an `Audio` element that is ready to be played.

- **`findSoundFile(ref)`**: Searches the original `files` array to find the `File` object whose name starts with the given 4-digit reference. This is a fallback or check to see if a file for a given reference exists, even if it's not preloaded.

- **`isSoundAvailable(ref)`**: A boolean utility method that uses `findSoundFile` to quickly check if a sound file corresponding to the `ref` exists in the loaded folder.

- **`playSound(ref)` (Legacy/Alternative)**: An alternative play method that first checks for a preloaded sound and plays it. If not found, it falls back to `playSoundByInline`. *Note: In the current application architecture, the `SoundManager` handles the actual playback, making this method less central.*

- **`playSoundByInline(ref)` (Legacy/Alternative)**: Finds the sound file, creates an `Object URL` and a new `Audio` element on the fly, and then plays it. This is less efficient than using preloaded sounds.

- **`playSoundPreloaded(ref)` (Legacy/Alternative)**: A direct method to play a sound from the `audioMap`.

## Dependencies

This module is self-contained and has no external dependencies. It relies solely on standard browser APIs (`File`, `Map`, `Audio`, `URL.createObjectURL`).
