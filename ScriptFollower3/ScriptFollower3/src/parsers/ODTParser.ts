/**
 * ODT Document Processor
 * Parses OpenDocument Text files (.odt) into script lines
 */

import { Document, ScriptLineBase, LineType } from '@/types/core'
import { ODTParserConfig, defaultODTConfig, SubtypeRule } from './ODTConfig'
import JSZip from 'jszip'

/**
 * Parse ODT file content
 * ODT files are ZIP archives containing XML
 */
export async function parseODT(file: File, config: ODTParserConfig = defaultODTConfig): Promise<Document> {
  try {
    const zip = new JSZip()
    const loaded = await zip.loadAsync(file)

    // Read content.xml from the ODT archive
    const contentFile = loaded.file('content.xml')
    if (!contentFile) {
      throw new Error('Invalid ODT file: content.xml not found')
    }

    const xmlContent = await contentFile.async('text')
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Failed to parse ODT content.xml')
    }

    // Build a style map that will be populated from automatic styles and styles.xml
    const styleMap = new Map<string, { name: string; displayName?: string; parent?: string }>()

    // First, extract any automatic styles embedded in content.xml
    // (these often contain style definitions with parent relationships)
    buildStyleMap(xmlDoc, styleMap)
    const stylesFile = loaded.file('styles.xml')
    if (stylesFile) {
      try {
        const stylesText = await stylesFile.async('text')
        const stylesDoc = parser.parseFromString(stylesText, 'text/xml')
        if (stylesDoc && stylesDoc.getElementsByTagName) {
          buildStyleMap(stylesDoc, styleMap)
        }
      } catch (err) {
        // Non-fatal: continue without style labels
        // console.warn('Failed to parse styles.xml', err)
      }
    }

    const initialLines = extractLinesFromXML(xmlDoc, styleMap, config)

    // Convert styleMap to array for document
    const styles = Array.from(styleMap.values()).map(style => ({
      name: style.name,
      displayName: style.displayName,
      parent: style.parent
    }))

    const document: Document = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name.replace('.odt', ''),
      format: 'ODT',
      lines: initialLines,
      styles,
      version: 1,
      createdAt: new Date(file.lastModified),
      updatedAt: new Date()
    }

    return document
  } catch (error) {
    throw new Error(`Failed to parse ODT file: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extract script lines from ODT XML content
 */
function extractLinesFromXML(xmlDoc: XMLDocument, styleMap: Map<string, { name: string; displayName?: string; parent?: string }> = new Map(), config: ODTParserConfig = defaultODTConfig): ScriptLineBase[] {
  const lines: ScriptLineBase[] = []
  const officeText = xmlDoc.getElementsByTagName('office:text')[0];
  if (!officeText) {
    return [];
  }
  const paragraphs = Array.from(officeText.children).filter(
      (child) => child.tagName === 'text:p' || child.tagName === 'text:h'
  );
  const documentId = `doc_${Date.now()}`

  let lineNumber = 1

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i] as Element
    const text = extractTextFromParagraph(para).trim()
    if (text === '' ){ continue;}
    
    // Detect line type based on formatting and content
    const lineType = detectLineType(text, para, styleMap, config)

    // Skip completely empty lines or lines with only whitespace
    if (text === '' && lineType === LineType.BLANK) {
      continue
    }

    const styleName = para.getAttribute('text:style-name') || undefined

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

    // Get line type and subtype from configuration
    const typeResult = resolveLineTypeFromConfig(para, text, styleMap, config)

    // Analyze content for additional metadata
    const contentMetadata = analyzeLineContent(text)
    
    // Extract annotation
    const annotationElements = para.getElementsByTagName('office:annotation');
    let annotation: string | undefined;
    if (annotationElements.length > 0) {
        const allAnnotations: string[] = [];
        for (let k = 0; k < annotationElements.length; k++) {
            const annotationElement = annotationElements[k];
            const annotationParagraphs = annotationElement.getElementsByTagName('text:p');
            const annotationParts: string[] = [];
            for (let j = 0; j < annotationParagraphs.length; j++) {
                annotationParts.push(annotationParagraphs[j].textContent || '');
            }
            allAnnotations.push(annotationParts.join('\n').trim());
        }
        annotation = allAnnotations.join('\n');
    }

    const line: ScriptLineBase = {
      id: `line_${documentId}_${lineNumber}`,
      documentId,
      lineNumber,
      lineType,
      lineSubType: typeResult.lineSubType,
      text,
      annotation,
      metadata: {
        paragraphIndex: i,
        originalXml: serializeElementToXML(para),
        lineStyleName: styleName,
        lineStyleLabel,
        rootStyleName,
        rootStyleLabel,
        ...contentMetadata
      },
      pageNumber: null // Initialize pageNumber to null
    }

    lines.push(line)
    lineNumber++
  }

  return lines
}

/**
 * Extract text content from a paragraph element
 */
function extractTextFromParagraph(para: Element): string {
  const textNodes: string[] = []

  function traverse(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node.textContent || '')
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      // Handle line breaks and tabs
      if (element.tagName === 'text:line-break') {
        textNodes.push('\n')
      } else if (element.tagName === 'text:tab') {
        textNodes.push('\t')
      } else if (element.tagName === 'office:annotation') {
        // Do not traverse into annotations
      } else {
        // Recursively traverse child nodes
        for (let i = 0; i < node.childNodes.length; i++) {
          traverse(node.childNodes[i])
        }
      }
    }
  }

  for (let i = 0; i < para.childNodes.length; i++) {
    traverse(para.childNodes[i])
  }

  return textNodes.join('')
}

/**
 * Serialize an XML element to string
 */
function serializeElementToXML(element: Element): string {
  const serializer = new XMLSerializer()
  return serializer.serializeToString(element)
}

/**
 * Build a map of styleName -> { name, displayName, parent }
 */
function buildStyleMap(stylesDoc: XMLDocument, out: Map<string, { name: string; displayName?: string; parent?: string }>): void {
  const styles = stylesDoc.getElementsByTagName('style:style')
  for (let i = 0; i < styles.length; i++) {
    const el = styles[i] as Element
    const name = el.getAttribute('style:name') || undefined
    if (!name) continue
    const displayName = el.getAttribute('style:display-name') || undefined
    const parent = el.getAttribute('style:parent-style-name') || undefined
    out.set(name, { name, displayName, parent })
  }
}

/**
 * Apply subtype rules to determine subtype from text content
 */
function applySubtypeRules(text: string, subtypeRules: readonly SubtypeRule[]): string | undefined {
  for (const rule of subtypeRules) {
    try {
      const regex = new RegExp(rule.pattern, 'i')
      const match = text.match(regex)

      if (match) {
        if (rule.subtype.startsWith('$')) {
          // Handle capture group references like "$1", "$2", etc.
          const groupIndex = parseInt(rule.subtype.substring(1))
          if (groupIndex > 0 && groupIndex < match.length) {
            return match[groupIndex]
          }
        } else {
          // Use the literal subtype value
          return rule.subtype
        }
      }
    } catch (error) {
      // Invalid regex, skip this rule
      console.warn(`Invalid regex pattern in subtype rule: ${rule.pattern}`)
    }
  }

  return undefined
}

/**
 * Resolve line type and subtype from style hierarchy using configuration
 */
function resolveLineTypeFromConfig(
  para: Element,
  text: string,
  styleMap: Map<string, { name: string; displayName?: string; parent?: string }>,
  config: ODTParserConfig
): { lineType: LineType; lineSubType?: string } {
  const styleName = para.getAttribute('text:style-name')

  if (styleName) {
    // Walk the style hierarchy from specific to general (child to parent)
    const styleHierarchy: string[] = []
    let currentStyleName = styleName

    // Build hierarchy chain
    while (currentStyleName) {
      styleHierarchy.push(currentStyleName)
      const styleEntry = styleMap.get(currentStyleName)
      currentStyleName = styleEntry?.parent || ''
    }

    // Check each style in hierarchy against configuration (first match wins)
    for (const hierarchyStyle of styleHierarchy) {
      const styleEntry = styleMap.get(hierarchyStyle)
      const styleNamesToCheck = [
        hierarchyStyle,  // The style name itself
        styleEntry?.displayName  // The display name/label
      ].filter(Boolean) as string[]  // Filter out undefined values

      for (const styleName of styleNamesToCheck) {
        for (const mapping of config.styleMappings) {
          for (const pattern of mapping.stylePatterns) {
            if (styleName.toLowerCase().includes(pattern.toLowerCase())) {
              // Check if there are subtype rules to apply
              let determinedSubtype = mapping.lineSubType

              if (mapping.subtypeRules && mapping.subtypeRules.length > 0) {
                const ruleBasedSubtype = applySubtypeRules(text, mapping.subtypeRules)
                if (ruleBasedSubtype) {
                  determinedSubtype = ruleBasedSubtype
                }
              }

              // Fall back to style name if no subtype determined
              if (!determinedSubtype) {
                determinedSubtype = styleName
              }

              return {
                lineType: mapping.lineType,
                lineSubType: determinedSubtype
              }
            }
          }
        }
      }
    }
  }

  // No style match found, use fallback
  return {
    lineType: config.fallbackLineType,
    lineSubType: styleName
  }
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

/**
 * Detect line type based on style information only
 */
function detectLineType(text: string, para: Element, styleMap: Map<string, { name: string; displayName?: string; parent?: string }>, config: ODTParserConfig): LineType {
  // Only use style-based detection for line type
  const styleResult = resolveLineTypeFromConfig(para, text, styleMap, config)
  return styleResult.lineType
}
