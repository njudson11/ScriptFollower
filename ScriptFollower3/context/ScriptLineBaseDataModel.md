# ScriptLineBase Data Model

## Overview

`ScriptLineBase` is the core immutable data structure representing a single line in a script. It's the foundation of all script-related operations in ScriptFollower 3.

## Data Structure

```typescript
interface ScriptLineBase {
  readonly id: string                    // Unique identifier (format: line_docId_lineNumber)
  readonly documentId: string            // Reference to parent document
  readonly lineNumber: number            // 1-based line position in document
  readonly lineType: LineType            // Classification (CHARACTER, DIALOGUE, etc.)
  readonly lineSubType?: string          // More specific classification within lineType
  readonly text: string                  // Full text content
  readonly annotation?: string          // Optional: Extracted annotation text associated with this line
  readonly metadata: Readonly<Record<string, any>>  // Extension point for feature data
  readonly pageNumber: number | null     // Page number the line appears on, or null if not determined
}
```

## Line Types (Stage Play Specific)

```typescript
enum LineType {
  TITLE = 'TITLE',                        // Document title
  SUBTITLE = 'SUBTITLE',                   // Document subtitle
  ACT_HEADING = 'ACT_HEADING',             // "ACT ONE", "ACT TWO"
  SCENE_HEADING = 'SCENE_HEADING',         // "INT. OFFICE - DAY", "EXT. STREET - NIGHT"
  CHARACTER_LIST = 'CHARACTER_LIST',       // Character name lists
  DIALOGUE = 'DIALOGUE',                   // "Hello, how are you?"
  STAGE_DIRECTION = 'STAGE_DIRECTION',     // "John enters quickly", "Thunder crashes"
  TECH_CUE = 'TECH_CUE',                   // Technical cues (lights, sound, effects)
  SOUND_CUE = 'SOUND_CUE',                 // Sound-related cues
  LIGHT_CUE = 'LIGHT_CUE',                 // Lighting cues
  PAGE_NUMBER = 'PAGE_NUMBER',             // A line explicitly marking a page number
  BLANK = 'BLANK'                          // Empty lines
}
```

**Note:** Line types are determined solely from document style information. Content-based analysis (such as detecting parentheticals) is stored in metadata for feature use.
## Line SubType

`lineSubType` provides more specific classification within a `lineType`. It's an optional string field that can contain style information, formatting details, or other sub-classifications.

### Purpose
- **Style-based classification**: For ODT documents, often contains the paragraph style name
- **Formatting hints**: Indicates specific formatting applied to the line
- **Feature-specific subtypes**: Can be used by features to distinguish between variations of the same line type
- **Configuration-driven**: Populated by the ODT parser configuration system

### ODT Parser Configuration
The ODT parser uses a configurable mapping system that determines `lineType` and `lineSubType` based on paragraph styles, and also extracts additional metadata based on content.

```typescript
// Example configuration mapping
{
  lineType: LineType.DIALOGUE,
  stylePatterns: ['Dialogue', 'P1', 'Normal'],
  subtypeRules: [
    { subtype: '$1', pattern: '^(.*?):\t.*' }  // Capture character name
  ]
},
// Example for metadata extraction
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
```

When matching styles, the parser checks both the internal style name and the display name (label) from the ODT document against the configured patterns.

#### Subtype Rules
Subtype rules allow dynamic determination of subtypes based on text content using regex patterns:

- **Static subtypes**: `{ subtype: 'A', pattern: '^SOUND A\t.*' }`
- **Capture groups**: `{ subtype: '$1', pattern: '^(.*?):\t.*' }` - extracts character names
- **Multiple rules**: First matching rule wins, processed in order

