# DocumentViewer.vue

## Purpose

The `DocumentViewer.vue` component is the primary view for displaying the content of a script or document. It is responsible for rendering each line of the document, highlighting the active line, and providing controls for interacting with embedded sounds.

## Functionality

### Props

- `lines`: An array of line objects, where each object represents a line in the document.
- `setActiveLineEl`: A function that is called to set the active line element.
- `selectUserLine`: A function that is called when the user clicks on a line.
- `soundManager`: An object that manages the playback of sounds.
- `state`: An object that holds the current state of the application, including the user-selected line index and the speech-active line index.

### Template

- The component iterates through the `lines` array and renders each line as a paragraph (`<p>`) element.
- Each line has a `data-line-idx` attribute that corresponds to its index in the `lines` array.
- The `:class` binding is used to apply different CSS classes to the lines based on their state:
    - `active-line`: The line that is currently selected by the user.
    - `speech-highlight`: The line that is currently being highlighted by the speech recognition.
    - `active-line-no-match`: The line that is highlighted by speech recognition, but does not match the expected text.
- Each line has a `click` event handler that calls the `selectUserLine` function with the line's index.
- The `toHTML` function is used to format the text of each line, including highlighting character names and dialogue.
- If a line is of type `SOUND`, it will display a set of controls for playing, stopping, and monitoring the sound. The play button's `click` event calls `soundManager.playOrStopSound(line, lines)`, passing both the specific line and the entire array of lines.
- When a `SOUND` line is the currently selected line (`state.userSelectedLineIdx`), an expanded set of advanced controls becomes visible:
    - **Stop All**: A checkbox that, when ticked, causes all other playing sounds to stop when this cue is played.
    - **Stop Prev**: A checkbox that, when ticked, causes the previous sound cue in the script to stop when this cue is played.
    - **Volume**: A slider and number input to control the sound's volume.
    - **Balance (L/R)**: A slider and number inputs to control the left/right stereo balance.
    - **Channel**: A dropdown to select the audio output channel (A or B).

### Script

- The `setup` function defines the component's props and a `highlightRules` array.
- The `highlightRules` array defines a set of regular expressions that are used to highlight different parts of a line, such as character names and dialogue.
- The `toHTML` function takes a line object as input and returns an HTML string with the appropriate highlighting and formatting.
- The component imports and uses the following modules:
    - `secondsToMinutes` and `wrapWithSpans` from `../modules/utilities.js`.
    - `lineTypeDocClassMap` and `lineTypeLabel` from `../modules/constants.js`.

### Styling

- The component's styles are imported from `../css/documentViewer.css`.
