# documentProcessor.js

## Purpose

The `documentProcessor.js` file is responsible for orchestrating the processing of script files. It acts as a central hub that determines the file type and delegates the actual parsing and line-by-line processing to the appropriate specialized module (`docxProcessor`, `pdfProcessor`, or `odtProcessor`). It also manages the document's state, including its lines and filename, and handles persistence to and from the browser's local storage.

## Classes

### `DocumentProcessor`

This is the main class that encapsulates the logic for handling a document.

#### Constructor

- `constructor()`: Initializes a new `DocumentProcessor` instance with reactive properties:
    - `text`: A `ref` to hold the raw text content (currently initialized as an empty object, but intended to hold the full text).
    - `lines`: A `ref` to an array that will hold the processed `lineDefinition` objects.
    - `filename`: A `ref` to store the name of the loaded file.

#### Methods

- **`loadFile(file)`**: Asynchronously loads and processes a given file. It calls `processDocument` and updates the `lines` ref with the result.
- **`processDocument(file)`**: Detects the file extension (`.docx`, `.pdf`, `.odt`) and calls the corresponding processor module to parse the file and return an array of line objects. Throws an error for unsupported file types.
- **`setText(newText)`**: Updates the `text` ref with new content.
- **`clear()`**: Resets the document state by clearing the text, lines, and filename.
- **`restoreFromLocalStorage()`**: Loads the previously saved document lines and filename from `localStorage`, allowing the session to be restored.
- **`clearLocalStorage()`d**: Removes the saved document from `localStorage`.
- **`saveToLocalStorage()`**: Saves the current `lines` array and `filename` to `localStorage`.

---

### `lineAnnotation`

A simple class representing an annotation or comment within the script.

#### Constructor

- `constructor(content, date, creator, creatorInitials)`: Creates an annotation object with the provided details.

---

### `lineDefinition`

This class represents a single line of the script, containing its text and various derived properties.

#### Constructor

- `constructor(text)`: Initializes a new line with the given `text` and immediately calls the `setLine` method to process it.

#### Properties

- `text`: The raw text of the line.
- `cleanText`: The text with punctuation and special characters removed, used for matching.
- `type`: The determined type of the line (e.g., `DIALOGUE`, `SOUND`, `SCENE`) based on `lineTypeLabel` constants.
- `ref`: The extracted reference (e.g., sound cue number).
- `outlineLevel`: The indentation level from the source document.
- `description`: A description extracted from the line (e.g., for tech cues).
- `tag`: A tag derived from the line's style or content.
- `style`: The style name from the source document (e.g., "Character", "Dialogue").
- `pageNumber`: The extracted page number if the line type is `PAGE_NUMBER`.
- `raw`: The raw, unprocessed line data from the parser.
- `annotation`: A `lineAnnotation` object if one is associated with the line.

#### Methods

- **`setLine(lineText)`**: Populates the line's properties (`ref`, `cleanText`, `description`, etc.) based on the input text.
- **`setTag()`**: Determines and sets the line's `tag` by calling the `getTag` utility.
- **`setType()`**: Determines and sets the line's `type` by calling `getTypeByTag`. Also extracts the page number if applicable.
- **`setStyle(style)`**: Updates the line's style and re-evaluates its tag and type.
- **`isEmpty` (getter)**: Returns `true` if the line's text is empty or only contains whitespace.

## Dependencies

- **Vue**: Uses `ref` and `computed` for reactive state management.
- **Processors**: `docxProcessor`, `pdfProcessor`, `odtProcessor` for file-specific parsing.
- **Utilities**: `extractSoundRef`, `extractTechDescription`, `getTag`, `getTypeByTag` for data extraction and classification.
- **Constants**: `lineTypeLabel` for standardized line type identification.
