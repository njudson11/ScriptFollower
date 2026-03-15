import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import JSZip from 'jszip'
import { Document, ScriptLineBase, LineType, StyleInfo, IDocumentParser } from '../types/core'

const ODT_NAMESPACES = `xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0" xmlns:number="urn:oasis:names:tc:opendocument:xmlns:datastyling:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:dr3d="urn:oasis:names:tc:opendocument:xmlns:dr3d:1.0" xmlns:math="http://www.w3.org/1998/Math/MathML" xmlns:form="urn:oasis:names:tc:opendocument:xmlns:form:1.0" xmlns:script="urn:oasis:names:tc:opendocument:xmlns:script:1.0" xmlns:ooo="http://openoffice.org/2004/office" xmlns:ooow="http://openoffice.org/2004/writer" xmlns:oooc="http://openoffice.org/2004/calc" xmlns:dom="http://www.w3.org/2001/xml-events" xmlns:xforms="http://www.w3.org/2002/xforms" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:rpt="http://openoffice.org/2005/report" xmlns:of="urn:oasis:names:tc:opendocument:xmlns:of:1.2" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:grddl="http://www.w3.org/2003/g/data-view#" xmlns:officeooo="http://openoffice.org/2009/office" xmlns:tableooo="http://openoffice.org/2009/table" xmlns:drawooo="http://openoffice.org/2010/draw" xmlns:calcext="http://openoffice.org/2009/calc" xmlns:loext="http://western-albany.com/value/1.0" xmlns:field="urn:openoffice:names:experimental:ooo-ms-interop:xmlns:field:1.0" xmlns:formooo="http://openoffice.org/2009/form" xmlns:css3t="http://www.w3.org/TR/css3-text/"`;

export class ODTParser implements IDocumentParser {
  public readonly format = 'ODT'
  private xmlParser: XMLParser
  private orderedParser: XMLParser
  private builder: XMLBuilder

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      processEntities: true,
      trimValues: false,
      parseTagValue: false
    })

    this.orderedParser = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: true,
      attributeNamePrefix: '@_',
      processEntities: true,
      trimValues: false,
      parseTagValue: false
    })

    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      preserveOrder: true,
      indentBy: '  '
    })
  }

  async parse(data: File | ArrayBuffer, fileName: string, config: any): Promise<Document> {
    const zip = new JSZip()
    const loaded = await zip.loadAsync(data)

    const contentFile = loaded.file('content.xml')
    if (!contentFile) throw new Error('Invalid ODT: content.xml missing')

    const xmlContent = await contentFile.async('text')
    const jsonObj = this.xmlParser.parse(xmlContent)

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
        const stylesJson = this.xmlParser.parse(stylesContent)
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
        console.warn('[ODTParser] Failed to parse styles.xml', e)
      }
    }

    const orderedJson = this.orderedParser.parse(xmlContent)
    const orderedBody = this.findOrderedElement(orderedJson, 'office:text')
    
    const lines: ScriptLineBase[] = []
    const documentId = `doc_${Date.now()}`
    let lineNumber = 1

    if (orderedBody) {
      orderedBody.forEach((el: any) => {
        const tagName = Object.keys(el)[0]
        if (tagName === 'text:p' || tagName === 'text:h') {
          const content = el[tagName]
          const text = this.extractTextFromOrdered(content).trim()
          if (text === '') return

          const attrs = el[':@'] || {}
          const styleName = attrs['@_text:style-name']

          // Find line type based on style hierarchy
          const typeResult = this.resolveTypeFromHierarchy(styleName, text, styleMap, config)

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
          const contentMetadata = this.analyzeLineContent(text)

          // Extract subtype from content if rules exist (New logic)
          let finalLineSubType = typeResult.lineSubType;
          const matchingMapping = config.styleMappings.find((m: any) => m.lineType === typeResult.lineType);
          if (matchingMapping?.subtypeRules) {
            for (const rule of matchingMapping.subtypeRules) {
              const regex = new RegExp(rule.pattern);
              const match = text.match(regex);
              if (match) {
                if (rule.subtype.startsWith('$')) {
                  const groupIdx = parseInt(rule.subtype.substring(1));
                  if (groupIdx < match.length) {
                    finalLineSubType = match[groupIdx].trim();
                  }
                } else {
                  finalLineSubType = rule.subtype;
                }
                break; // First rule wins
              }
            }
          }

          // Extract annotation
          const annotation = this.extractAnnotationFromOrdered(content)

          // Generate XML fragment and inject namespaces into the first tag
          const rawFragment = this.builder.build([el]);
          const tagEnd = rawFragment.indexOf('>');
          const originalXml = rawFragment.slice(0, tagEnd) + ' ' + ODT_NAMESPACES + rawFragment.slice(tagEnd);

          lines.push({
            id: `line_${documentId}_${lineNumber}`,
            documentId,
            lineNumber,
            lineType: typeResult.lineType,
            lineSubType: finalLineSubType,
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

  private findOrderedElement(arr: any[], name: string): any[] | null {
    for (const el of arr) {
      const key = Object.keys(el)[0]
      if (key === name) return el[key]
      if (Array.isArray(el[key])) {
        const found = this.findOrderedElement(el[key], name)
        if (found) return found
      }
    }
    return null
  }

  private extractTextFromOrdered(content: any): string {
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) return ""
    
    return content.map(el => {
      const key = Object.keys(el)[0]
      const val = el[key]
      
      if (key === '#text') return val
      if (key === 'text:line-break') return '\n'
      if (key === 'text:tab') return '\t'
      if (key === 'text:s') {
        const attrs = el[':@'] || {}
        const count = parseInt(attrs['@_text:c'] || '1')
        return ' '.repeat(isNaN(count) ? 1 : count)
      }
      if (key === 'office:annotation') return ''
      
      return this.extractTextFromOrdered(val)
    }).join('')
  }

  private extractAnnotationFromOrdered(content: any[]): string | undefined {
    if (!Array.isArray(content)) return undefined
    const annotations: string[] = []
    
    const findAnnotationsRecursive = (items: any[]) => {
      if (!Array.isArray(items)) return

      items.forEach(el => {
        const key = Object.keys(el)[0]
        if (key === 'office:annotation') {
          const annotationBody = el[key]
          if (Array.isArray(annotationBody)) {
            annotationBody.forEach(item => {
              const itemKey = Object.keys(item)[0]
              if (itemKey === 'text:p') {
                annotations.push(this.extractTextFromOrdered(item[itemKey]))
              }
            })
          }
        } else if (typeof el[key] === 'object') {
          findAnnotationsRecursive(el[key])
        }
      })
    }

    findAnnotationsRecursive(content)
    
    return annotations.length > 0 ? annotations.join('\n') : undefined
  }

  private resolveTypeFromHierarchy(styleName: string, text: string, styleMap: Map<string, StyleInfo>, config: any): { lineType: LineType, lineSubType?: string } {
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

  private analyzeLineContent(text: string): Record<string, any> {
    const metadata: Record<string, any> = {}

    if (!text || text.length === 0) {
      metadata.contentType = 'blank'
      return metadata
    }

    const trimmed = text.trim()
    const allCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 2

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

    metadata.isAllCaps = allCaps
    metadata.hasParentheses = trimmed.includes('(') && trimmed.includes(')')
    metadata.length = trimmed.length

    return metadata
  }
}
