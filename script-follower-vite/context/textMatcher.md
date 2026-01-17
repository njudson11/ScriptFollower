# textMatcher.js

## Purpose

The `textMatcher.js` module is the core of the application's speech-to-text matching logic. Its primary responsibility is to take the text recognized by the speech recognition engine and find the most likely corresponding line in the script. It uses a sophisticated approach that combines phonetic matching (Soundex) with a sliding window and a weighting system to produce accurate results, even when the recognized speech isn't a perfect match.

## Core Functions

### `findClosestLine(lines, spokenText, ...)` and `findClosestLine2(lines, spokenText, ...)`

These are the main public functions. Both perform the same fundamental task but operate on different data structures:
- `findClosestLine`: Expects an array of simple strings.
- `findClosestLine2`: Expects an array of `lineDefinition` objects and uses the `line.description` property for matching.

#### Parameters

- `lines`: An array of script lines (either strings or `lineDefinition` objects).
- `spokenText`: The string of recognized speech.
- `activeIdx`: The index of the currently active line, which serves as the center of the search window.
- `preWindow`, `postWindow`: The number of lines to search before and after the `activeIdx`.
- `threshold`: A similarity score (0-1) that a match must exceed to be considered valid.

#### Matching Process

1.  **Search Window**: It defines a search window around the `activeIdx`. If no `activeIdx` is given, it searches the entire document.
2.  **Iterate Lines**: It loops through each line within the search window.
3.  **Sliding Window (Spoken Text)**: For each line, it performs a complex comparison against the `spokenText`:
    - It first compares the script line to the entire `spokenText`.
    - It then creates a "sliding window" over the words in `spokenText`. If the spoken phrase is longer than the script line, it compares the script line against every possible subsequence of the spoken text that has the same length. This is crucial for matching a line when the user says more than just the line itself (e.g., "Okay, now, **the line of dialogue** is what I'm saying").
    - If the spoken phrase is shorter, it compares it against the start of the script line.
4.  **Phonetic Scoring**: Each comparison is done using `phoneticSimilarity`, which calculates a score based on how similar the words *sound*, not just how they are spelled. This makes the matching robust against minor mispronunciations or recognition errors.
5.  **Weighting**: The raw similarity score is then weighted based on the line's position relative to the `activeIdx`.
    - Lines that appear *after* the current line are given a higher weight, making the algorithm favor forward progress through the script.
    - The further away a line is from the `activeIdx`, the lower its weight becomes.
6.  **Best Match**: The function keeps track of the line with the highest `weightedScore`.
7.  **Threshold Check**: After checking all lines in the window, if the best score found is above the `threshold`, the index of that line is returned. Otherwise, `-1` is returned, indicating no confident match was found.

## Helper Functions

### `phoneticSimilarity(a, b)`

This is the heart of the matching algorithm.

- **Process**:
    1.  Normalizes both input strings (lowercase, removes punctuation).
    2.  Splits each string into an array of words.
    3.  Applies the `soundex` algorithm to each word, converting it into a 4-character phonetic code (e.g., "example" -> "E251").
    4.  Compares the arrays of Soundex codes to find common codes.
    5.  Returns a similarity score based on the number of common codes divided by the number of unique codes in the longer phrase.

### `soundex(word)`

A standard implementation of the Soundex algorithm, which indexes words by their English pronunciation.

### `normalize(str)`

A utility function to clean up strings by converting them to lowercase and removing a wide range of punctuation and special characters before they are passed to the phonetic algorithm.

### `wordOverlapSimilarity(a, b)`

A simpler, alternative similarity function based on direct word overlap rather than phonetics. (Note: This function is not used by the main `findClosestLine` functions in the current implementation but remains in the file).

## Dependencies

This module is self-contained and has no external dependencies.
