import { ref, computed } from 'vue'
import { extractCleanLines } from './textFormatter'
import { processDocx } from './docxProcessor'
import { processPdf } from './pdfProcessor'
import { processOdt } from './odtProcessor'

export class DocumentProcessor {
  constructor() {
    this.text = ref('')
    this.lines = computed(() => this.text.value.split(/\r?\n/))
    this.cleanLines = computed(() => extractCleanLines(this.lines.value))
  }

  async loadFile(file) {
    this.text.value = await this.processDocument(file)
  }

  /**
   * Detects file type and processes the document accordingly.
   * @param {File} file
   * @returns {Promise<string>}
   */
  async processDocument(file) {
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

  setText(newText) {
    this.text?.value && (this.text.value = newText)
  }

  clear() {
    this.setText('') 
  }
}