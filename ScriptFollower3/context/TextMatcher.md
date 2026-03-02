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

1.  **Search Window**: Defines a search range around `options.activeIndex`.
2.  **Iterate Window**: Loops through each line within the defined window.
3.  **Calculate Best Phonetic Score**: Performs comparisons against the `spokenText`:
    - **Normalisation**: Lowercase, remove punctuation, smart quotes, and collapse whitespace.
    - **Sliding Window (Transcript > Line)**: If the spoken transcript is longer, it slides a window over the transcript to find the line. This catches the line even if surrounded by other words.
    - **Sliding Window (Line > Transcript)**: If the line is longer, it slides a window over the line to find the transcript. This is crucial for matching dialogue that follows a character name (e.g., "NAME: Dialogue").
4.  **Phonetic Similarity**: Uses `phoneticSimilarity` to compare normalised Soundex codes.
5.  **Length Penalty**: Applies a non-linear penalty based on the ratio of words matched. This ensures that matching 1 word of a 10-word line is penalised compared to matching 8 words.
6.  **Weighting**: Applies position-based decay to the raw score.
7.  **Threshold Check**: Returns the highest scoring match if it exceeds `options.threshold`.

## Phonetic Scoring

### `phoneticSimilarity(a: string, b: string): number`

The similarity score is a combination of two algorithms:

1.  **Jaccard Similarity (40%)**: Calculates the overlap of unique Soundex codes (Bag of Words). This handles "what" words were spoken regardless of order.
2.  **Longest Common Subsequence (LCS) (60%)**: Calculates the length of the longest common subsequence of Soundex codes. This rewards words spoken in the **correct order**, even if other words are interspersed.

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

✅ **Decoupled**: Operates on `IMatchableLine` interface.
✅ **Robust**: Handles "filler" words and minor misrecognitions via phonetic similarity.
✅ **Ordered**: Rewards correct word sequence via LCS.
✅ **Progressive**: Favors forward movement via the linear weight decay system.
✅ **Scalable**: Handles both short segments and longer transcriptions.