### Examples
```typescript
// For DIALOGUE lines in ODT documents
line.lineType = LineType.DIALOGUE
line.lineSubType = "P1"  // Paragraph style name

// For STAGE_DIRECTION lines with configured subtype
line.lineType = LineType.STAGE_DIRECTION
line.lineSubType = "action"  // Configured subtype

### Content Analysis in Metadata

While LineType is determined solely from style information, content analysis results are stored in metadata:

```typescript
// Content hints stored in metadata
metadata: {
  contentHint: 'parenthetical',  // Previously would have set LineType.PARENTHETICAL
  isAllCaps: true,
  hasParentheses: true,
  length: 12,
  characterName: 'JOHN', // Extracted via MetadataExtractionRule
  dialogue: 'Hello, world!' // Extracted via MetadataExtractionRule
}
```

This allows features to use content-based analysis without affecting the core line type classification.
### Line Type Descriptions

#### ACT_HEADING
- Marks major sections of the play
- Typically all-caps: "ACT ONE", "ACT TWO"
- Marks structural boundaries
- Used for navigation and scene organization

#### SCENE_HEADING
- Location and time information
- Format: "INT/EXT. LOCATION - TIME"
- Examples:
  - "INT. JOHN'S APARTMENT - MORNING"
  - "EXT. STREET - NIGHT"
  - "INT/EXT. TRAIN - CONTINUOUS"
- Used for identifying distinct settings

#### CHARACTER
- Character name for dialogue
- Typically all-caps
- 2-30 characters
- No punctuation (except apostrophes)
- Followed by dialogue or parenthetical

#### DIALOGUE
- Words spoken by characters
- Can span multiple lines
- May contain contractions, punctuation
- Context determines presence (precedes DIALOGUE, follows CHARACTER)

#### STAGE_DIRECTION
- Instructions for actors/directors
- Describes actions, movements, props
- Examples:
  - "John enters from stage left"
  - "The phone rings"
  - "She looks at him with concern"
- May be indented or have formatting cues

#### PARENTHETICAL
- Actor direction within dialogue
- Enclosed in parentheses
- Examples:
  - "(to Mary)"
  - "(nervously)"
  - "(pauses for effect)"
- Appears between CHARACTER and DIALOGUE

#### BLANK
- Empty lines
- Serve as visual separators
- Preserved for formatting fidelity
- May be filtered in UI if needed

#### PAGE_NUMBER (New)
- A line explicitly marking a page number in the document.
- The numeric value is extracted from the line's text and stored in `pageNumber` property.

## Immutability Philosophy

All fields are `readonly` to ensure:

1. **Predictability**: Lines never change unexpectedly
2. **Debugging**: Easier to trace state changes
3. **Performance**: Can safely cache and reference lines
4. **Multi-threading ready**: No synchronization needed

## Common Cue Behaviours

To provide consistent interaction across different cue types, ScriptFollower 3 defines a `BaseCue` structure for shared automation and control logic.

### BaseCue Interface
```typescript
interface BaseCue {
  readonly stop?: string           // Stop behaviour: "all", "previous", or list of SoundRefs "[0001,0002]"
  readonly endBehaviour?: EndBehaviour // Action to take when a timed event completes
  readonly loopCount?: number      // For 'loop' behaviour: number of iterations (0 = indefinite)
  readonly jumpRef?: string        // For 'jump-to' behaviour: target SoundRef to navigate to
}
```

### EndBehaviour Type
```typescript
type EndBehaviour = 'none' | 'loop' | 'next-line' | 'next-cue' | 'jump-to';
```

## SoundCue Data Structure

Specific cue types like `SoundCue` extend this base structure to add type-specific properties.

```typescript
interface SoundCue extends BaseCue {
  readonly id: string
  readonly url: string
  readonly name: string
  readonly volume: number          // 0-150
  readonly pan: 'left' | 'right' | 'centre'
  readonly panStart?: number       // -1.0 to 1.0 (Dynamic start balance)
  readonly panEnd?: number         // -1.0 to 1.0 (Dynamic end balance)
  readonly startOffsetSeconds?: number
  readonly endOffsetSeconds?: number
  readonly fadeIn?: number         // ms
  readonly fadeOut?: number        // ms
  readonly channelId: string       // Target mixing channel
}
```

## ID Generation

IDs follow format: `line_{documentId}_{lineNumber}`

Example: `line_doc_1708350000_5`

Benefits:
- Globally unique within document
- Human-readable
- Deterministic (same document = same IDs)
- Enables line reference in features

## Metadata Extension Point

The `metadata` field is `readonly Record<string, any>` allowing:

```typescript
// Features can store data without modifying core
line.metadata['sound'] = { volume: 50, cueId: 'cue_123' }
line.metadata['lights'] = { intensity: 80, color: '#FF0000' }
line.metadata['voice'] = { speaker: 'actor_1', recorded: true }

