# Document Processor Architecture

## Overview

The Document Processor handles loading various document formats and converting them into `Document` objects containing `ScriptLineBase` arrays.

## File Format Support

- **DOCX**: Microsoft Word (.docx)
- **ODT**: OpenDocument Text (.odt)
- **PDF**: Portable Document Format (.pdf)
- **XML**: Custom XML format (.xml)

## Architecture

```
DocumentProcessor
├── FileFormatDetector
├── ModuleParser
│   ├── DOCXParser
│   ├── ODTParser
│   ├── PDFParser
│   └── XMLParser
└── LineBuilder
    ├── LineTypeDetector
    └── ContentExtractor
```

## FileFormatDetector

```typescript
class FileFormatDetector {
  detect(file: File): 'DOCX' | 'ODT' | 'PDF' | 'XML' | null {
    // By extension
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'docx') return 'DOCX'
    if (ext === 'odt') return 'ODT'
    if (ext === 'pdf') return 'PDF'
    
    // By MIME type
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return 'DOCX'
    }
    if (file.type === 'application/vnd.oasis.opendocument.text') {
      return 'ODT'
    }
    if (file.type === 'application/pdf') {
      return 'PDF'
    }
    
    // XML is a generic format, so we don't rely solely on MIME type for broad detection.
    // It's expected to be custom XML for native ScriptFollower documents.
    if (ext === 'xml') return 'XML'
    
    return null
  }
}
```

## Format-Specific Parsers

### ODT Parser

The `ODTParser` is responsible for parsing OpenDocument Text (.odt) files. ODT files are essentially ZIP archives containing XML. The parser extracts `content.xml`, and then processes its content to identify paragraphs, apply style-based classification for line types, extract annotations, and populate metadata.

```typescript
import { Document, ScriptLineBase, LineType } from '@/types/core'
import { ODTParserConfig, defaultODTConfig, SubtypeRule, MetadataExtractionRule } from './ODTConfig'
import JSZip from 'jszip'

export async function parseODT(file: File, config: ODTParserConfig = defaultODTConfig): Promise<Document> {
  const zip = new JSZip()
  const loaded = await zip.loadAsync(file)
  const contentFile = loaded.file('content.xml')
  if (!contentFile) throw new Error('Invalid ODT file: content.xml not found')
  const xmlContent = await contentFile.async('text')
  
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')
  
  const lines = extractLinesFromXML(xmlDoc, /* styleMap */ new Map(), config) // styleMap is built internally in extractLinesFromXML

  // Remaining document creation logic
  return {
    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: file.name.replace('.odt', ''),
    format: 'ODT',
    lines,
    styles: [], // Populated during parsing
    version: 1,
    createdAt: new Date(file.lastModified),
    updatedAt: new Date()
  }
}
```

### DOCX Parser

DOCX is also ZIP-based containing XML.

```typescript
async function parseDOCX(file: File): Promise<Document> {
  const zip = new JSZip()
  const loaded = await zip.loadAsync(file)
  
  // DOCX stores content in word/document.xml
  const documentFile = loaded.file('word/document.xml')
  const xmlContent = await documentFile.async('text')
  
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')
  
  const paragraphs = xmlDoc.getElementsByTagName('w:p')
  const lines = extractLinesFromParagraphs(paragraphs)
  
  return {
    id: generateDocumentId(),
    name: file.name.replace('.docx', ''),
    format: 'DOCX',
    lines,
    createdAt: new Date(file.lastModified),
    updatedAt: new Date()
  }
}
```

### PDF Parser

PDF parsing requires library (pdfjs).

```typescript
import * as pdfjsLib from 'pdfjs-dist'

async function parsePDF(file: File): Promise<Document> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  const textLines: string[] = []
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const text = textContent.items.map((item: any) => item.str).join(' ')
    textLines.push(text)
  }
  
  const lines = textLines.map((text, idx) => ({
    id: `line_pdf_${idx}`,
    documentId: 'pdf_doc',
    lineNumber: idx + 1,
    lineType: detectLineType(text),
    text,
    metadata: {}
  }))
  
  return {
    id: generateDocumentId(),
    name: file.name.replace('.pdf', ''),
    format: 'PDF',
    lines,
    createdAt: new Date(file.lastModified),
    updatedAt: new Date()
  }
}
```

### XML Parser

Custom XML format for native storage.

