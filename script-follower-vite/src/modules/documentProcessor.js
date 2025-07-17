import { ref, computed } from 'vue'
import { processDocx } from './docxProcessor'
import { processPdf } from './pdfProcessor'
import { odtProcessor } from './odtProcessor'
import {  extractSoundRef,extractTechDescription, getTag, getTypeByTag}  from './utilities'
import { lineTypeLabel } from './constants.js'

const LS_SCRIPT_FOLLOWER_DOCUMENT = 'scriptFollowerDocument'
const LS_SCRIPT_FOLLOWER_FILENAME = 'scriptFollowerFilename'
export class DocumentProcessor {
  constructor() {
    this.text = ref({})
    this.lines = ref([])
    this.filename = ref('')
  }

  async loadFile(file) {
    this.lines.value = await this.processDocument(file)
  }

  /**
   * Detects file type and processes the document accordingly.
   * @param {File} file
   * @returns {Promise<string>}
   */
  async processDocument(file) {
    const ext = file.name.split('.').pop().toLowerCase()
    let processor=null;
    if (ext === 'docx') {
      return await processDocx(file)
    } else if (ext === 'pdf') {
      return await processPdf(file)
    } else if (ext === 'odt') {
      processor= new odtProcessor()
    } else {
      throw new Error('Unsupported file type. Please upload a .docx, .odt, or .pdf file.')
    }
    return await processor.processFile(file)
  }

  setText(newText) {
    this.text?.value && (this.text.value = newText)

  }

  clear() {
    this.setText('') 
    this.lines.value = []
    this.filename.value=""
  }

  restoreFromLocalStorage() {
    const saved = localStorage.getItem(LS_SCRIPT_FOLLOWER_DOCUMENT)
    if (saved) {
      this.lines.value = JSON.parse(saved)
    }
    const savedFilename = localStorage.getItem(LS_SCRIPT_FOLLOWER_FILENAME)
    if (savedFilename) {
      this.filename.value = savedFilename
    }
  }

  clearLocalStorage() {
    localStorage.removeItem(LS_SCRIPT_FOLLOWER_DOCUMENT)
    localStorage.removeItem(LS_SCRIPT_FOLLOWER_FILENAME)
  }

  saveToLocalStorage() {
    localStorage.setItem(LS_SCRIPT_FOLLOWER_DOCUMENT, JSON.stringify(this.lines.value))
    localStorage.setItem(LS_SCRIPT_FOLLOWER_FILENAME, this.filename.value)
  }


}

export class lineDefinition{
  constructor(text) {
    this.text = text
    this.cleanText = ''
    this.type = ''
    this.ref = ''
    this.outlineLevel =''
    this.description = ''
    this.tag = ''
    this.style = ''
    this.pageNumber = ''
    this.setLine(this.text)
  }

  setLine(lineText){
      this.text= lineText,
      this.ref= extractSoundRef(lineText),
      this.cleanText= lineText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’”“[\]\\|<>–—]/g, '')
      this.description=extractTechDescription(this)
      this.setTag()
      this.setType()
    return this;
  }

  setTag(){
    this.tag = getTag(this)
  }

  setType(){
    this.type = getTypeByTag(this)
    this.pageNumber=this.type==lineTypeLabel.pageNumber ? Number(this.text.replace(/\D+/g, '')) : ''
  }

  setStyle(style) {
    this.style = style
    this.setTag()
    this.setType()
  }

  get isEmpty() {
    return !this.text || this.text.trim() === ''
  }

}