# Line Selection and Focus Management

## Overview

The Line Selection Manager provides a centralized, modular system for:
- Tracking current line and selected lines
- Managing visual highlights with priority-based conflict resolution
- Supporting selection history with undo/redo
- Enabling features to register custom highlight types

## IHighlightTypeRegistry

```typescript
interface HighlightTypeRegistry {
  register(type: string, priority: number, style: HighlightStyle): void
  unregister(type: string): void
  get(type: string): HighlightStyle | undefined
  getAll(): Map<string, HighlightStyle>
}

interface HighlightStyle {
  backgroundColor?: string
  color?: string
  borderColor?: string
  borderWidth?: string
  opacity?: number
}
```

## Built-in Highlight Types

```typescript
export const DEFAULT_HIGHLIGHT_PRIORITIES = {
  SELECTED: 100,      // Current line
  PLAYING: 90,        // Currently playing sound
  TEMPORARY: 80,      // Brief visual feedback
  ERROR: 70,          // Error state
  CUSTOM_START: 50    // Features start at 50-69
}

// Built-in types registered by default
'selected' -> SELECTED (100)      // #e3f2fd blue background
'playing' -> PLAYING (90)         // #fff3e0 orange background
'error' -> ERROR (70)             // #ffebee red background
'temporary' -> TEMPORARY (80)     // Faded opacity
```

## Highlight Structure

```typescript
interface Highlight {
  readonly lineId: string
  readonly type: string           // e.g., 'selected', 'voice:matched'
  readonly priority: number       // Higher = more visible
  readonly expiresAt?: Date       // Auto-remove highlight
  readonly data?: Record<string, any>  // Feature-specific data
}
```

## LineSelectionManager

```typescript
class LineSelectionManager {
  // Selection
  selectLine(lineId: string): void
  toggleLineSelection(lineId: string): void
  getCurrentLine(): string | null
  getSelectedLines(): string[]

  // Highlights
  addHighlight(lineId: string, type: string, data?: any): void
  removeHighlight(lineId: string, type: string): void
  clearHighlights(lineId: string): void
  getHighlights(lineId: string): Highlight[]
  getPrimaryHighlight(lineId: string): Highlight | undefined

  // Registry
  getHighlightRegistry(): HighlightTypeRegistry

  // History
  undo(): void
  redo(): void
}
```

## Feature-Registered Highlight Types

Features can register custom highlight types:

### VoiceRecognitionFeature

```typescript
class VoiceRecognitionFeature implements FeaturePlugin {
  registerHighlightTypes(registry: HighlightTypeRegistry) {
    // Matched text (high confidence)
    registry.register('voice:matched', 65, {
      backgroundColor: '#c8e6c9',
      borderColor: '#4caf50',
      borderWidth: '2px'
    })

    // Partial match (lower confidence)
    registry.register('voice:partial', 60, {
      backgroundColor: '#fff9c4',
      borderColor: '#fbc02d',
      borderWidth: '1px'
    })

    // Not recognized
    registry.register('voice:unrecognized', 55, {
      backgroundColor: '#ffecb3',
      borderColor: '#ff9800',
      borderWidth: '1px'
    })
  }
}
```

### SearchFeature

```typescript
class SearchFeature implements FeaturePlugin {
  registerHighlightTypes(registry: HighlightTypeRegistry) {
    // Current search result
    registry.register('search:current', 62, {
      backgroundColor: '#fff59d',
      borderColor: '#fdd835',
      borderWidth: '3px'
    })

    // Other search results
    registry.register('search:found', 58, {
      backgroundColor: '#ffe082',
      borderColor: '#ffb300',
      borderWidth: '1px'
    })
  }
}
```

### ValidationFeature

```typescript
class ValidationFeature implements FeaturePlugin {
  registerHighlightTypes(registry: HighlightTypeRegistry) {
    registry.register('validation:warning', 63, {
      backgroundColor: '#fff3e0',
      borderColor: '#ff9800',
      borderWidth: '1px'
    })

    registry.register('validation:error', 64, {
      backgroundColor: '#ffebee',
      borderColor: '#f44336',
      borderWidth: '2px'
    })
  }
}
```

## Selection States

### Single Selection

```typescript
const currentLineId = selectionManager.getCurrentLine()
// "line_doc_1234_10"

const selected = selectionManager.getSelectedLines()
// ["line_doc_1234_10"]
```

### Multi-Selection

```typescript
selectionManager.toggleLineSelection("line_doc_1234_5")
selectionManager.toggleLineSelection("line_doc_1234_10")
selectionManager.toggleLineSelection("line_doc_1234_15")

const selected = selectionManager.getSelectedLines()
// ["line_doc_1234_5", "line_doc_1234_10", "line_doc_1234_15"]
```

## Highlight Management

### Add Highlight

```typescript
// Sound Feature marks line as "playing"
selectionManager.addHighlight('line_doc_1234_10', 'playing')

// Search Feature marks as "found"
selectionManager.addHighlight('line_doc_1234_10', 'search:found')

// A line can have multiple highlights
const highlights = selectionManager.getHighlights('line_doc_1234_10')
// [
//   { type: 'playing', priority: 90 },
//   { type: 'search:found', priority: 58 }
// ]

// UI shows highest priority
const primary = selectionManager.getPrimaryHighlight('line_doc_1234_10')
// { type: 'playing', priority: 90 }
```

### Temporary Highlights

Highlights can auto-expire:

```typescript
// Mark line as temporary for 2 seconds
const expiresAt = new Date(Date.now() + 2000)
selectionManager.addHighlight('line_doc_1234_10', 'temporary', { expiresAt })

// Auto-remove after expiry
setTimeout(() => {
  selectionManager.removeHighlight('line_doc_1234_10', 'temporary')
}, 2000)
```

