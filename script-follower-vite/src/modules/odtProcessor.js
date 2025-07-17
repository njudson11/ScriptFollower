import JSZip from 'jszip'
import { DOMParser } from '@xmldom/xmldom'
import { ref } from 'vue'
import { lineTypeLabel } from './constants.js'
import { lineDefinition } from './documentProcessor.js'

export class odtProcessor {
  constructor() {
    this.document = ref({})
    this.lines = ref({})
  }

  lineTypeLabel=lineTypeLabel

  /**
   * Main ODT processing function.
   * @param {File} file
   * @returns {Promise<string>} Array of processed lines.
   * @throws {Error} If file processing fails.Hi
   */
  async processFile(file) {
    try{
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    const contentXml = await zip.file('content.xml').async('string')
    const stylesXml = await zip.file('styles.xml').async('string')
    this.doc = new DOMParser().parseFromString(contentXml, 'text/xml')
    const docStylesDom = new DOMParser().parseFromString(stylesXml, 'text/xml')
    if (docStylesDom) {
      this.docStyles = new OdtStyleCollection( docStylesDom)
    }

    this.extractStyleInheritance(this.doc)
    this.lines = this.populateLines(this.doc);
    return this.lines;
    
    } catch (error) {
      console.error('Error processing ODT file:', error)
      throw new Error('Failed to process ODT file')
    }
  }

  populateLines(doc) {
    const officeText = doc.getElementsByTagName('office:text')[0]
    if (!officeText) return []
    
    const lines = []
    let lastPageNumber = 0
    for (let node = officeText.firstChild; node; node = node.nextSibling) {
      if (
        node.nodeType === 1 &&
        (node.nodeName === 'text:p' || node.nodeName === 'text:h')
      ) {
        let line=this.getLine(node)
        if (line.pageNumber == ""){
          line.pageNumber=lastPageNumber+1
        }else{
          lastPageNumber = line.pageNumber
        }
        if (line) {
          line["idx"]=lines.length
          lines.push(line)
        }
      }
    }
    return lines
  }


  getLine(node){
    let lineText= this.processLineNode(node)
    const line = new lineDefinition(lineText)
    line.setStyle(this.resolveStyle(node.getAttribute('text:style-name') || ''))
    line.outlineLevel = node.getAttribute('text:outline-level') || '0'
    return line;
  }

  processLineNode(node){
    let lineText = ''
    for (let child of node.childNodes) {
      //const child = node.childNodes[index]
      if (child.nodeType === 3) { // TEXT_NODE
        lineText += child.nodeValue.trim()
      } else if (child.nodeType === 1) { // ELEMENT_NODE
        const name = child.nodeName.toLowerCase()
        switch (name) {
          case 'text:tab':
            lineText += '\t'
            break
          default:
            lineText+= child.textContent
        }
      }
    }
    return lineText;
  }

  /**
   * Resolves the effective style name, using the parent style if present in the style map.
   * @param {string} style - The original style name.
   * @param {Object} styleMap - The style inheritance map.
   * @returns {string} - The resolved style name.
   */
  resolveStyle(style) {
    if (this.docStyles){
      const rootStyle = this.docStyles.getRootStyle(style)
      if (rootStyle) {
        return rootStyle.name
      }
    }
    return style
  }

  /**
   * Extracts a map of style:name => style:parent-style-name from <office:automatic-styles>
   * @param {Document} doc - The parsed XML document
   * @returns {Object} - { [styleName]: parentStyleName }
   */
  extractStyleInheritance(doc) {
    const map = {}
    const autoStyles = doc.getElementsByTagName('office:automatic-styles')[0]
    if (autoStyles) {
      const styles = autoStyles.getElementsByTagName('style:style')
      for (let i = 0; i < styles.length; i++) {
        const style = styles[i]
        const name = style.getAttribute('style:name')
        const parent = style.getAttribute('style:parent-style-name')
        if (name && parent) {
          this.docStyles.styles[name] = new OdtStyleElement({name:name,parentStyleName:parent})
        }
      }
    }
  }

}

export class OdtStyleCollection {
  /**
   * @param {Document|Element} xmlDoc - The DOM object for the styles.xml file
   */
  constructor(xmlDoc) {
    this.styles = {}
    this.parseStyles(xmlDoc)
  }

