# odtProcessor.js

## Purpose

The `odtProcessor.js` module is specifically designed to handle the parsing and processing of OpenDocument Text (`.odt`) files. Unlike the simpler processors for `.docx` and `.pdf`, this module performs a deep-dive into the XML structure of the ODT format to extract not just text, but also styling information, annotations, and structural hierarchy. This allows for a much richer and more accurate representation of the original script document.

## Classes

### `odtProcessor`

This is the main class for processing an ODT file.

#### `processFile(file)`

This is the primary public method. It takes a `File` object, unzips it to access the internal `content.xml` and `styles.xml`, parses them into DOMs, and orchestrates the extraction of lines and styles.

- **Process**:
    1.  Reads the file into an `ArrayBuffer`.
    2.  Uses `JSZip` to load the buffer and access the internal XML files.
    3.  Parses `content.xml` (the document content) and `styles.xml` (the styling definitions) using `@xmldom/xmldom`.
    4.  Initializes an `OdtStyleCollection` with the parsed styles.
    5.  Calls `extractStyleInheritance` to map automatic (dynamic) styles to their parent styles.
    6.  Calls `populateLines` to iterate through the document's XML nodes and create an array of `lineDefinition` objects.
    7.  Returns the final array of processed lines.

#### `populateLines(doc)`

Iterates through the child nodes of the `<office:text>` element in `content.xml`. For each paragraph (`<text:p>`) or heading (`<text:h>`) node, it calls `getLine` to process it into a `lineDefinition` object and adds it to the `lines` array. It also tracks and assigns page numbers.

#### `getLine(node)`

Processes a single XML node (`<text:p>` or `<text:h>`) to create a `lineDefinition` object.
- Extracts the text content using `getNodeTextContent`.
- Extracts any annotations using `getNodeAnnotation`.
- Resolves the line's style to its root style name (e.g., "Dialogue", "Scene") using `resolveStyle`.
- Creates a new `lineDefinition` object, setting its text, style, outline level, and other raw properties.

#### `getNodeTextContent(node)`

Recursively traverses the child nodes of a given node to build the complete text string. It correctly handles text nodes, tab characters (`<text:tab>`), and ignores annotation tags so they don't appear in the main line text.

#### `getNodeAnnotation(node)`

Extracts comment-like annotations (`<office:annotation>` or `<text:note>`) from a line node and returns a `lineAnnotation` object containing the annotation's content, creator, and date.

#### `resolveStyle(style)`

Takes a style name (e.g., "P1", "P2") and uses the `OdtStyleCollection` to trace its inheritance chain up to a known root style (e.g., "Dialogue", "Scene"). This is crucial for correctly identifying the purpose of a line regardless of the specific, automatically generated style name it was assigned.

#### `extractStyleInheritance(doc)`

Parses the `<office:automatic-styles>` block in the XML to build a map of how dynamically generated styles inherit from the main document styles. This map is essential for the `resolveStyle` method to work correctly.

---

### `OdtStyleCollection`

A helper class to manage the collection of all styles defined in `styles.xml`.

- **`constructor(xmlDoc)`**: Parses the `<style:style>` elements from the styles XML document and populates the `styles` map.
- **`get(name)`**: Retrieves a style object by its name.
- **`getParentStyle(name)`**: Retrieves the parent style of a given style.
- **`getRootStyle(name)`**: Traverses the inheritance hierarchy from a given style name until it finds a "root" style (from a predefined list like "Title", "Dialogue", etc.). This is the core of the style resolution logic.

---

### `OdtStyleElement`

A data class representing a single `<style:style>` element, holding its various attributes like `name`, `family`, `parentStyleName`, and formatting properties (e.g., `backgroundColor`, `textColor`).

- **`fromXmlElement(xmlElement)` (static method)**: A factory method that creates an `OdtStyleElement` instance from a parsed XML DOM element, correctly extracting all relevant attributes.

## Dependencies

- **`jszip`**: For reading the contents of the `.odt` zip archive.
- **`@xmldom/xmldom`**: A DOM parser for handling the XML files within the ODT archive.
- **Vue (`ref`)**: Used for reactive properties within the class structure.
- **Internal Modules**: `lineDefinition`, `lineAnnotation` from `documentProcessor.js` and `lineTypeLabel` from `constants.js`.
