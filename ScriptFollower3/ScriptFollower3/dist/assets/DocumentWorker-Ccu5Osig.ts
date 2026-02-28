/**
 * Document Processing Web Worker
 * Handles heavy ZIP extraction, XML parsing, and post-processing enhancements.
 */

import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import JSZip from 'jszip'
import { Document, ScriptLineBase, LineType, MetadataExtractionRule, StyleInfo } from '../types/core'

// Standard ODT namespaces required for valid XML fragments
const ODT_NAMESPACES = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyling:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:dr3d="urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0" xmlns:math="http://www.w3.org/1998/Math/MathML" xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0" xmlns:script="urn:oasis:names:tc:opendocument:xmlns:script:1.0" xmlns:ooo="http://openoffice.org/2004/office" xmlns:ooow="http://openoffice.org/2004/writer" xmlns:oooc="http://openoffice.org/2004/calc" xmlns:dom="http://www.w3.org/2001/xml-events" xmlns:xforms="http://www.w3.org/2002/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:rpt="http://openoffice.org/2005/report" xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:grddl="http://www.w3.org/2003/g/data-view#" xmlns:officeooo="http://openoffice.org/2009/office" xmlns:tableooo="http://openoffice.org/2009/table" xmlns:drawooo="http://openoffice.org/2010/draw" xmlns:calcext="http://openoffice.org/2009/calc" xmlns:loext="http://western-albany.com/value/1.0" xmlns:field="urn:openoffice:names:experimental:ooo-ms-interop:xmlns:field:1.0" xmlns:formooo="http://openoffice.org/2009/form" xmlns:css3t="http://www.w3.org/TR/css3-text/"`;

// Define the worker message types
export interface WorkerRequest {
  type: 'PARSE_DOCUMENT'
  file: File | ArrayBuffer
  fileName: string
  format: 'ODT' | 'DOCX' | 'PDF' | 'XML'
  config: any // Format specific config
  extractionRules: MetadataExtractionRule[]
}

export interface WorkerResponse {
  type: 'SUCCESS' | 'ERROR'
  document?: Document
  error?: string
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: true
})

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  preserveOrder: true
})

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { type, file, fileName, format, config, extractionRules } = e.data

  if (type === 'PARSE_DOCUMENT') {
    try {
      let document: Document

      if (format === 'ODT') {
        document = await parseODT(file, fileName, config)
      } else {
        throw new Error(`Unsupported format in worker: ${format}`)
      }

      // Apply generic post-processing
      document = processDocument(document, extractionRules)

      self.postMessage({ type: 'SUCCESS', document })
    } catch (error) {
      self.postMessage({ 
        type: 'ERROR', 
        error: error instanceof Error ? error.message : String(error) 
      })
    }
  }
}

/**
 * ODT Parser Implementation (Worker-safe)
 */
