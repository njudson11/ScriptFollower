import { ref, computed } from 'vue'
import { processDocx } from './docxProcessor'
import { processPdf } from './pdfProcessor'
import { odtProcessor } from './odtProcessor'
import {  extractSoundRef,extractTechDescription, getTag, getTypeByTag}  from './utilities'
import { lineTypeLabel } from './constants.js'

const LS_SCRIPT_FOLLOWER_DOCUMENT = 'scriptFollowerDocument'
const LS_SCRIPT_FOLLOWER_FILENAME = 'scriptFollowerFilename'
export class DocumentProcessor {
  /**
   * Processor for documents.
   * @constructor
   */
  constructor() {
    this.text = ref({})
    this.lines = ref([])
    this.filename = ref('')
  }

  /**
   * Loads a file and processes it.
   * @param {File} file - The file to load.
   */
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

  /**
   * Sets the text content of the document.
   * @param {string} newText - The new text content.
   */
  setText(newText) {
    this.text?.value && (this.text.value = newText)
  }

  /**
   * Clears the document content.
   */
  clear() {
    this.setText('') 
    this.lines.value = []
    this.filename.value=""
  }

  /**
   * Restores the document from local storage.
   */
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

  /**
   * Clears the document from local storage.
   */
  clearLocalStorage() {
    localStorage.removeItem(LS_SCRIPT_FOLLOWER_DOCUMENT)
  }

  /**
   * Saves the document to local storage.
   */
  saveToLocalStorage() {
    localStorage.setItem(LS_SCRIPT_FOLLOWER_DOCUMENT, JSON.stringify(this.lines.value))
    localStorage.setItem(LS_SCRIPT_FOLLOWER_FILENAME, this.filename.value)
  }


}

export class lineAnnotation{
  /**
   * Represents an annotation for a line.
   * @constructor
   * @param {string} type - The type of annotation.
   * @param {string} content - The content of the annotation.
   */
  constructor(content, date, creator, creatorInitials) {
    this.content = content
    this.date = date
    this.creator = creator
    this.creatorInitials = creatorInitials
  }
}

export class lineDefinition{
  /**
   * Represents a line in the document.
   * @constructor
   * @param {string} text - The text of the line.
   */
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
    this.raw= '',
    this.annotation= null,
    this.setLine(this.text)
  }

  /**
   * Sets the properties of the line.
   * @param {string} lineText - The text of the line.
   * @returns {lineDefinition} - The instance of the class.
   */
  setLine(lineText){
      this.text= lineText,
      this.ref= extractSoundRef(lineText),
      this.cleanText= lineText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’”“[\]\\|<>–—]/g, '')
      this.description=extractTechDescription(this)
      this.setTag()
      this.setType()
    return this;
  }

  /**
   * Sets the tag of the line.
   */
  setTag(){
    this.tag = getTag(this)
  }

  /**
   * Sets the type of the line.
   */
  setType(){
    this.type = getTypeByTag(this)
    this.pageNumber=this.type==lineTypeLabel.pageNumber ? Number(this.text.replace(/\D+/g, '')) : ''
  }

  /**
   * Sets the style of the line.
   * @param {string} style - The style of the line.
   */
  setStyle(style) {
    this.style = style
    this.setTag()
    this.setType()
  }

  /**
   * Checks if the line is empty.
   * @returns {boolean} - True if the line is empty, false otherwise.
   */
  get isEmpty() {
    return !this.text || this.text.trim() === ''
  }

}

