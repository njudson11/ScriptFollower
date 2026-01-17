# textFormatter.js

## Purpose

The `textFormatter.js` module provides a set of utility functions for transforming and styling plain text. Its primary responsibilities are converting raw text into HTML, applying specific highlight styles based on regular expressions, and cleaning text for processing or matching.

*Note: This module appears to contain some legacy or potentially overlapping functionality with methods in `utilities.js` and `DocumentViewer.vue`. The functions here are focused on direct string-to-HTML conversion and cleaning.*

## Functions

### `formatTextToHtml(text, highlightRules = [])`

This function converts a block of plain text into a structured HTML string, wrapping it in paragraphs and applying specified highlighting.

- **Parameters**:
    - `text`: The raw input string, which may contain line breaks.
    - `highlightRules`: An optional array of rule objects. Each object should have:
        - `regex`: A `RegExp` to find the text to be highlighted.
        - `className`: The CSS class to apply to the matched text via a `<span>`.

- **Process**:
    1.  **Highlighting**: It first iterates through the `highlightRules` and replaces all matches of each regex with the text wrapped in a `<span class="...">`.
    2.  **Paragraphs**: It then splits the resulting HTML string by double line breaks (`\r?\n\r?\n`) to identify paragraphs.
    3.  **Line Breaks**: Each paragraph is then processed to replace single line breaks (`\r?\n`) with `<br>` tags.
    4.  **Wrapping**: Finally, each processed paragraph is wrapped in `<p>` tags and the whole result is joined back into a single HTML string.

### `highlightLine(line, highlightRules)`

This function is a more focused version of the highlighting logic in `formatTextToHtml`. It applies highlighting rules to a single line of text.

- **Parameters**:
    - `line`: A single string of text to be highlighted.
    - `highlightRules`: An array of rule objects, same as in `formatTextToHtml`.

- **Process**:
    - It iterates through the `highlightRules` and replaces regex matches with the text wrapped in a `<span>`.
    - Returns the modified HTML string.

### `extractCleanLines(lines)`

This function processes an array of script lines to extract only the dialogue portions, which are then cleaned for matching purposes (e.g., by speech recognition).

- **Parameters**:
    - `lines`: An array of strings, where each string is a line from the script.

- **Process**:
    1.  **Map and Filter**: It maps over the input `lines` array.
    2.  **Dialogue Extraction**: For each line, it attempts to match a `dialogueRegex` (`/^([^:\n]+):\s*(.*)$/i`), which looks for the "Character: Dialogue" format.
    3.  **HTML and Punctuation Removal**: It removes any HTML tags and then strips a wide range of punctuation and special characters (including en and em dashes) from the extracted dialogue part (`match[2]`).
    4.  **Return Object**: If a line matches the dialogue format, it returns an object containing the `clean` dialogue text and the original `idx`.
    5.  **Filter**: Non-matching lines result in `null`, which are then filtered out, so the final output is an array of `{ clean: string, idx: number }` objects representing only the clean dialogue.

## Dependencies

This module is self-contained and relies only on standard JavaScript features.