async function parseODT(data: File | ArrayBuffer, fileName: string, config: any): Promise<Document> {
  const zip = new JSZip()
  const loaded = await zip.loadAsync(data)

  const contentFile = loaded.file('content.xml')
  if (!contentFile) throw new Error('Invalid ODT: content.xml missing')

  const xmlContent = await contentFile.async('text')
  const jsonObj = parser.parse(xmlContent)

  // Extract styles and paragraphs from JSON structure
  const body = jsonObj['office:document-content']?.['office:body']?.['office:text']
  if (!body) throw new Error('Invalid ODT structure: office:text missing')

  // Extract automatic styles for hierarchy
  const styleMap = new Map<string, StyleInfo>()
  const autoStyles = jsonObj['office:document-content']?.['office:automatic-styles']?.['style:style']
  if (autoStyles) {
    const styles = Array.isArray(autoStyles) ? autoStyles : [autoStyles]
    styles.forEach((s: any) => {
      const name = s['@_style:name']
      styleMap.set(name, {
        name,
        displayName: s['@_style:display-name'],
        parent: s['@_style:parent-style-name']
      })
    })
  }

  // Parse styles.xml if available for more global styles
  const stylesFile = loaded.file('styles.xml')
  if (stylesFile) {
    try {
      const stylesContent = await stylesFile.async('text')
      const stylesJson = parser.parse(stylesContent)
      const globalStyles = stylesJson['office:document-styles']?.['office:styles']?.['style:style']
      if (globalStyles) {
        const styles = Array.isArray(globalStyles) ? globalStyles : [globalStyles]
        styles.forEach((s: any) => {
          const name = s['@_style:name']
          styleMap.set(name, {
            name,
            displayName: s['@_style:display-name'],
            parent: s['@_style:parent-style-name']
          })
        })
      }
    } catch (e) {
      console.warn('[Worker] Failed to parse styles.xml', e)
    }
  }

  // To preserve order properly with fast-xml-parser, we'd need to use 'preserveOrder: true'
  const orderedParser = new XMLParser({ 
    ignoreAttributes: false, 
    preserveOrder: true,
    attributeNamePrefix: '@_'
  })
  const orderedJson = orderedParser.parse(xmlContent)
  const orderedBody = findOrderedElement(orderedJson, 'office:text')
  
  const lines: ScriptLineBase[] = []
  const documentId = `doc_${Date.now()}`
  let lineNumber = 1

  if (orderedBody) {
    orderedBody.forEach((el: any, index: number) => {
      const tagName = Object.keys(el)[0]
      if (tagName === 'text:p' || tagName === 'text:h') {
        const content = el[tagName]
        const text = extractTextFromOrdered(content).trim()
        if (text === '') return

        const attrs = el[':@'] || {}
        const styleName = attrs['@_text:style-name']

        // Find line type based on style hierarchy
        const typeResult = resolveTypeFromHierarchy(styleName, text, styleMap, config)

        // Lookup style display name and root style information
        let lineStyleLabel: string | undefined = undefined
        let rootStyleName: string | undefined = undefined
        let rootStyleLabel: string | undefined = undefined

        if (styleName) {
          const entry = styleMap.get(styleName)
          if (entry) {
            lineStyleLabel = entry.displayName

            // Walk parent chain to find root style
            let current = entry
            while (current && current.parent && styleMap.has(current.parent)) {
              const parentEntry = styleMap.get(current.parent)!
              current = parentEntry
            }

            if (current) {
              rootStyleName = current.name
              rootStyleLabel = current.displayName
            }
          }
        }

        // Analyze content for additional metadata
        const contentMetadata = analyzeLineContent(text)

        // Extract annotation
        const annotation = extractAnnotationFromOrdered(content)

        // Generate XML fragment and inject namespaces into the first tag
        const rawFragment = builder.build([el]);
        const tagEnd = rawFragment.indexOf('>');
        const originalXml = rawFragment.slice(0, tagEnd) + ' ' + ODT_NAMESPACES + rawFragment.slice(tagEnd);

        lines.push({
          id: `line_${documentId}_${lineNumber}`,
          documentId,
          lineNumber,
          lineType: typeResult.lineType,
          lineSubType: typeResult.lineSubType,
          text,
          annotation,
          metadata: {
            lineStyleName: styleName,
            lineStyleLabel,
            rootStyleName,
            rootStyleLabel,
            originalXml,
            ...contentMetadata
          },
          pageNumber: null
        })
        lineNumber++
      }
    })
  }

  return {
    id: documentId,
    name: fileName.replace('.odt', ''),
    format: 'ODT',
    lines,
    styles: Array.from(styleMap.values()),
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

/**
 * Generic Post-Processing (Ported from DocumentPostProcessor)
 */
function processDocument(document: Document, rules: MetadataExtractionRule[]): Document {
  const lines = [...document.lines]
  
  // 1. Metadata Extraction
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const applicableRules = rules.filter(r => r.lineType === line.lineType)
    if (applicableRules.length === 0) continue

    const updatedMetadata = { ...line.metadata } as any
    let hasMatches = false

    for (const rule of applicableRules) {
      const regex = new RegExp(rule.pattern)
      const match = line.text.match(regex)
      if (match) {
        hasMatches = true
        for (const [key, ref] of Object.entries(rule.mappings)) {
          const groupIdx = parseInt(ref.substring(1))
          if (groupIdx >= 0 && groupIdx < match.length) {
            updatedMetadata[key] = (match[groupIdx] || "").trim()
          }
        }
      }
    }

    if (hasMatches) {
      let updatedSubType = line.lineSubType
      if (line.lineType === LineType.DIALOGUE && updatedMetadata.characterName) {
        updatedSubType = updatedMetadata.characterName
      }
      lines[i] = { ...line, lineSubType: updatedSubType, metadata: Object.freeze(updatedMetadata) }
    }
  }

  // 2. Character Name Propagation
  let lastCharacterName: string | null = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.lineType === LineType.DIALOGUE) {
      const metadata = line.metadata as any
      if (metadata.characterName) {
        lastCharacterName = metadata.characterName
      } else if (lastCharacterName) {
        lines[i] = {
          ...line,
          lineSubType: lastCharacterName,
          metadata: Object.freeze({ ...line.metadata, characterName: lastCharacterName })
        }
      }
    }
  }

  // 3. Page Number Propagation (Reverse)
  let currentPageNumber: number | null = null
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (line.lineType === LineType.PAGE_NUMBER) {
      const extracted = parseInt((line.metadata as any).pageNumber || line.text.match(/(\d+)/)?.[1])
      if (!isNaN(extracted)) currentPageNumber = extracted
    }
    lines[i] = { ...lines[i], pageNumber: currentPageNumber }
  }

  return { ...document, lines }
}

