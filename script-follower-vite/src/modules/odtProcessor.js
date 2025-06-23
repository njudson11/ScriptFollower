import JSZip from 'jszip'
import { DOMParser } from '@xmldom/xmldom'

// If you are using a bundler that supports dynamic imports, you can use the following line instead:
//const JSZip = await import('jszip')
//const { DOMParser } = await import('@xmldom/xmldom')

export async function processOdt(file) {
  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)
  const contentXml = await zip.file('content.xml').async('string')
  const doc = new DOMParser().parseFromString(contentXml, 'text/xml')

  // Recursively flatten node, converting text:tab and text:span to HTML
  function flattenNode(node) {
    let result = ''
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3) { // TEXT_NODE
        result += child.nodeValue
      } else if (child.nodeType === 1) { // ELEMENT_NODE
        const name = child.nodeName.toLowerCase()
        if (name === 'text:tab') {
          result += '\t'
        } else if (name === 'text:span') {
          const spanClass = child.getAttribute('text:style-name') || ''
          result += `<span class="${spanClass}">${flattenNode(child)}</span>`
        } else {
          result += flattenNode(child)
        }
      }
    }
    return result
  }

  // Only process <text:p> and <text:h> elements, in order
  const officeText = doc.getElementsByTagName('office:text')[0]
  let html = ''
  if (officeText) {
    for (let node = officeText.firstChild; node; node = node.nextSibling) {
      if (
        node.nodeType === 1 &&
        (node.nodeName === 'text:p' || node.nodeName === 'text:h')
      ) {
        const style = node.getAttribute('text:style-name') || ''
        const line = flattenNode(node)
        if (line.trim()) {
          html += `<p class="${style}">${line}</p>\n`
        }
      }
    }
  }
  return html.trim()
}