```typescript
async function parseXML(file: File): Promise<Document> {
  const text = await file.text()
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(text, 'text/xml')
  
  // Expect structure: <document><line type=\"...\">text</line>...</document>
  const lineElements = xmlDoc.getElementsByTagName('line')
  const lines = Array.from(lineElements).map((el, idx) => ({
    id: `line_${idx}`,
    documentId: 'xml_doc',
    lineNumber: idx + 1,
    lineType: el.getAttribute('type') as LineType,
    text: el.textContent || '',
    metadata: JSON.parse(el.getAttribute('metadata') || '{}')
  }))
  
  return {
    id: generateDocumentId(),
    name: file.name.replace('.xml', ''),
    format: 'XML',
    lines,
    createdAt: new Date(file.lastModified),
    updatedAt: new Date()
  }
}
```

## ODT Parser Configuration System

The ODT parser now uses a configurable mapping system that determines line types based on paragraph styles, extracts metadata, and applies subtype rules rather than hardcoded heuristics.

### Configuration Structure

```typescript
import { LineType } from '@/types/core'

export interface ODTStyleMapping {
  readonly lineType: LineType
  readonly lineSubType?: string
  readonly stylePatterns: readonly string[]
  readonly subtypeRules?: readonly SubtypeRule[]
}

export interface SubtypeRule {
  readonly subtype: string  // The subtype value, or "$1", "$2", etc. for capture groups
  readonly pattern: string  // Regex pattern to match against the line text
}

export interface MetadataExtractionRule {
  readonly lineType: LineType; // The line type this rule applies to
  readonly pattern: string;    // The regex pattern to match against the line text
  readonly mappings: Readonly<Record<string, string>>; // Mapping of metadata key to capture group (e.g., { characterName: '$1', dialogue: '$2' })
}

export interface ODTParserConfig {
  readonly styleMappings: readonly ODTStyleMapping[]
  readonly fallbackLineType: LineType
  readonly metadataExtractionRules?: readonly MetadataExtractionRule[];
}
```

### Style Hierarchy Resolution

The parser walks the style hierarchy from specific to general, using the first matching pattern:

```typescript
// Example: Paragraph with style "BoldDialogue" -> "Dialogue" -> "P1"
// Checks both style name and display name for each level
const hierarchy = ["BoldDialogue", "Dialogue", "P1"]

// Configuration maps "Dialogue" pattern to LineType.DIALOGUE
{
  lineType: LineType.DIALOGUE,
  stylePatterns: ["Dialogue", "P1", "Normal"]
}
```

For each style in the hierarchy, both the internal style name and the display name (label) are checked against configuration patterns.

### Default Configuration

```typescript
export const defaultODTConfig: ODTParserConfig = {
  styleMappings: [
    { lineType: LineType.TITLE, stylePatterns: ["Heading", "Title"] },
    { lineType: LineType.SUBTITLE, stylePatterns: ["Scene", "Subtitle", "Heading 2", "Heading 3"] },
    { lineType: LineType.ACT_HEADING, stylePatterns: ["Act"] },
    { lineType: LineType.SCENE_HEADING, stylePatterns: ["Scene"] },
    { lineType: LineType.CHARACTER_LIST, stylePatterns: ["Character List"] },
    {
      lineType: LineType.DIALOGUE,
      stylePatterns: ["Dialogue"],
      subtypeRules: [
        { subtype: '$1', pattern: '^(.*?)\t.*' }  // Capture character name
      ]
    },
    { lineType: LineType.STAGE_DIRECTION, stylePatterns: ["Stage Direction"] },
    { lineType: LineType.TECH_CUE, stylePatterns: ["Tech", "Effect", "Curtains"] },
    {
      lineType: LineType.SOUND_CUE,
      stylePatterns: ['Sound A', 'Sound B', 'Sound'],
      subtypeRules: [
        { subtype: 'A', pattern: '^SOUND A\t.*' },
        { subtype: 'B', pattern: '^SOUND B\t.*' }
      ]
    },
    { lineType: LineType.LIGHT_CUE, stylePatterns: ["Light"] }
  ],
  fallbackLineType: LineType.DIALOGUE,
  metadataExtractionRules: [
    {
      lineType: LineType.DIALOGUE,
      pattern: '^(.*?)\t(.*)$', // Assuming "CHARACTER_NAME\tDIALOGUE_TEXT"
      mappings: {
        characterName: '$1',
        dialogue: '$2'
      }
    }
  ]
}
```

### Parser Usage

```typescript
// Use default configuration
const doc = await parseODT(file)

// Use custom configuration
const customConfig: ODTParserConfig = { ... }
const doc = await parseODT(file, customConfig)
```

## Content Analysis

