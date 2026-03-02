/**
 * Document Processing Web Worker
 * Handles heavy ZIP extraction, XML parsing, and post-processing enhancements.
 */

import { Document, LineType, MetadataExtractionRule, IDocumentParser } from '../types/core'
import { ODTParser } from '../parsers/ODTParser'

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

// Map of available parsers
const parsers: Record<string, IDocumentParser> = {
  'ODT': new ODTParser()
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { type, file, fileName, format, config, extractionRules } = e.data

  if (type === 'PARSE_DOCUMENT') {
    try {
      const parser = parsers[format]
      if (!parser) {
        throw new Error(`Unsupported format in worker: ${format}`)
      }

      let document = await parser.parse(file, fileName, config)

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
 * Generic Post-Processing (Ported from DocumentPostProcessor)
 * This logic is shared across all parsers to ensure consistent 
 * metadata extraction and propagation rules.
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