// --- Helper Functions for Ordered XML structure ---

function findOrderedElement(arr: any[], name: string): any[] | null {
  for (const el of arr) {
    const key = Object.keys(el)[0]
    if (key === name) return el[key]
    if (Array.isArray(el[key])) {
      const found = findOrderedElement(el[key], name)
      if (found) return found
    }
  }
  return null
}

function extractTextFromOrdered(content: any[]): string {
  if (!Array.isArray(content)) return ""
  return content.map(el => {
    const key = Object.keys(el)[0]
    if (key === '#text') return el[key]
    if (key === 'text:line-break') return '\n'
    if (key === 'text:tab') return '\t'
    if (key === 'office:annotation') return ''
    return extractTextFromOrdered(el[key])
  }).join('')
}

function extractAnnotationFromOrdered(content: any[]): string | undefined {
  if (!Array.isArray(content)) return undefined
  const annotations: string[] = []
  
  function findAnnotationsRecursive(items: any[]) {
    if (!Array.isArray(items)) return

    items.forEach(el => {
      const key = Object.keys(el)[0]
      if (key === 'office:annotation') {
        const annotationBody = el[key]
        if (Array.isArray(annotationBody)) {
          annotationBody.forEach(item => {
            const itemKey = Object.keys(item)[0]
            if (itemKey === 'text:p') {
              annotations.push(extractTextFromOrdered(item[itemKey]))
            }
          })
        }
      } else if (typeof el[key] === 'object') {
        // Continue searching in child elements (spans, etc)
        findAnnotationsRecursive(el[key])
      }
    })
  }

  findAnnotationsRecursive(content)
  
  return annotations.length > 0 ? annotations.join('\n') : undefined
}

function resolveTypeFromHierarchy(styleName: string, text: string, styleMap: Map<string, StyleInfo>, config: any): { lineType: LineType, lineSubType?: string } {
  if (!styleName) return { lineType: config.fallbackLineType }

  let current: string | undefined = styleName
  const hierarchy: string[] = []
  while (current) {
    hierarchy.push(current)
    current = styleMap.get(current)?.parent
  }

  for (const sName of hierarchy) {
    const info = styleMap.get(sName)
    const checks = [sName, info?.displayName].filter(Boolean) as string[]
    
    for (const check of checks) {
      for (const mapping of config.styleMappings) {
        for (const pattern of mapping.stylePatterns) {
          if (check.toLowerCase().includes(pattern.toLowerCase())) {
            return { lineType: mapping.lineType, lineSubType: mapping.lineSubType || sName }
          }
        }
      }
    }
  }

  return { lineType: config.fallbackLineType, lineSubType: styleName }
}

/**
 * Analyze line content and set metadata based on text patterns
 */
function analyzeLineContent(text: string): Record<string, any> {
  const metadata: Record<string, any> = {}

  if (!text || text.length === 0) {
    metadata.contentType = 'blank'
    return metadata
  }

  const trimmed = text.trim()
  const allCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 2

  // Detect content-based patterns and store in metadata
  if (allCaps && trimmed.includes('ACT')) {
    metadata.contentHint = 'act_heading'
  } else if (allCaps && trimmed.match(/^(INT|EXT|I\.?\s*\/\s*E\.?)/i)) {
    metadata.contentHint = 'scene_heading'
  } else if (allCaps && trimmed.length < 50 && !trimmed.includes('.') && !trimmed.includes(',')) {
    metadata.contentHint = 'character'
  } else if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    metadata.contentHint = 'parenthetical'
  } else if (trimmed.match(/^[A-Z][A-Za-z\s]*:/) && trimmed.length < 80) {
    metadata.contentHint = 'stage_direction'
  }

  // Additional content analysis
  metadata.isAllCaps = allCaps
  metadata.hasParentheses = trimmed.includes('(') && trimmed.includes(')')
  metadata.length = trimmed.length

  return metadata
}