Line types are determined primarily from style information. Content-based analysis is performed separately and stored in metadata, which can also be enhanced by `MetadataExtractionRules` from the configuration.

```typescript
function analyzeLineContent(text: string): Record<string, any> {
  // Returns metadata like:
  // { contentHint: 'parenthetical', isAllCaps: true, hasParentheses: true }
}
```

This separation ensures style-driven classification while preserving content analysis for features.

## Line Extraction (ODT Specific `extractLinesFromXML` and `extractTextFromParagraph`)

The `extractLinesFromXML` function processes the `content.xml` from the ODT file. It specifically targets top-level `<text:p>` elements that are direct children of `<office:text>`, preventing nested paragraphs within annotations from being treated as separate lines. It also extracts annotation text and applies metadata extraction rules.

```typescript
function extractLinesFromXML(xmlDoc: XMLDocument, styleMap: Map<string, { name: string; displayName?: string; parent?: string }>, config: ODTParserConfig): readonly ScriptLineBase[] {
  const lines: ScriptLineBase[] = []
  const officeText = xmlDoc.getElementsByTagName('office:text')[0];
  if (!officeText) { return []; }
  const paragraphs = Array.from(officeText.children).filter((child) => child.tagName === 'text:p');
  // ... (rest of the logic for processing each paragraph, detecting line type, extracting annotation, and applying metadata rules)
  
  return lines
}

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
        // Do not traverse into annotations for main text extraction
      } else {
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
```

## Main DocumentProcessor

```typescript
class DocumentProcessor {
  private detector = new FileFormatDetector()
  private eventBus: EventBus

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  async processFile(file: File): Promise<Document> {
    try {
      const format = this.detector.detect(file)
      
      if (!format) {
        throw new Error(`Unsupported file format: ${file.name}`)
      }

      const document = await this.parseByFormat(file, format)
      
      this.eventBus.emit({
        type: EVENT_TYPES.DOCUMENT_LOADED,
        payload: {
          documentId: document.id,
          documentName: document.name,
          lineCount: document.lines.length,
          format: document.format
        },
        timestamp: new Date()
      })

      return document
    } catch (error) {
      this.eventBus.emit({
        type: EVENT_TYPES.DOCUMENT_ERROR,
        payload: {
          documentName: file.name,
          error: error instanceof Error ? error.message : String(error)
        },
        timestamp: new Date()
      })
      throw error
    }
  }

  private async parseByFormat(file: File, format: string): Promise<Document> {
    switch (format) {
      case 'DOCX':
        return await parseDOCX(file)
      case 'ODT':
        return await parseODT(file)
      case 'PDF':
        return await parsePDF(file)
      case 'XML':
        return await parseXML(file)
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }
}
```

## Usage in App.vue

```typescript
const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    appStore.setLoading(true)
    const documentProcessor = new DocumentProcessor(eventBus)
    const document = await documentProcessor.processFile(file)
    appStore.loadDocument(document)
    
    if (document.lines.length > 0) {
      selectionManager.selectLine(document.lines[0].id)
    }
  } catch (error) {
    appStore.setError(error instanceof Error ? error.message : 'Failed to load')
  } finally {
    appStore.setLoading(false)
    input.value = ''
  }
}
```

## Error Handling

```typescript
try {
  const document = await processor.processFile(file)
} catch (error) {
  if (error.message.includes('Unsupported')) {
    // User feedback: file format not supported
  } else if (error.message.includes('corrupted')) {
    // File is corrupted
  } else {
    // Generic error
  }
}
```

## Extension Point

Adding a new format:

1. Create parser function
2. Register in `parseByFormat()`
3. Update `FileFormatDetector`
4. Test with sample files

```typescript
// Add support for .txt
async function parseTXT(file: File): Promise<Document> {
  const text = await file.text()
  const lineTexts = text.split('\n')
  const lines = lineTexts.map((text, idx) => ({
    // ...
  }))
  
  return { /* ... */ }
}
```

## Performance Considerations

- **Lazy Loading**: For large PDFs, process page-by-page
- **Memory**: ZIP extraction loads entire file in memory
- **UI Responsiveness**: Process in Web Worker for large files
- **Validation**: Validate format before processing

## Future Enhancements

1. **Progress Indication**: Report progress for large files
2. **Web Workers**: Offload parsing to background thread
3. **Streaming**: Parse large documents progressively
4. **Caching**: Cache parsed documents
5. **Round-trip**: Export back to original format
6. **Metadata Preservation**: Retain styling information (implemented for ODT: originalXml)

```