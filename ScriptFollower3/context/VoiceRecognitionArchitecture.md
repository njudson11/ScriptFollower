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
  // Configured engine (e.g., WebSpeechEngine)
  private engine: IVoiceRecognitionEngine;
  
  // Matching logic
  private textMatcher: TextMatcher;
  
  // State management
  private currentTranscript: string = '';
  private highlightTimeouts: Map<string, any> = new Map();
  
  private handleResult(result: VoiceRecognitionResult): void;
  private clearAllVoiceHighlights(): void;
  private removeVoiceHighlight(lineId: string): void;
}
```

## Workflow

1.  **Initialization**: The `FeatureManager` initializes the `VoiceRecognitionFeature`. The engine is injected (currently `WebSpeechEngine`).
2.  **Activation**: The user starts voice recognition via a toolbar toggle, keybinding (`Ctrl+V`), or action.
3.  **Listening**: The active `IVoiceRecognitionEngine` captures audio and emits `VoiceRecognitionResult` events (both interim and final).
4.  **Transcript Processing**:
    - The `currentTranscript` is updated in the `AppStore` for live visual feedback in the UI.
    - The transcript is passed to the `TextMatcher` alongside the currently selected line index to scope the search.
5.  **Matching**:
    - **High Confidence**: If the match score meets the `threshold`, a `voice:matched` highlight is added.
    - **Partial Match**: If a match is found but is below the threshold or the result is interim, a `voice:partial` highlight is added.
6.  **Action**: If a high-confidence match is found and `setFocusOnMatch` is enabled:
    - `ActionController` dispatches `SELECT_LINE`.
    - The UI auto-scrolls to the matched line.
    - The `currentTranscript` is reset if the result was `isFinal` to prepare for the next line.

## Interchangeable Engines

| Engine | Pros | Cons |
| :--- | :--- | :--- |
| **Web Speech API** | Native, free, low latency. | Browser-dependent (Best in Chrome). |
| **OpenAI Whisper** | High accuracy, multi-lingual. | Requires API key or heavy local WASM. |

## Feature Highlights

The feature registers custom highlight types to provide visual feedback:

- `voice:matched`: High confidence match (Light Green background, Green border).
- `voice:partial`: Interim result or lower confidence match (Light Yellow background, Yellow border).
- `voice:listening`: Reserved for future "active window" visualization.

## Matching Strategy

The system uses a **Proximity-Weighted Phonetic Matcher**:
- **Soundex**: Converts words to phonetic codes to handle misspellings or varying accents.
- **Sliding Window**: Slides the transcript over the script lines (and vice-versa) to find the best overlapping sequence.
- **Weighting**: Gives higher weight to lines immediately following the current selection (`postWindow`) and lower weight to previous lines (`preWindow`) to encourage forward progress.

## Highlight Cleanup

To prevent UI clutter, voice highlights are temporary:
- **Linger**: Highlights persist for a configurable duration (`matchLingerMs`, default 1s).
- **Uniqueness**: The `LineSelectionManager` ensures only one highlight of a specific type exists per line.
- **Cleanup**: Stopping the voice engine or switching matches automatically clears previous highlights and their associated timeouts.

## Configuration (`AppConfig.ts`)

```typescript
voice: {
  setFocusOnMatch: false,
  language: 'en-GB',
  matchLingerMs: 1000,
  textMatcher: {
    preWindow: 5,
    postWindow: 15,
    threshold: 0.3,
    weights: {
      maxPreWeight: 1.5,
      maxPostWeight: 2.0
    }
  }
}
```

## Runtime State (`AppStore`)

- `lastVoiceTranscript`: Stores the latest string from the engine for display in the `Toolbar`.
- `voiceSettings.setFocusOnMatch`: User-toggleable setting to enable/disable auto-scrolling.
