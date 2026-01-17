# utilities.js

## Purpose

The `utilities.js` module is a collection of helper functions used across the application. These functions perform a wide range of tasks, from simple data transformations and checks to more complex logic for classifying and formatting script lines. This module helps keep the main component and processor logic cleaner by abstracting common, reusable operations.

## Functions

### UI & General Helpers

- **`isMobileSize()`**: Checks the `window.innerWidth` against the `mobileMinWidth` constant to determine if the application is being viewed on a mobile-sized screen.
- **`stripHtmlAndPunctuation(line)`**: Removes all HTML tags and a wide range of punctuation characters from a string, returning a "clean" version.
- **`secondsToMinutes(seconds)`**: Converts a number of seconds into a `mm:ss.ms` formatted string, commonly used for displaying audio timers.

### Line Classification & Data Extraction

- **`isSoundCue(line)`**: Uses a regular expression to check if a line contains the pattern for a sound cue (e.g., "SOUND" and a 4-digit number).
- **`extractSoundRef(line)`**: If a line is identified as a sound cue, this function extracts and returns the 4-digit reference number.
- **`extractTechDescription(line)`**: Extracts the descriptive part of a technical cue (like a sound or light cue). It intelligently looks for text following a tab or after a "Tag:" prefix.
- **`getTag(line)`**: The first step in classifying a line. It attempts to extract a "tag" from the beginning of the line (e.g., "SCENE:", "SOUND A:"). If it doesn't find a direct tag, it calls `findTagByRules` to use more complex logic.
- **`findTagByRules(line)`**: A rule-based engine for classifying lines. It iterates through a predefined set of `tagRules` that can match based on the line's text content (via regex) or its document style (e.g., "PageNumber", "Heading_20_1"). This is a powerful fallback for documents that don't use explicit "Tag:" prefixes.
- **`getTypeByTag(line)`**: The second step in classifying a line. It takes the `tag` found by `getTag` and uses a `switch` statement to map it to a standardized `lineTypeLabel` constant (e.g., 'SOUND', 'DIALOGUE', 'SCENE').

### Formatting & Output

- **`wrapWithSpans(line, rules)`**: A sophisticated HTML wrapper function. It takes a `lineDefinition` object and an array of highlighting rules. It intelligently applies the rules only to the text parts of a line, preserving any existing HTML spans. This allows multiple highlights to be applied without interfering with each other. It can also filter rules based on the `line.type`.
- **`generateSoundCueCSV(docProcessor, soundManager)`**: A utility for exporting data. It iterates through all the lines in a processed document, finds the ones that are sound cues, and generates a CSV (Comma-Separated Values) string. For each cue, it includes the page number, cue reference, description, and the associated sound filename (by looking it up in the `soundManager`).

## Dependencies

- **`constants.js`**: Uses `lineTypeLabel` and `appValues` for standardized values and configuration.
