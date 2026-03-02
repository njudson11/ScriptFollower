# Text Matcher Architecture

## Overview

The `TextMatcher` is the core of the application's speech-to-text matching logic. Its primary responsibility is to find the most likely corresponding line in the script for a given segment of recognized speech. 

It combines **phonetic matching** (Soundex), a **sliding window** approach, and a **position-based weighting system** to ensure accurate matching even with recognition errors or extra "filler" words.

## Interfaces

To ensure decoupling from the core `ScriptLineBase` data model, the matcher works with a generic interface.

```typescript
export interface IMatchableLine {
  readonly text: string;
}

export interface TextMatcherOptions {
  readonly activeIndex?: number;
  readonly preWindow: number;     // Lines to search before activeIndex
  readonly postWindow: number;    // Lines to search after activeIndex
  readonly threshold: number;     // Minimum similarity (0-1) for a valid match
  readonly weights: {
    readonly maxPreWeight: number;  // Initial weight for previous lines (e.g., 1.5)
    readonly maxPostWeight: number; // Initial weight for future lines (e.g., 2.0)
  };
}

export interface MatchResult {
  readonly index: number;         // Index of the matched line, or -1 if no match
  readonly score: number;         // The weighted similarity score
  readonly rawScore: number;      // The unweighted phonetic similarity score
}
```

## Core Functions

### `findClosestLine<T extends IMatchableLine>(lines: readonly T[], spokenText: string, options: TextMatcherOptions): MatchResult`

The primary matching engine.

#### Matching Process

1.  **Search Window**: Defines a search range around `options.activeIndex`. If no index is provided, it searches the entire collection.
2.  **Iterate Window**: Loops through each line within the defined window.
3.  **Spoken Text Sliding Window**: Performs comparisons against the `spokenText`:
    - **Exact Match**: Compares the line to the entire `spokenText`.
    - **Subsequence Matching**: If `spokenText` is longer than the line, it creates a sliding window over words in `spokenText` of the same length as the line. This catches the line even if surrounded by other words (e.g., "The line is **once upon a time**").
    - **Partial Matching**: If `spokenText` is shorter, it compares against the start of the line.
4.  **Phonetic Scoring**: Uses `phoneticSimilarity` to compare normalised Soundex codes.
5.  **Weighting**: Applies position-based decay to the raw score.
6.  **Threshold Check**: Returns the highest scoring match if it exceeds `options.threshold`.

## Phonetic Scoring

### `phoneticSimilarity(a: string, b: string): number`

1.  **Normalise**: Lowercase, remove punctuation and smart quotes.
2.  **Soundex**: Convert each word to its 4-character phonetic code.
3.  **Unique Sets**: Compare sets of unique Soundex codes from both phrases.
4.  **Ratio**: `score = (common codes) / (unique codes in longer phrase)`.

### Soundex Algorithm Mapping
- `B, F, P, V` -> `1`
- `C, G, J, K, Q, S, X, Z` -> `2`
- `D, T` -> `3`
- `L` -> `4`
- `M, N` -> `5`
- `R` -> `6`

## Weighting System

The system uses linear decay to favor forward progress while still allowing for backtracking.

- **Forward (distance >= 1)**: 
  `weight = maxPostWeight - ((maxPostWeight / postWindow) * distance)`
- **Backward (distance < 0)**: 
  `weight = maxPreWeight - ((maxPreWeight / preWindow) * abs(distance))`
- **Active Line**: `weight = 1.0`

**Result**: `weightedScore = rawScore * weight`

## Success Criteria

✅ **Decoupled**: Operates on `IMatchableLine` interface, not core data models.
✅ **Robust**: Handles "filler" words and minor misrecognitions via phonetic similarity.
✅ **Progressive**: Favors forward movement via the linear weight decay system.
✅ **Flexible**: Configurable search windows and thresholds.

### Integration with `LineSelectionManager`

The `TextMatcher` is typically used in conjunction with `LineSelectionManager` to highlight matched lines and advance the selection:

```typescript
const match = textMatcher.findClosestLine(lines, transcript, {
  activeIndex: selectionManager.getCurrentIndex(),
  preWindow: 5,
  postWindow: 15,
  threshold: 0.4,
  weights: { maxPreWeight: 1.5, maxPostWeight: 2.0 }
});

if (match.index !== -1) {
  const lineId = lines[match.index].id;
  selectionManager.selectLine(lineId);
  selectionManager.addHighlight(lineId, 'voice:matched');
}
```
