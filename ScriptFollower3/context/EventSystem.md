# Event System Architecture

## Overview

The Event System is built on an **EventBus** that enables loose coupling between all components and features. It's the primary communication mechanism in ScriptFollower 3.

## EventBus Design

```typescript
export class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map()

  subscribe(eventType: string, listener: EventListener): () => void
  async emit(event: Event): Promise<void>
  clear(): void
  listenerCount(eventType: string): number
}
```

### Key Features
- **Type-safe**: Event types are string constants
- **Unsubscribe**: Returns unsubscribe function
- **Async-ready**: Supports async event handlers
- **Memory safe**: Listeners can unsubscribe cleanly

## Event Types

```typescript
export const EVENT_TYPES = {
  // Document events
  DOCUMENT_LOADED: 'document:loaded',
  DOCUMENT_UNLOADED: 'document:unloaded',
  DOCUMENT_ERROR: 'document:error',
  SOUNDS_LOADED: 'sounds:loaded',

  // Selection events
  LINE_SELECTED: 'selection:lineSelected',
  SELECTION_CHANGED: 'selection:changed',
  HIGHLIGHT_ADDED: 'highlight:added',
  HIGHLIGHT_REMOVED: 'highlight:removed',

  // Feature events
  FEATURE_INITIALIZED: 'feature:initialized',
  FEATURE_DESTROYED: 'feature:destroyed',
  FEATURE_ERROR: 'feature:error',

  // UI events
  UI_READY: 'ui:ready',
  UI_ERROR: 'ui:error',

  // Keybinding events
  KEYBINDING_TRIGGERED: 'keybinding:triggered',
  KEYBINDING_CONFLICT: 'keybinding:conflict',

  // Annotation events
  ANNOTATION_PARSED: 'annotation:parsed',
  ANNOTATION_ERROR: 'annotation:error'
} as const
```

## Event Structure

```typescript
interface Event {
  type: string              // Event type (from EVENT_TYPES)
  payload?: any            // Event-specific data
  timestamp: Date          // When event was emitted
}
```

## Document Events

### DOCUMENT_LOADED
Emitted when document successfully loads.

```typescript
{
  type: EVENT_TYPES.DOCUMENT_LOADED,
  payload: {
    documentId: string,
    documentName: string,
    lineCount: number,
    format: 'DOCX' | 'ODT' | 'PDF' | 'XML'
  },
  timestamp: new Date()
}
```

**Subscribers**: Features that need to initialize when document loads

### SOUNDS_LOADED
Emitted when sound files have been processed and associated with lines.

```typescript
{
  type: EVENT_TYPES.SOUNDS_LOADED,
  payload: {}, // Payload is empty, features should get data from AppStore
  timestamp: new Date()
}
```

**Subscribers**: `SoundFeature` to trigger preloading logic.

### DOCUMENT_UNLOADED
Emitted when current document is unloaded.

```typescript
{
  type: EVENT_TYPES.DOCUMENT_UNLOADED,
  payload: {
    documentId: string
  },
  timestamp: new Date()
}
```

**Subscribers**: Features that need cleanup

### DOCUMENT_ERROR
Emitted when document loading/processing fails.

```typescript
{
  type: EVENT_TYPES.DOCUMENT_ERROR,
  payload: {
    error: string,
    documentName: string
  },
  timestamp: new Date()
}
```

**Subscribers**: Error handling UI components

## Selection Events

### LINE_SELECTED
Emitted when a line becomes the current selection.

```typescript
{
  type: EVENT_TYPES.LINE_SELECTED,
  payload: {
    lineId: string,
    oldLineId: string | null
  },
  timestamp: new Date()
}
```

**Subscribers**: All UI and features that need current line context

### SELECTION_CHANGED
Emitted when selection set changes (multi-select).

```typescript
{
  type: EVENT_TYPES.SELECTION_CHANGED,
  payload: {
    selectedLineIds: string[]
  },
  timestamp: new Date()
}
```

**Subscribers**: Bulk operation features

### HIGHLIGHT_ADDED
Emitted when a highlight is applied to a line.

```typescript
{
  type: EVENT_TYPES.HIGHLIGHT_ADDED,
  payload: {
    lineId: string,
    highlight: {
      type: string,
      priority: number,
      data?: Record<string, any>
    }
  },
  timestamp: new Date()
}
```

**Subscribers**: DocumentViewer updates display

### HIGHLIGHT_REMOVED
Emitted when a highlight is removed.

```typescript
{
  type: EVENT_TYPES.HIGHLIGHT_REMOVED,
  payload: {
    lineId: string,
    type: string
  },
  timestamp: new Date()
}
```

**Subscribers**: UI refresh

## Feature Events

### FEATURE_INITIALIZED
Emitted when feature successfully initializes.

```typescript
{
  type: EVENT_TYPES.FEATURE_INITIALIZED,
  payload: {
    featureId: string,
    featureName: string
  },
  timestamp: new Date()
}
```

**Subscribers**: Logging, UI status updates

### FEATURE_DESTROYED
Emitted when feature is unregistered.

```typescript
{
  type: EVENT_TYPES.FEATURE_DESTROYED,
  payload: {
    featureId: string
  },
  timestamp: new Date()
}
```

**Subscribers**: Cleanup operations

### FEATURE_ERROR
Emitted when feature encounters error.