// ODT-specific metadata
line.metadata['originalXml'] = '<text:p text:style-name="P1">Hello World</text:p>'
line.metadata['paragraphIndex'] = 5
line.metadata['lineStyleName'] = 'P1'
line.metadata['lineStyleLabel'] = 'Text body' // human-friendly display name from styles.xml
line.metadata['rootStyleName'] = 'Standard' // top-level style in the style hierarchy
line.metadata['rootStyleLabel'] = 'Standard' // display name for the root style
```

## Document Structure

```typescript
interface Document {
  readonly id: string                    // Unique document ID
  readonly name: string                  // User-visible name (filename)
  readonly format: 'DOCX' | 'ODT' | 'PDF' | 'XML'
  readonly lines: readonly ScriptLineBase[]
  readonly createdAt: Date              // File creation date
  readonly updatedAt: Date              // Last modification date
  readonly styles?: readonly StyleInfo[]; // Optional: List of styles found in the document
}
```

## Document Properties

- **Immutability**: All properties `readonly`
- **Format**: Indicates source format (preserved for round-trip)
- **Lines**: Indexed array allows O(1) lookups
- **Metadata**: Timestamps for file tracking

## Creating ScriptLineBase

```typescript
// During document parsing
const line: ScriptLineBase = {
  id: `line_${docId}_${lineNum}`,
  documentId: docId,
  lineNumber: lineNum,
  lineType: LineType.DIALOGUE,
  text: "Hello, this is my line.",
  annotation: "This is a comment about the line.", // Example annotation
  metadata: {
    characterName: 'JOHN',
    dialogue: 'Hello, this is my line.'
  },
  pageNumber: 1 // Example page number
}
```

## Line Detection Algorithm

Parsers use these heuristics:

### ACT_HEADING
- All-caps text
- Contains "ACT"
- Length typically 10-30 characters
- Starts at beginning of line

### SCENE_HEADING
- All-caps text
- Starts with INT/EXT
- Contains hyphen and time reference
- Usually followed by blank line

### CHARACTER
- All-caps single line
- 2-30 characters
- No punctuation (except apostrophes)
- Followed by dialogue or parenthetical

### DIALOGUE
- Normal capitalization
- Anything not matching above
- Follows CHARACTER or PARENTHETICAL
- Can span multiple lines

#### Custom Rendering for Dialogue Lines
Dialogue lines can have custom rendering provided by features. For example, a `DialogueRenderingFeature` can register a specific Vue component (`DialogueLine.vue`) to display the `characterName` and `dialogue` (extracted from metadata) in separate UI elements.

### PARENTHETICAL
- Starts with `(`
- Ends with `)`
- 3-50 characters
- Between CHARACTER and DIALOGUE

### STAGE_DIRECTION
- Starts with capital letter
- Contains action verbs
- May be indented
- Ends with period or punctuation

### BLANK
- Empty string
- Whitespace-only string

## Line Numbering

- **1-based**: First line is 1, not 0
- **Sequential**: No gaps in numbering
- **Consistent**: Matches order in `lines` array
- **Preservation**: Used in error messages and navigation

## Performance Characteristics

### Memory
- Each line object: ~200 bytes (varies with text)
- 1000-line script: ~200KB + text data
- Document array: Contiguous memory (fast iteration)

### Access
- By index: O(1) - `lines[50]`
- By ID: O(n) - requires search (can add Map if needed)
- By line type: O(n) - requires filter

### Mutation
- Creating new document: O(n) copy all lines
- Architectural choice: Immutability worth cost

## Validation Rules

```typescript
function validateScriptLine(line: ScriptLineBase): boolean {
  if (!line.id || !line.id.startsWith('line_')) return false
  if (!line.documentId) return false
  if (line.lineNumber < 1) return false
  if (!line.lineType || !(line.lineType in LineType)) return false
  if (typeof line.text !== 'string') return false
  if (typeof line.metadata !== 'object') return false
  return true
}
```

## Export/Import

### Export to JSON
```typescript
const json = JSON.stringify(document, null, 2)
// Includes all line data and metadata
```

### Import from JSON
```typescript
const imported = JSON.parse(json) as Document
// Retains all line data
// Recalculate lineNumber if needed (or verify)
```

### Features Export Their Data
```typescript
// Feature-specific export (e.g., Sound Feature)
const soundData = document.lines
  .map(line => ({
    lineId: line.id,
    cues: line.metadata['sound']?.cues ?? []
  }))
  .filter(item => item.cues.length > 0)
```

## Line Access Patterns

### Get all dialogue lines
```typescript
const dialogueLines = document.lines.filter(
  line => line.lineType === LineType.DIALOGUE
)
```

### Get all character appearances
```typescript
const characters = new Set<string>()
for (const line of document.lines) {
  if (line.lineType === LineType.CHARACTER_LIST) {
    characters.add(line.text)
  }
}
```

### Get line by number (1-based)
```typescript
const line = document.lines[lineNumber - 1]
```

### Get lines with feature data
```typescript
const linesWithSound = document.lines.filter(
  line => 'sound' in line.metadata
)
```

## Thread Safety

- Immutability enables safe concurrent reads
- No locks needed for read operations
- Updates create new Document instances
- Can be used in Web Workers
- Can be passed between components safely

## Testing Strategy

```typescript
// Create test line
const testLine: ScriptLineBase = {
  id: 'line_test_1',
  documentId: 'test',
  lineNumber: 1,
  lineType: LineType.CHARACTER_LIST,
  text: 'JOHN',
  metadata: {}
}

// Verify immutability
Object.freeze(testLine)
testLine.text = 'MARY'  // TypeError: Cannot assign to read only property
```

## Future Extensions

Currently implemented metadata:
- `originalXml`: Original XML markup for ODT paragraphs (preserves formatting)
- `paragraphIndex`: Position in original document for ODT files
- `lineStyleName`: Style name from `text:style-name` attribute for ODT files
- `lineStyleLabel`: Human-friendly display name for the line style (from `styles.xml`)
- `rootStyleName`: The top-level style name this line style belongs to (parent chain)
- `rootStyleLabel`: Display name for the `rootStyleName` (from `styles.xml`)

Possible future metadata enhancements:
- `cuePoints`: Array of feature-specific timing data
- `displayOptions`: UI rendering preferences per line
- `linkedData`: References to external resources