### Highlight Conflicts

When multiple highlights apply, highest priority wins:

```
Line 10:
  - selected (priority 100) - Current line
  - voice:matched (priority 65) - Voice recognized this
  - search:found (priority 58) - Search result

UI uses highest priority: selected
Display: Blue background (selected style)
```

## Selection History

Selection maintains undo/redo stack:

```typescript
selectionManager.selectLine('line_doc_1234_1')
selectionManager.selectLine('line_doc_1234_5')
selectionManager.selectLine('line_doc_1234_10')

console.log(selectionManager.getCurrentLine())
// "line_doc_1234_10"

selectionManager.undo()
console.log(selectionManager.getCurrentLine())
// "line_doc_1234_5"

selectionManager.undo()
console.log(selectionManager.getCurrentLine())
// "line_doc_1234_1"

selectionManager.redo()
console.log(selectionManager.getCurrentLine())
// "line_doc_1234_5"
```

## Events

Selection changes emit events:

```typescript
eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, (event) => {
  const { lineId, oldLineId } = event.payload
  console.log(`Changed from ${oldLineId} to ${lineId}`)
})

eventBus.subscribe(EVENT_TYPES.HIGHLIGHT_ADDED, (event) => {
  const { lineId, highlight } = event.payload
  console.log(`Added ${highlight.type} to ${lineId}`)
})

eventBus.subscribe(EVENT_TYPES.HIGHLIGHT_REMOVED, (event) => {
  const { lineId, type } = event.payload
  console.log(`Removed ${type} from ${lineId}`)
})
```

## DocumentViewer Integration

DocumentViewer displays highlights based on selection state:

```vue
<template>
  <div
    v-for="line in lines"
    :key="line.id"
    class="script-line"
    :class="getLineClasses(line.id)"
    :style="getLineStyle(line.id)"
  >
    {{ line.text }}
  </div>
</template>

<script setup lang="ts">
const getLineClasses = (lineId: string) => {
  const classes = []
  const current = selectionManager.getCurrentLine()
  
  if (lineId === current) classes.push('current')
  
  const primary = selectionManager.getPrimaryHighlight(lineId)
  if (primary) classes.push(`highlight-${primary.type}`)
  
  return classes
}

const getLineStyle = (lineId: string) => {
  const primary = selectionManager.getPrimaryHighlight(lineId)
  if (!primary) return {}
  
  const style = highlightRegistry.get(primary.type)
  return style ? convertToCSS(style) : {}
}
</script>

<style scoped>
.script-line.current {
  background-color: #e3f2fd;
  border-left-color: #2196f3;
}

.script-line.highlight-playing {
  background-color: #fff3e0;
  border-left-color: #ff9800;
}

.script-line.highlight-search\:found {
  background-color: #ffe082;
  border-left-color: #ffb300;
}
</style>
```

## Keyboard Navigation

Arrow keys navigate selection:

```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  const lines = appStore.getLines()
  const currentIndex = lines.findIndex(
    l => l.id === selectionManager.getCurrentLine()
  )

  if (event.key === 'ArrowDown') {
    if (currentIndex < lines.length - 1) {
      selectionManager.selectLine(lines[currentIndex + 1].id)
    }
  } else if (event.key === 'ArrowUp') {
    if (currentIndex > 0) {
      selectionManager.selectLine(lines[currentIndex - 1].id)
    }
  }
}
```

## Usage Patterns

### Sound Feature

```typescript
class SoundFeature {
  playSound(lineId: string) {
    // Mark as playing
    selectionManager.addHighlight(lineId, 'playing')
    
    // Play audio...
    audio.play()
    
    // Auto-expire when done
    setTimeout(() => {
      selectionManager.removeHighlight(lineId, 'playing')
    }, audio.duration * 1000)
  }
}
```

### Search Feature

```typescript
class SearchFeature {
  showSearchResults(foundLineIds: string[]) {
    for (const lineId of foundLineIds) {
      selectionManager.addHighlight(lineId, 'search:found')
    }
  }

  setCurrentResult(lineId: string) {
    // Switch current highlight
    selectionManager.removeHighlight(lineId, 'search:found')
    selectionManager.addHighlight(lineId, 'search:current')
    
    // Select line
    selectionManager.selectLine(lineId)
  }

  clearSearchResults() {
    const lines = appStore.getLines()
    for (const line of lines) {
      selectionManager.removeHighlight(line.id, 'search:found')
      selectionManager.removeHighlight(line.id, 'search:current')
    }
  }
}
```

### Validation Feature

```typescript
class ValidationFeature {
  validateScript() {
    const lines = appStore.getLines()
    
    for (const line of lines) {
      if (this.hasWarning(line)) {
        selectionManager.addHighlight(line.id, 'validation:warning', {
          message: this.getWarningMessage(line)
        })
      }
      
      if (this.hasError(line)) {
        selectionManager.addHighlight(line.id, 'validation:error', {
          message: this.getErrorMessage(line)
        })
      }
    }
  }
}
```

## Performance

- Highlight lookup: O(1) per line
- Add/remove highlight: O(n) where n = highlights per line (typically small)
- Selection change: O(n) for history management
- UI update: Only affected lines re-render

## Future Enhancements

1. **Highlight Expiry**: Auto-remove highlights after time
2. **Highlight Groups**: Batch operations
3. **Selection Regions**: Select range of lines
4. **Multi-document**: Support multiple documents open
5. **Collaborative**: Highlight colors per user
