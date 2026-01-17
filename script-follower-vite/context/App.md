# App.vue

## Purpose

`App.vue` is the root component of the ScriptFollower application. It orchestrates the main layout, manages the global application state, handles file loading and processing, integrates speech recognition, and coordinates interactions between the `Toolbar`, `Sidebar`, and `DocumentViewer` components.

## Functionality

### State Management (reactive `state` object)

The component uses a `reactive` object named `state` to manage various global application states, including:

- `version`: Application version.
- `message`, `error`: For displaying user feedback or error messages.
- `transcript`: Stores the latest speech recognition transcript.
- `listening`: Boolean, indicates if speech recognition is active.
- `prevActiveLineIdx`, `userSelectedLineIdx`, `speechActiveLineIdx`: Indices for navigation and highlighting of lines.
- `noMatch`, `hasMatched`: Flags for speech recognition matching status.
- `autoscroll`: Boolean, enables/disables automatic scrolling.
- `lastFile`, `soundFolderPath`, `filename`: Information about the loaded document and sound folder.
- `loading`: Boolean, indicates if a document is being loaded.
- `allowSpaceCharacter`: Boolean, used to control spacebar behavior.

### Components

- **`Toolbar`**:
    - Props: `selectedLine`, `state`.
    - `v-model:listening`, `v-model:autoscroll`: Binds listening and autoscroll state.
    - Emits handled: `file-loaded`, `reset-view`, `reload-file`, `clear-document`, `select-sound-folder`, `goto-page-number`, `find-text`, `download-sound-csv`.
- **`Sidebar`**:
    - Props: `lines`, `activeLineIdx`, `onSelectUserLine`, `playingAudios`, `soundManager`, `state`, `style` (for width), `onToggleSidebar`.
    - Conditionally rendered based on `sidebarVisible`.
    - Resizable via a `sidebar-divider`.
- **`DocumentViewer`**:
    - Props: `lines`, `setActiveLineEl`, `selectUserLine`, `soundManager`, `state`.
    - Occupies the main content area.

### Core Logic & Functionality

- **Document Processing**: Uses `DocumentProcessor` to load, parse, and manage document lines.
    - `handleFile(event)`: Loads selected files (DOCX, PDF, ODT) into `docProcessor`.
    - `clearDocument()`: Clears the current document and local storage.
    - `reloadFile()`: Reloads the last opened file.
- **Speech Recognition**: Utilizes `useSpeechRecognition` hook for speech-to-text functionality.
    - `handleSpeechError(err)`: Manages speech recognition errors and restart attempts.
    - `restartSpeechRecognition()`: Restarts the speech recognition service.
    - `speech` object: Provides `start()` and `stop()` methods for controlling listening.
- **Sound Management**: Integrates `SoundProcessor` and `SoundManager` for handling audio cues.
    - `handleSoundFolderChange(e)`: Sets the sound folder based on user selection.
    - `soundManager.value.onSoundEndCallbacks.push(advanceLineOnSoundEnd)`: Advances the `userSelectedLineIdx` when a sound ends.
    - `downloadSoundCSV()`: Generates and downloads a CSV file of sound cues.
- **Navigation and Highlighting**:
    - `selectUserLine(idx)`: Sets the `userSelectedLineIdx` and updates related states.
    - `highlightLineByPageNumber(pageNumber)`: Navigates to a specific page number.
    - `findNextText(text)`: Searches for text within the document lines.
    - `scrollToLineIndex(newIdx)`: Scrolls the `DocumentViewer` to a specific line.
    - `setActiveLineEl(el)`: Sets the active DOM element reference for scrolling.
- **UI/UX Enhancements**:
    - `resetView()`: Resets all active line indices and speech states.
    - `toggleSidebar()`: Toggles the visibility of the sidebar.
    - Sidebar Resizing: Implements drag-and-drop resizing for the sidebar.
    - Mobile Responsiveness: Adjusts sidebar visibility and toolbar layout for mobile.
    - Wake Lock API: Prevents the screen from turning off during use.
- **Local Storage Integration**:
    - `saveToLocalStorage()`: Saves document state to browser's local storage.
    - `restoreFromLocalStorage()`: Restores document state from local storage on mount.
    - `clearLocalStorage()`: Clears document-related data from local storage.
- **Keyboard Navigation**: `onKeyDown(e)` handles `ArrowDown`, `ArrowUp`, and `Space` keys for line navigation and sound playback.

### Lifecycle Hooks

- `onMounted()`: Attaches event listeners for keyboard, window resize, restores state from local storage, and requests wake lock.
- `onBeforeUnmount()`: Removes event listeners to prevent memory leaks.
- `watch`ers: Reactively respond to changes in `userSelectedLineIdx`, `speechActiveLineIdx`, `listening`, and `selectedLine?.pageNumber` to update UI and trigger actions.

### Utilities

- Imports various utility functions from `../modules/utilities.js`, `../modules/constants.js`, etc.

## Styling

- The component uses flexible box layout (`display: flex;`) for the main content area.
- Styling is primarily handled by the child components and global CSS, with some inline styles for layout.
