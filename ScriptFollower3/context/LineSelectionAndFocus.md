# Line Selection and Focus Management

## Overview

The Line Selection Manager provides a centralized, modular system for:
- Tracking current line and selected lines
- Managing visual highlights with priority-based conflict resolution
- Supporting selection history with undo/redo
- Enabling features to register custom highlight types

## Core Principles

### Highlight Uniqueness
To prevent UI bugs like "stacking" highlights (where multiple identical highlights are added to a line, making them appear to never fade), the `addHighlight` method enforces uniqueness. It automatically filters out existing highlights of the same type before adding a new one.

### Priority-Based Visibility
A line can have multiple highlights (e.g., 'playing' and 'search:found'), but the UI typically only renders the style of the highest priority highlight.

## IHighlightTypeRegistry

```typescript
interface HighlightTypeRegistry {
  register(type: string, priority: number, style: HighlightStyle): void
  unregister(type: string): void
  get(type: string): HighlightStyle | undefined
  getAll(): Map<string, HighlightStyle>
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
```

## Highlight Structure

```typescript
interface Highlight {
  readonly lineId: string
  readonly type: string           // e.g., 'selected', 'voice:matched'
  readonly priority: number       // Higher = more visible
  readonly data?: Record<string, any>  // Feature-specific data (e.g., match score)
}
```

## LineSelectionManager

```typescript
class LineSelectionManager {
  // Selection
  selectLine(lineId: string | null): void
  toggleLineSelection(lineId: string): void
  getCurrentLine(): string | null
  getSelectedLines(): string[]

  // Highlights
  addHighlight(lineId: string, type: string, data?: any): void
  removeHighlight(lineId: string, type: string): void
  clearHighlights(lineId: string): void
  getHighlights(lineId: string): Highlight[]
  getPrimaryHighlight(lineId: string): Highlight | undefined
  
  // Sidebar Helper
  getSidebarActiveLine(currentLineId: string | null, lineTypeVisibility: any): string | null
}
```

## Feature-Registered Highlight Types

### VoiceRecognitionFeature

Registers highlights for phonetic matches. Note the use of `matchLingerMs` for temporary visual feedback.

```typescript
class VoiceRecognitionFeature implements FeaturePlugin {
  registerHighlightTypes(registry: HighlightTypeRegistry) {
    // High confidence match (Light Green)
    registry.register('voice:matched', 65, {
      backgroundColor: 'rgba(76, 175, 80, 0.15)',
      borderColor: '#4caf50',
      borderWidth: '2px'
    })

    // Partial/Interim match (Light Yellow)
    registry.register('voice:partial', 60, {
      backgroundColor: 'rgba(255, 235, 59, 0.15)',
      borderColor: '#fbc02d',
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
  }
}
```

## Highlight Management

### Temporary Highlights
Features are responsible for their own highlight lifecycle. The standard pattern is to use a `setTimeout` to call `removeHighlight`.

**Voice Pattern:**
```typescript
const timeoutId = setTimeout(() => {
  this.selectionManager.removeHighlight(matchedLineId, 'voice:matched');
  this.highlightTimeouts.delete(matchedLineId);
}, lingerTime);
```

**Highlight Overlapping:**
If a feature adds a new highlight to a line that already has one of the same type, the `LineSelectionManager` will replace the old one. The feature must ensure it clears any existing timeouts to avoid premature removal of the new highlight.

## Events

Selection changes emit events:

```typescript
eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, (event) => {
  const { lineId, oldLineId } = event.payload
  console.log(`Changed from ${oldLineId} to ${lineId}`)
})

eventBus.subscribe(EVENT_TYPES.HIGHLIGHT_ADDED, (event) => {
  const { lineId, highlight } = event.payload
})
```