```typescript
{
  type: EVENT_TYPES.FEATURE_ERROR,
  payload: {
    featureId: string,
    error: string
  },
  timestamp: new Date()
}
```

**Subscribers**: Error handlers, logging

## UI Events

### UI_READY
Emitted when all UI components are mounted and ready.

```typescript
{
  type: EVENT_TYPES.UI_READY,
  payload: {},
  timestamp: new Date()
}
```

**Subscribers**: Features that defer initialization until UI is ready

### UI_ERROR
Emitted when UI component encounters rendering error.

```typescript
{
  type: EVENT_TYPES.UI_ERROR,
  payload: {
  componentName: string,
    error: string
  },
  timestamp: new Date()
}
```

**Subscribers**: Error boundaries

## Keybinding Events

### KEYBINDING_TRIGGERED
Emitted when a keybinding action executes.

```typescript
{
  type: EVENT_TYPES.KEYBINDING_TRIGGERED,
  payload: {
    keybindingId: string,
    featureId: string,
    action: string,
    context: Record<string, any>
  },
  timestamp: new Date()
}
```

**Subscribers**: Audit logging, analytics

### KEYBINDING_CONFLICT
Emitted when multiple keybindings match same input.

```typescript
{
  type: EVENT_TYPES.KEYBINDING_CONFLICT,
  payload: {
    keys: string[],
    conflictingBindings: Array<{
      featureId: string,
      action: string,
      priority: number
    }>
  },
  timestamp: new Date()
}
```

**Subscribers**: Resolution strategy, logging

## Annotation Events

### ANNOTATION_PARSED
Emitted when annotation is successfully parsed.

```typescript
{
  type: EVENT_TYPES.ANNOTATION_PARSED,
  payload: {
    lineId: string,
    annotationName: string,
    value: any
  },
  timestamp: new Date()
}
```

**Subscribers**: Features that use annotations

### ANNOTATION_ERROR
Emitted when annotation parsing fails.

```typescript
{
  type: EVENT_TYPES.ANNOTATION_ERROR,
  payload: {
    lineId: string,
    annotationText: string,
    error: string
  },
  timestamp: new Date()
}
```

**Subscribers**: Error handlers

## Usage Patterns

### Subscribe to Events

```typescript
const unsubscribe = eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, (event) => {
  const { lineId } = event.payload
  console.log(`Line selected: ${lineId}`)
})

// Unsubscribe later
unsubscribe()
```

### Emit Events

```typescript
await eventBus.emit({
  type: EVENT_TYPES.DOCUMENT_LOADED,
  payload: {
    documentId: doc.id,
    documentName: doc.name,
    lineCount: doc.lines.length,
    format: doc.format
  },
  timestamp: new Date()
})
```

### Subscribe to Multiple Events

```typescript
const handlers = [
  EVENT_TYPES.DOCUMENT_LOADED,
  EVENT_TYPES.DOCUMENT_ERROR
].map(eventType =>
  eventBus.subscribe(eventType, handleDocumentChange)
)

// Unsubscribe all
handlers.forEach(unsubscribe => unsubscribe())
```

### Feature Integration

```typescript
class MyFeature implements FeaturePlugin {
  constructor(private eventBus: EventBus) {}

  async init() {
    // Subscribe to events
    this.eventBus.subscribe(EVENT_TYPES.DOCUMENT_LOADED, (event) => {
      this.onDocumentLoaded(event)
    })
  }

  private onDocumentLoaded(event: Event) {
    const { documentId } = event.payload
    // Initialize feature for document
  }

  async destroy() {
    // EventBus handles cleanup (no manual unsubscribe if using weak refs)
  }
}
```

## Best Practices

### 1. Use Type-Safe Constants
```typescript
// ✅ Good
eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, handler)

// ❌ Bad
eventBus.subscribe('line:selected', handler)
```

### 2. Always Unsubscribe
```typescript
// ✅ Good
const unsubscribe = eventBus.subscribe(type, handler)
// Later...
unsubscribe()

// ❌ Bad - memory leak
eventBus.subscribe(type, handler)
```

### 3. Include Timestamp
```typescript
// ✅ Good
await eventBus.emit({
  type: EVENT_TYPES.LINE_SELECTED,
  payload: { lineId },
  timestamp: new Date()
})

// ❌ Bad
await eventBus.emit({
  type: EVENT_TYPES.LINE_SELECTED,
  payload: { lineId }
})
```

### 4. Use Async Awareness
```typescript
// ✅ Good - waits for all handlers
await eventBus.emit(event)

// ❌ Bad - doesn't wait
eventBus.emit(event)
```

### 5. Avoid Circular Dependencies
```typescript
// ✅ Good - one-way communication
Feature A publishes -> EventBus -> Feature B subscribes

// ❌ Bad - circular
Feature A publishes -> Feature B -> calls Feature A
```

## Performance Considerations

- **Subscriptions**: Map lookup O(1)
- **Emission**: O(n) where n = listener count
- **Memory**: Listeners stored in Set (no duplicates)
- **Unsubscription**: O(1) removal from Set

## Future Enhancements

1. **Event Namespacing**: `feature:sound:play`
2. **Event Filtering**: `subscribe(type, handler, {filter: fn})`
3. **Event Replay**: Recording and playback
4. **Event Timing**: Duration between events
5. **Async Batching**: Group related events
