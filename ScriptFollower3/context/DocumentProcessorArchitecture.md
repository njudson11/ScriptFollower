# Document Processor Architecture

## Overview

The Document Processor handles loading various document formats and converting them into `Document` objects. The process is divided into two main stages: **Parsing** (format-specific) and **Post-Processing** (generic enhancements).

## Architecture

```
ProjectManager (Orchestrator)
│
├── 1. Parsing Phase (Format-Specific)
│   ├── ODTParser (.odt)
│   ├── DOCXParser (.docx) - Future
│   ├── PDFParser (.pdf) - Future
│   └── XMLParser (.xml) - Future
│
└── 2. Post-Processing Phase (Generic)
    ├── MetadataExtraction (Regex rules from AppConfig)
    ├── CharacterPropagation (Forward-fill missing names)
    ├── SubTypeSync (Sync characterName to lineSubType)
    └── PageNumberPropagation (Reverse propagation)
```

## Parsing Phase

### ODT Parser

The `ODTParser` extracts script lines from OpenDocument Text (.odt) files by processing `content.xml`. It identifies paragraph types based on style mappings and extracts annotations.

```typescript
// Parsers return a Document with raw metadata and basic line types
export async function parseODT(file: File, config: ODTParserConfig): Promise<Document> {
  // ... extracts XML, builds style map, returns Document ...
}
```

## Post-Processing Phase (`DocumentPostProcessor`)

The `DocumentPostProcessor` is a centralized, format-agnostic component that enhances the raw document data. This ensures consistent metadata and feature behavior regardless of the source file format.

### 1. Metadata Extraction
Uses regex patterns defined in `AppConfig.parsing.metadataExtractionRules` to populate line metadata (e.g., extracting `characterName` and `dialogue` from a single text string).

### 2. Character Name Propagation
For `DIALOGUE` lines missing a `characterName`, the processor forward-fills the value from the most recent dialogue line that had a name defined.

### 3. SubType Synchronization
Ensures that for all `DIALOGUE` lines, the `lineSubType` property matches the `characterName`. This is critical for character-based coloring and audio routing.

### 4. Page Number Propagation
Propagates page numbers throughout the document. Since page numbers in ODT often appear at the bottom of a page, the processor uses **reverse propagation** (iterating from the end of the script to the beginning) to ensure all lines are associated with the correct page.

## Configuration System

### Metadata Extraction Rules (`AppConfig.ts`)
Generic rules applied to all documents after parsing:

```typescript
export interface MetadataExtractionRule {
  readonly lineType: LineType;
  readonly pattern: string;    // Regex with capture groups
  readonly mappings: Record<string, string>; // Maps capture groups to metadata keys
}
```

### ODT Parser Config (`ODTConfig.ts`)
Specific to ODT style-to-line-type mappings:

```typescript
export interface ODTParserConfig {
  readonly styleMappings: readonly ODTStyleMapping[];
  readonly fallbackLineType: LineType;
}
```

## Orchestration (`ProjectManager.ts`)

The `ProjectManager` handles the sequence of operations:

```typescript
// 1. Parse based on extension
let document = await parseODT(file);

// 2. Apply generic enhancements
document = DocumentPostProcessor.process(
  document, 
  AppConfig.parsing.metadataExtractionRules
);

// 3. Load into store
this.appStore.loadDocument(document);
```

## Success Criteria

✅ **Consistency**: Metadata is extracted identically for any document format.
✅ **Robustness**: Character names are preserved across line breaks without redundant style definitions.
✅ **Maintainability**: New document formats only require a basic parser; all intelligence lives in the post-processor.