  /**
   * Parse all <style:style> elements and store them by style:name
   * @param {Document|Element} xmlDoc
   */
  parseStyles(xmlDoc) {
    try{
      const styleElements = xmlDoc.getElementsByTagName('style:style')
      for (let i = 0; i < styleElements.length; i++) {
        const el = styleElements[i]
        if (el) {
          const styleName= el.getAttribute('style:name')
          this.styles[styleName] = OdtStyleElement.fromXmlElement(el)
        }
      }
    } catch (error) {
      console.error('Error parsing styles:', error)
    }
  }

  /**
   * Get a style by its style:name
   * @param {string} name
   * @returns {StyleElement|undefined}
   */
  get(name) {
    return this.styles[name]
  }

  getParentStyle(name) {
    const style = this.get(name)
    if (style && style.parentStyleName) {
      return this.get(style.parentStyleName)
    }
    return undefined
  }

  getRootStyle(name){
    const rootStyleList=["Text_20_body", "Title", "Subtitle","Heading_20_1", "Heading_20_2", "Act","Scene","Dialogue","Stage_20_Direction","Tech","Light","Sound_20_A","Sound_20_B","Effect","Curtains","PageNumber"]
    let currentStyle = this.get(name)
    if (currentStyle && rootStyleList.includes(currentStyle.name)) {
        return currentStyle
    }
    while (currentStyle && currentStyle.parentStyleName) {
      currentStyle = this.get(currentStyle.parentStyleName)
      if (currentStyle && rootStyleList.includes(currentStyle.name)) {
        break
      }
    }
    return currentStyle
  }

  /**
   * Get all style names
   * @returns {string[]}
   */
  names() {
    return Object.keys(this.styles)
  }
}

export class OdtStyleElement {
  /**
   * @param {Object} params
   * @param {string} params.name - The style:name attribute
   * @param {string} params.displayName - The style:display-name attribute
   * @param {string} params.family - The style:family attribute
   * @param {string} params.parentStyleName - The style:parent-style-name attribute
   * @param {string} [params.fill] - The draw:fill attribute (optional)
   * @param {string} [params.fillColor] - The draw:fill-color attribute (optional)
   * @param {string} [params.backgroundColor] - The fo:background-color attribute (optional)
   * @param {string} [params.textColor] - The fo:color attribute (optional)
   * @param {string} [params.opacity] - The loext:opacity attribute (optional)
   */
  constructor({
    name,
    displayName,
    family,
    parentStyleName,
    fill,
    fillColor,
    backgroundColor,
    textColor,
    opacity
  }) {
    this.name = name;
    this.displayName = displayName;
    this.family = family;
    this.parentStyleName = parentStyleName;
    this.fill = fill;
    this.fillColor = fillColor;
    this.backgroundColor = backgroundColor;
    this.textColor = textColor;
    this.opacity = opacity;
  }

  /**
   * Create a StyleElement from an XML element (DOM Node)
   * @param {Element} xmlElement
   * @returns {StyleElement}
   */
  static fromXmlElement(xmlElement) {
    const getAttr = (el, attr) => el.getAttribute(attr) || undefined;
  
    // Helper to find the first child element by tag name (handles namespaces)
    const getChildAttr = (tagNames, attr) => {
      for (const tag of tagNames) {
        const children = xmlElement.getElementsByTagName(tag);
        if (children.length > 0) {
          return children[0].getAttribute(attr) || undefined;
        }
      }
      return undefined;
    };
  
    return new OdtStyleElement({
      name: getAttr(xmlElement, 'style:name'),
      displayName: getAttr(xmlElement, 'style:display-name'),
      family: getAttr(xmlElement, 'style:family'),
      parentStyleName: getAttr(xmlElement, 'style:parent-style-name'),
      fill: getChildAttr(['loext:graphic-properties', 'loext\\:graphic-properties'], 'draw:fill'),
      fillColor: getChildAttr(['loext:graphic-properties', 'loext\\:graphic-properties'], 'draw:fill-color'),
      backgroundColor: getChildAttr(['style:paragraph-properties', 'style\\:paragraph-properties'], 'fo:background-color'),
      textColor: getChildAttr(['style:text-properties', 'style\\:text-properties'], 'fo:color'),
      opacity: getChildAttr(['style:text-properties', 'style\\:text-properties'], 'loext:opacity')
    });
  }
}








