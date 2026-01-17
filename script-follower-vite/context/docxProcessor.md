# docxProcessor.js

## Purpose

The `docxProcessor.js` module is a specialized utility responsible for processing Microsoft Word `.docx` files. Its single purpose is to extract the raw text content from a given `.docx` file, preparing it for further parsing and analysis by the `DocumentProcessor`.

## Functionality

This module leverages the `mammoth` library, a popular open-source tool designed to convert `.docx` documents into HTML or plain text.

### `processDocx(file)`

An asynchronous function that orchestrates the extraction process.

- **Parameters**:
    - `file`: A `File` object representing the `.docx` file uploaded by the user.

- **Process**:
    1.  **Reads the file**: It first reads the `file` into an `ArrayBuffer`, which is the binary format required by the `mammoth` library.
    2.  **Extracts Text**: It then calls `mammoth.extractRawText()`, passing the `arrayBuffer`. This function specifically extracts the plain text from the document, ignoring formatting, images, and other complex structures.
    3.  **Returns Value**: The function returns a `Promise` that resolves to a string (`result.value`), which contains the entire raw text content of the document.

## Dependencies

- **`mammoth`**: The core external library used for parsing the `.docx` file format.
