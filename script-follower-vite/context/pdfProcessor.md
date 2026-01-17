# pdfProcessor.js

## Purpose

The `pdfProcessor.js` module is dedicated to handling `.pdf` files. Its primary function is to extract the textual content from a PDF document, page by page, and reconstruct it into a single, coherent string. This allows the application to process scripts that are in PDF format.

## Functionality

This module relies on Mozilla's `pdf.js` library to parse and interpret the PDF file structure.

### Worker Configuration

- `pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker`: This line is crucial for setting up `pdf.js` in a web environment, especially with a build tool like Vite. It configures the path to the PDF processing web worker, which `pdf.js` uses to perform heavy parsing tasks off the main browser thread, preventing the UI from freezing.

### `processPdf(file)`

This is the core asynchronous function of the module.

- **Parameters**:
    - `file`: A `File` object representing the `.pdf` file uploaded by the user.

- **Process**:
    1.  **Load File**: Reads the `file` into an `ArrayBuffer`.
    2.  **Initialize PDF.js**: `pdfjsLib.getDocument({ data: arrayBuffer }).promise` loads the binary data and initializes a PDF document object.
    3.  **Iterate Pages**: It loops through each page of the PDF from `1` to `pdf.numPages`.
    4.  **Extract Text Content**: For each page, it calls `page.getTextContent()`. This returns a structured list of text items, each with properties like the text string (`str`) and its position (`transform`).
    5.  **Reconstruct Lines**: The module then iterates through the text items (`content.items`) and attempts to reconstruct the original lines. It does this by grouping items that have a similar vertical position (the `y` coordinate, which is `item.transform[5]`). When the `y` coordinate changes significantly, it assumes a new line has started.
    6.  **Assemble Full Text**: The reconstructed lines are appended to a `fullText` string, with newline characters (`
`) added to separate them. An extra newline is added after each page to create a clear separation.
    7.  **Return Text**: Finally, it returns the `fullText` string after trimming any leading or trailing whitespace.

## Dependencies

- **`pdfjs-dist`**: The core Mozilla `pdf.js` library used for all PDF parsing and text extraction. The dynamic import and worker setup are key parts of its integration.
