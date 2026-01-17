# Toolbar.vue

## Purpose

The `Toolbar.vue` component provides the main user interface for interacting with the application. It contains controls for opening files, managing sounds, controlling speech recognition, and navigating the document.

## Functionality

### Props

- `selectedLine`: An object that represents the currently selected line in the document.
- `state`: An object that holds the current state of the application.

### Emits

- `update:listening`: Emitted when the user toggles the "Listening" checkbox.
- `update:autoscroll`: Emitted when the user toggles the "Autoscroll" checkbox.
- `select-sound-folder`: Emitted when the user selects a sound folder.
- `file-loaded`: Emitted when the user selects a file to open.
- `reload-file`: Emitted when the user clicks the "Reload" button.
- `reset-view`: Emitted when the user clicks the "Reset" button.
- `clear-document`: Emitted when the user clicks the "Open File" button.
- `goto-page-number`: Emitted when the user changes the page number.
- `find-text`: Emitted when the user searches for text.
- `open-google-picker`: Emitted when the user clicks the "Open from Google Drive" button.
- `download-sound-csv`: Emitted when the user clicks the "Download Sound CSV" button.

### Template

- The toolbar is divided into several sections:
    - **Top Row**: Contains controls for opening files, selecting a sound folder, and downloading a sound CSV. On mobile devices, this row is collapsible.
    - **Bottom Row**: Contains controls for toggling speech recognition and autoscroll, resetting the view, and navigating to a specific page or finding text.
    - **Messages**: Displays the transcript of the heard text, as well as any error or status messages.
    - **Logo**: Displays the application logo and version number.

### Script

- The `setup` function defines the component's props and emits.
- It uses the `ref` function to create reactive variables for the page number input, the find text input, and a boolean to indicate if the view is mobile.
- It defines several functions that emit events when the user interacts with the toolbar controls.
- It uses a `watch` to monitor the `selectedLine` prop and updates the `pageNumberInput` ref accordingly.
- The `onMounted` and `onUnmounted` lifecycle hooks are used to add and remove a resize event listener that checks for mobile size.

### Styling

- The component's styles are imported from `../css/toolbar.css`.
- The `:class` binding is used to apply different CSS classes to the toolbar based on whether the application is currently listening for speech.
