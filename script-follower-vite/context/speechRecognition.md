# speechRecognition.js

## Purpose

The `speechRecognition.js` module provides a simple and reusable "composable" or hook for interacting with the browser's native Web Speech API. It encapsulates the setup, event handling, and state management required for speech-to-text functionality, offering a clean interface to start and stop the recognition service.

## Function: `useSpeechRecognition`

This is the main export of the module. It's a factory function that creates and configures a speech recognition instance.

### Parameters

- **`onResult(transcript)`**: A mandatory callback function that is invoked when the speech recognition service finalizes a result. It receives the recognized text as a single string argument.
- **`onError(error)`** (optional): A callback function that is invoked when a recognition error occurs (e.g., "no-speech", "network", "not-allowed"). It receives the error event object.
- **`onEnd()`** (optional): A callback function that is invoked when the recognition service ends, either because it was manually stopped or because it timed out.

### Return Value

The function returns an object containing methods and properties to control and query the speech recognition service:

- **`start()`**: A method to begin the speech recognition service. It will only start if the service is not already listening.
- **`stop()`**: A method to manually stop the speech recognition service.
- **`isListening`** (getter): A boolean property that returns `true` if the recognition service is currently active, and `false` otherwise.
- **`isSupported`**: A boolean flag that indicates whether the user's browser supports the Web Speech API (`SpeechRecognition` or the prefixed `webkitSpeechRecognition`).

### Internal Logic

1.  **Feature Detection**: It first checks for the existence of `window.SpeechRecognition` or `window.webkitSpeechRecognition` to set the `isSupported` flag.
2.  **Initialization**: If supported, it creates a new `SpeechRecognition` instance.
3.  **Configuration**: It configures the instance with the following settings:
    - `continuous = true`: The service will continue to listen for speech, even after a pause, until it is explicitly stopped. This is key for the "always-on" listening feature.
    - `interimResults = false`: The `onresult` event will only fire for final, complete results, not for intermediate ones.
    - `lang = 'en-GB'`: Sets the recognition language to British English.
4.  **Event Handlers**:
    - `onresult`: When a result is received, it extracts the transcript from the latest result, trims whitespace, and passes it to the `onResult` callback.
    - `onerror`: If an error occurs, it calls the optional `onError` callback and sets the internal `listening` flag to `false`.
    - `onend`: When the service stops, it sets the `listening` flag to `false` and calls the optional `onEnd` callback.

## Dependencies

This module relies entirely on the **Web Speech API**, a standard browser feature. It has no other external library dependencies.
