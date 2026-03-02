# Voice Recognition Architecture

## Overview

The Voice Recognition system is designed as a decoupled, modular feature that follows the `IFeaturePlugin` pattern. Its primary goal is to provide hands-free script following by converting spoken dialogue into transcripts and matching them against the script using the `TextMatcher`.

To ensure flexibility, the system separates the **Orchestration Logic** (Feature Plugin) from the **Recognition Engine** (Interchangeable Provider).

## Core Interfaces

### `IVoiceRecognitionEngine`

This interface abstracts the underlying speech-to-text technology, allowing for easy switching between Web Speech API, OpenAI Whisper, or other providers.

```typescript
export interface VoiceRecognitionResult {
  readonly transcript: string;
  readonly isFinal: boolean;
  readonly confidence: number;
}

export interface IVoiceRecognitionEngine {
  readonly id: string;
  readonly name: string;
  readonly isSupported: boolean;
  readonly isRunning: boolean;

  init(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Callbacks for orchestration
  onResult(callback: (result: VoiceRecognitionResult) => void): void;
  onError(callback: (error: Error) => void): void;
  onStatusChange(callback: (status: 'idle' | 'listening' | 'processing') => void): void;
}
```

### `VoiceRecognitionFeature` (Plugin)

The main feature class that implements `IFeaturePlugin` and orchestrates the flow.

```typescript
class VoiceRecognitionFeature implements IFeaturePlugin {
  // Configured engine (e.g., WebSpeechEngine, WhisperEngine)
  private engine: IVoiceRecognitionEngine;
  
  // Logic
  private handleResult(result: VoiceRecognitionResult): void;
  private updateSelection(matchIndex: number): void;
}
```

## Workflow

1.  **Initialization**: The `FeatureManager` initializes the `VoiceRecognitionFeature`. The feature selects the engine based on `AppConfig` or user preference.
2.  **Activation**: The user starts voice recognition via a toolbar toggle or keybinding (dispatched through `ActionController`).
3.  **Listening**: The active `IVoiceRecognitionEngine` captures audio and emits `VoiceRecognitionResult` events.
4.  **Transcript Processing**:
    - **Interim Results**: Optional visual feedback in the UI (e.g., "Hearing: ...").
    - **Final Results**: Passed to the `TextMatcher`.
5.  **Matching**: The `TextMatcher` compares the transcript against the lines in the current search window.
6.  **Action**: If a match is found:
    - `ActionController` dispatches `SELECT_LINE`.
    - `LineSelectionManager` adds a `voice:matched` highlight.
    - The UI auto-scrolls to the matched line.

## Interchangeable Engines

The application can support multiple engine implementations:

| Engine | Pros | Cons |
| :--- | :--- | :--- |
| **Web Speech API** | Native, free, low latency. | Browser-dependent, requires internet for some OS. |
| **OpenAI Whisper** | High accuracy, multi-lingual. | Requires server/API or heavy local WASM. |
| **Vosks / Local** | Private, offline-ready. | Higher CPU usage, larger assets. |

## Feature Highlights

The feature registers custom highlight types with the `HighlightTypeRegistry` to provide visual feedback:

- `voice:matched`: High confidence match (Green border).
- `voice:partial`: Interim match or low confidence (Yellow border).
- `voice:listening`: Visual indicator of the line currently being "watched" for matches.

## Configuration (`AppConfig.ts`)

The feature is controlled via the `voice` section in the configuration:

```typescript
voice: {
  engineId: 'web-speech', // 'web-speech' | 'whisper-api' | 'vosk-local'
  autoRestart: true,
  continuous: true,
  interimResults: true,
  language: 'en-GB',
  
  // Default focus behaviour (stored in AppConfig, mirrored in AppStore)
  setFocusOnMatch: false, // Default: false. If true, selects the line (scrolling/focus).
  
  textMatcher: { ... } // TextMatcherOptions
}
```

## Runtime State (`AppStore`)

The `setFocusOnMatch` setting is mirrored in the `AppStore` and can be toggled by the user at runtime. Features should always check `appStore.state.voiceSettings.setFocusOnMatch` rather than the static `AppConfig`.

## Workflow (Updated Match Behavior)

1.  **Match Detected**: The `TextMatcher` identifies a line index with a score above the threshold.
2.  **Visual Feedback**: A `voice:matched` highlight is **always** added to the matched line.
3.  **Conditional Focus**:
    - **If `setFocusOnMatch` (from store) is `true`**: 
        - The feature dispatches the `SELECT_LINE` action.
        - The `LineSelectionManager` updates the `currentLineId`.
        - The UI performs a `stickyScroll` to bring the line into view.
    - **If `setFocusOnMatch` (from store) is `false`**:
        - The feature **only** adds the highlight via `selectionManager.addHighlight()`.
        - The user's current selection and scroll position remain unchanged.
        - The highlight typically uses an expiry timer to fade away.

## Stream Handling Strategy

To support both rolling streams (interim results) and discrete sentences, the `VoiceRecognitionFeature` employs the following strategies:

### 1. The Rolling Buffer
For engines providing continuous interim results (like Web Speech API), the feature maintains a "moving window" of recognized words. 
- **Append**: New words are appended to a local `currentTranscript` buffer.
- **Match**: The `TextMatcher` slides over this buffer to find matches.
- **Prune**: Once a line is successfully matched and focused, the buffer is pruned of the matched text and any preceding "filler" words to keep the matching window focused on the next potential line.

### 2. Segmented Matching
For engines providing discrete blocks of text (like Whisper API):
- The feature waits for a complete segment.
- The `TextMatcher` performs a high-confidence phonetic check.
- Because there is no "rolling" context, the `preWindow` and `postWindow` in `TextMatcherOptions` are critical for maintaining position.

## Success Criteria

✅ **Streaming Ready**: The `TextMatcher` sliding window handles continuous input without requiring explicit sentence boundaries.
✅ **Non-Intrusive**: Supports a "monitoring only" mode where matches are highlighted without jumping the view.
✅ **Hot-swappable**: Engines can be changed by updating a single config or factory.
✅ **Decoupled**: The `TextMatcher` and `LineSelectionManager` have no knowledge of the specific voice engine.
✅ **PWA Friendly**: Supports engines that work offline (Web Speech on Chrome/Android, or local WASM).
✅ **Feedback**: Provides immediate visual feedback when speech is detected.
✅ **Correctness**: Correctly handles "filler" words and background noise via the `TextMatcher`'s phonetic logic.
