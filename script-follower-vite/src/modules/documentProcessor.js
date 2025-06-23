import { processDocx } from './docxProcessor'
import { processPdf } from './pdfProcessor'
import { processOdt } from './odtProcessor'

/**
 * Detects file type and processes the document accordingly.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function processDocument(file) {
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'docx') {
    return await processDocx(file)
  } else if (ext === 'pdf') {
    return await processPdf(file)
  } else if (ext === 'odt') {
    return await processOdt(file)
  } else {
    throw new Error('Unsupported file type. Please upload a .docx, .odt, or .pdf file.')
  }
}