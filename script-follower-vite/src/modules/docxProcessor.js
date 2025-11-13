import mammoth from 'mammoth'
//const mammoth = await import('mammoth')

/**
 * Processes a .docx file and extracts the raw text content.
 * @param {File} file - The .docx file to process.
 * @returns {Promise<string>} - The raw text content of the document.
 */
export async function processDocx(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}