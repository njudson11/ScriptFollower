import JSZip from 'jszip'
import { DOMParser } from '@xmldom/xmldom'

/**
 * Extracts a map of style:name => style:parent-style-name from <office:automatic-styles>
 * @param {Document} doc - The parsed XML document
 * @returns {Object} - { [styleName]: parentStyleName }
 */
function extractStyleInheritance(doc) {
  const map = {}
  const autoStyles = doc.getElementsByTagName('office:automatic-styles')[0]
  if (autoStyles) {
    const styles = autoStyles.getElementsByTagName('style:style')
    for (let i = 0; i < styles.length; i++) {
      const style = styles[i]
      const name = style.getAttribute('style:name')
      const parent = style.getAttribute('style:parent-style-name')
      if (name && parent) {
        map[name] = parent
      }
    }
  }
  return map
}

/**
 * Resolves the effective style name, using the parent style if present in the style map.
 * @param {string} style - The original style name.
 * @param {Object} styleMap - The style inheritance map.
 * @returns {string} - The resolved style name.
 */
function resolveStyle(style, styleMap) {
  return styleMap[style] || style
}

/**
 * Flattens an XML node to HTML, handling text:tab and text:span.
 * @param {Node} node
 * @param {Object} styleMap
 * @returns {string}
 */
function flattenNode(node, styleMap) {
  let result = ''
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 3) { // TEXT_NODE
      result += child.nodeValue
    } else if (child.nodeType === 1) { // ELEMENT_NODE
      const name = child.nodeName.toLowerCase()
      if (name === 'text:tab') {
        result += '\t'
      } else if (name === 'text:span') {
        let spanClass = child.getAttribute('text:style-name') || ''
        spanClass = resolveStyle(spanClass, styleMap)
        result += `<span class="${spanClass}">${flattenNode(child, styleMap)}</span>`
      } else {
        result += flattenNode(child, styleMap)
      }
    }
  }
  return result
}

/**
 * Converts <text:p> and <text:h> nodes to HTML paragraphs with resolved styles.
 * @param {Element} officeText
 * @param {Object} styleMap
 * @returns {string}
 */
function convertParagraphsToHtml(officeText, styleMap) {
  let html = ''
  for (let node = officeText.firstChild; node; node = node.nextSibling) {
    if (
      node.nodeType === 1 &&
      (node.nodeName === 'text:p' || node.nodeName === 'text:h')
    ) {
      let style = node.getAttribute('text:style-name') || ''
      style = resolveStyle(style, styleMap)
      const line = flattenNode(node, styleMap)
      if (line.trim()) {
        html += `<p class="${style}">${line}</p>\n`
      }
    }
  }
  return html.trim()
}

/**
 * Main ODT processing function.
 * @param {File} file
 * @returns {Promise<string>} HTML string
 */
export async function processOdt(file) {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const contentXml = await zip.file('content.xml').async('string')
  const doc = new DOMParser().parseFromString(contentXml, 'text/xml')

  const styleMap = extractStyleInheritance(doc)
  const officeText = doc.getElementsByTagName('office:text')[0]
  if (!officeText) return ''
  return convertParagraphsToHtml(officeText, styleMap)
}