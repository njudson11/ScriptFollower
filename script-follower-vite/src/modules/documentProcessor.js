import { ref, computed } from 'vue'
import { processDocx } from './docxProcessor'
import { processPdf } from './pdfProcessor'
import { odtProcessor } from './odtProcessor'
import {  extractSoundRef,extractTechDescription, getTag, getTypeByTag, extractSoundCue, generateSoundCueNotation}  from './utilities'
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
      this.lines.value = JSON.parse(saved).map(line => {
        // Create a new lineDefinition instance to ensure reactivity and proper methods
        const newLine = new lineDefinition("");
        Object.assign(newLine, line); // Copy properties from stored line
        
        // Ensure soundCue is initialized if missing (for older saved data)
        if (!newLine.soundCue) {
          newLine.soundCue = {
            stopAll: false,
            stopPrev: false,
            volume: 100,
            balance: 0,
            channel: 'A'
          };
        }
        // Update _baseText based on the restored text and soundCue (re-parse notation)
        newLine.updateBaseTextFromFullText(line.text || "");
        return newLine;
      })
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
   * @param {string} fullLineText - The full text of the line, potentially including sound cue notation.
   */
  constructor(fullLineText) {
    this._baseText = '' // Stores text without notation
    this.raw = fullLineText // Keep raw as original for debug/comparison
    this.cleanText = ''
    this.type = ''
    this.ref = ''
    this.outlineLevel =''
    this.description = ''
    this.tag = ''
    this.style = ''
    this.pageNumber = ''
    this.annotation= null,
    this.soundCue = {
      stopAll: false,
      stopPrev: false,
      volume: 100,
      balance: 0,
      channel: 'A'
    },
    this.idx = -1, // Initialize idx property
    // Initialize properties by processing the fullLineText
    this.updateBaseTextFromFullText(fullLineText)
  }

  /**
   * Getter for the 'text' property that dynamically builds it with sound cue notation.
   * @returns {string} - The full text of the line including sound cue notation.
   */
  get text() {
    return this._baseText + generateSoundCueNotation(this.soundCue);
  }

  /**
   * Sets the properties of the line by parsing the full line text (which might include sound cue notation).
   * This is effectively the new 'setLine' method for initial parsing.
   * @param {string} fullLineText - The full text of the line, potentially including sound cue notation.
   */
  updateBaseTextFromFullText(fullLineText){
      const { soundCue, cleanText } = extractSoundCue(fullLineText);
      this.soundCue = soundCue; // Update the soundCue object
      this._baseText = cleanText; // Store the text without notation

      // Now, derive other properties from _baseText
      this.ref = extractSoundRef(this._baseText);
      // cleanText needs to be stripped of punctuation/formatting from _baseText
      this.cleanText = this._baseText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’”“[\]\\|<>–—]/g, '');
      this.description = extractTechDescription(this);
      this.setTag();
      this.setType();
  }


  /**
   * Sets the properties of the line.
   * @param {string} lineText - The text of the line.
   * @returns {lineDefinition} - The instance of the class.
   */
  setLine(lineText){
    // This method is now primarily for updating the base text part programmatically
    // and ensuring other properties derived from it are re-evaluated.
    // It will effectively replace the current _baseText and re-parse soundCue (if any)
    this.updateBaseTextFromFullText(lineText);
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
    this.pageNumber=this.type==lineTypeLabel.pageNumber ? Number(this._baseText.replace(/\D+/g, '')) : ''
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
    return !this._baseText || this._baseText.trim() === ''
  }

}
