# Feature Plugin System

## Overview

The Feature Plugin System is the extensibility foundation of ScriptFollower 3. All features—including core ones like Sound—are implemented as plugins following a standard interface.

## IFeaturePlugin Interface

```typescript
interface FeaturePlugin {
  readonly id: string                           // Unique feature identifier
  readonly name: string                         // Display name
  readonly version: string                      // Semantic versioning
  readonly description: string                  // What this feature does
  
  init(): Promise<void>                         // Initialize feature
  destroy(): Promise<void>                      // Clean up resources
  
  getKeybindings?(): KeyBinding[]               // Declare keyboard shortcuts
  getAnnotations?(): Annotation[]               // Declare per-line config syntax
  registerHighlightTypes?(registry): void       // Register custom highlight types
}
```

## Lifecycle

### Initialization
1. FeatureManager calls `feature.init()`
2. Feature can:
   - Load configuration
   - Initialize state
   - Subscribe to EventBus
   - Register UI components
3. EventBus emits `FEATURE_INITIALIZED`
4. Feature is ready for use

### Active Use
11. Feature subscribes to relevant events
12. Feature responds to user interactions
13. Feature publishes events for other features
14. Features communicate via EventBus (no direct calls)

### Destruction
11. FeatureManager calls `feature.destroy()`
12. Feature should:
   - Unsubscribe from all events
   - Close open resources
   - Clean up state
13. EventBus emits `FEATURE_DESTROYED`
14. Feature is removed from system

## Registration

```typescript
// In App.vue or feature initialization code
const featureManager = new FeatureManager(eventBus, actionController) // actionController is now a dependency

const dialogueRenderingFeature = new DialogueRenderingFeature(featureManager)
await featureManager.registerFeature(dialogueRenderingFeature)

// Feature is now active
```

## Feature Manager

```typescript
class FeatureManager {
  async registerFeature(feature: FeaturePlugin): Promise<void>
  async unregisterFeature(featureId: string): Promise<void>
  getFeature(featureId: string): FeaturePlugin | undefined
  getAllFeatures(): FeaturePlugin[]
  hasFeature(featureId: string): boolean
  
  // New: Register a custom Vue component for rendering a specific line type and view.
  registerLineRenderer(lineType: LineType, component: Component, view: string = 'default'): void
  // New: Get the custom Vue component registered for a specific line type and view, with default fallback.
  getLineRenderer(lineType: LineType, view: string = 'default'): Component | undefined
}
```

### Register a Feature
```typescript
try {
  await featureManager.registerFeature(new MyFeature())
} catch (error) {
  console.error('Feature registration failed:', error)
  // Handle error
}
```

### Unregister a Feature
```typescript
await featureManager.unregisterFeature('my-feature-id')
```

### Get Feature
```typescript
const myFeature = featureManager.getFeature('my-feature')
if (myFeature) {
  // Feature exists
}
```

## Implementing a Feature

### Basic Structure

```typescript
class MyFeature implements FeaturePlugin {
  readonly id = 'my-feature'
  readonly name = 'My Feature'
  readonly version = '1.0.0'
  readonly description = 'Does something useful'

  constructor(
    private eventBus: EventBus,
    private selectionManager: LineSelectionManager,
    private actionController: ActionController // New: ActionController dependency
  ) {}

  async init(): Promise<void> {
    // Subscribe to events
    this.eventBus.subscribe(EVENT_TYPES.DOCUMENT_LOADED, (event) => {
      this.onDocumentLoaded(event)
    })

    console.log(`${this.name} initialized`)
  }

  async destroy(): Promise<void> {
    // Clean up
    console.log(`${this.name} destroyed`)
  }

  private onDocumentLoaded(event: Event) {
    // Handle event
  }
}
```

### Providing Custom Line Renderers (Views)

Features can register specific Vue components to render particular `LineType`s in different UI contexts (views).

```typescript
import { DialogueLine } from '@/components/DialogueLine.vue' // Assuming this is part of the feature
import { CompactDialogueLine } from '@/components/CompactDialogueLine.vue' // A sidebar-specific component

class DialogueRenderingFeature implements FeaturePlugin {
  // ...
  constructor(private featureManager: FeatureManager) {}

  async init(): Promise<void> {
    this.featureManager.registerLineRenderer(LineType.DIALOGUE, DialogueLine, 'default')
    this.featureManager.registerLineRenderer(LineType.DIALOGUE, CompactDialogueLine, 'sidebar')
  }
  // ...
}
```

### Exposing Reactive Data for UI Components

Features can expose reactive data or computed properties that UI components can consume directly. This allows features to control parts of the UI without directly rendering them or using a complex slot system.

```typescript
import { computed } from 'vue'

class SidebarProgressBarFeature implements FeaturePlugin {
  readonly id = 'sidebar-progress-bar-feature'
  // ... other properties and constructor

  public progressPercentage = computed<number>(() => {
    // Complex calculation logic here
    return 50 // example value
  });

  // UI components (e.g., Sidebar.vue) can then inject this feature
  // and access `feature.progressPercentage.value`
}
```

### With Keybindings

```typescript
class MyFeature implements FeaturePlugin {
  // ... other methods

  getKeybindings(): KeyBinding[] {
    return [
      {
        id: 'my-feature-action-1',
        featureId: this.id,
        keys: ['ctrl', 'shift', 'm'],
        modifiers: { ctrl: true, shift: true },
        action: 'doAction1',
        isActive: (context) => context.hasSelection,
        handler: () => this.doAction1()
      }
    ]
  }

  private doAction1() {
    const currentLineId = this.selectionManager.getCurrentLine()
    if (currentLineId) {
      // Do something with current line
    }
  }
}
```

### With Annotations

```typescript
class MyFeature implements FeaturePlugin {
  // ... other methods

  getAnnotations(): Annotation[] {
    return [
      {
        name: 'intensity',
        description: 'Set intensity level (0-100)',
        type: 'number',
        defaultValue: 50,
        constraints: { min: 0, max: 100 },
        parseValue: (val) => parseInt(val),
        validateValue: (val) => val >= 0 && val <= 100
      }
    ]
  }
}
```

### With Custom Highlights

```typescript
class MyFeature implements FeaturePlugin {
  // ... other methods

  registerHighlightTypes(registry: HighlightTypeRegistry) {
    registry.register('myfeature:active', 80, {
      backgroundColor: '#fff59d',
      borderColor: '#fbc02d',
      borderWidth: '2px'
    })

    registry.register('myfeature:error', 75, {
      backgroundColor: '#ffcdd2',
      borderColor: '#e53935',
      borderWidth: '1px'
    })
  }
}
```

## Feature Data Isolation

Each feature maintains its own state:

```typescript
class SoundFeature implements FeaturePlugin {
  private cuesByLineId: Map<string, SoundCue[]> = new Map()

  getCuesForLine(lineId: string): SoundCue[] {
    return this.cuesByLineId.get(lineId) ?? []
  }

  addCueToLine(lineId: string, cue: SoundCue) {
    if (!this.cuesByLineId.has(lineId)) {
      this.cuesByLineId.set(lineId, [])
    }
    this.cuesByLineId.get(lineId)!.push(cue)
  }
}
```

## Inter-Feature Communication

Features **never call each other directly**. They communicate via EventBus:

```typescript
// ❌ BAD - Direct dependency
class FeatureA {
  constructor(private featureB: FeatureB) {}
  
  doSomething() {
    this.featureB.help()  // Tight coupling!
  }
}

// ✅ GOOD - Event-based
class FeatureA {
  constructor(private eventBus: EventBus) {}
  
  doSomething() {
    this.eventBus.emit({
      type: 'featureA:needsHelp',
      payload: { /* data */ },
      timestamp: new Date()
    })
  }
}

class FeatureB {
  constructor(private eventBus: EventBus) {}
  
  async init() {
    this.eventBus.subscribe('featureA:needsHelp', (event) => {
      this.help(event.payload)
    })
  }
}
```

## Error Handling

Features should emit error events:

```typescript
async init(): Promise<void> {
  try {
    await this.loadConfiguration()
  } catch (error) {
    this.eventBus.emit({
      type: EVENT_TYPES.FEATURE_ERROR,
      payload: {
        featureId: this.id,
        error: error instanceof Error ? error.message : String(error)
      },
      timestamp: new Date()
    })
    throw error
  }
}
```

## Feature Discovery

```typescript
class FeatureRegistry {
  private features: Map<string, FeaturePlugin> = new Map()

  register(feature: FeaturePlugin) {
    this.features.set(feature.id, feature)
  }

  getKeybindingsFor(featureId: string): KeyBinding[] {
    const feature = this.features.get(featureId)
    return feature?.getKeybindings?.() ?? []
  }

  getAnnotationsFor(featureId: string): Annotation[] {
    const feature = this.features.get(featureId)
    return feature?.getAnnotations?.() ?? []
  }

  getAllFeatures(): FeaturePlugin[] {
    return Array.from(this.features.values())
  }
}
```

## Built-in Features

### DialogueRenderingFeature
- Provides custom rendering for dialogue lines.
- Registers a 'default' view for dialogue lines.

### KeybindingFeature
- Manages and registers application-wide keyboard shortcuts.

### NavigationFeature
- Provides actions for navigating through document lines.

### SidebarProgressBarFeature
- Adds a visual progress bar above the active line in the sidebar.
- Calculates progress based on document position and sidebar visibility.

### (Other Features like Sound, Lights, Search, etc. can be added here)

## Versioning

Semantic versioning for features:
- **MAJOR**: Breaking API changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes

Example: `1.2.3`

## Plugin Distribution

Features can be:
1. **Built-in**: Included with ScriptFollower
2. **Installed**: NPM package installed separately
3. **Local**: Loaded from project directory
4. **Remote**: Loaded from URL at runtime

## Feature Capabilities

| Capability | Method | Purpose |
|------------|--------|---------|
| Keybindings | `getKeybindings()` | Declare keyboard shortcuts |
| Annotations | `getAnnotations()` | Per-line configuration |
| Highlights | `registerHighlightTypes()` | Custom visual types |
| UI           | `registerLineRenderer()` / Expose reactive data | Custom line rendering / Provide data for UI elements |
| Events | `eventBus.subscribe()` | Cross-feature communication |
| Data | Feature stores privately | Feature-specific state |

## Testing Features

```typescript
describe('MyFeature', () => {
  let feature: MyFeature
  let eventBus: EventBus
  let selectionManager: LineSelectionManager
  let actionController: ActionController // New: ActionController dependency

  beforeEach(() => {
    eventBus = new EventBus()
    selectionManager = new LineSelectionManager(eventBus)
    actionController = new ActionController(eventBus) // New: ActionController instantiation
    feature = new MyFeature(eventBus, selectionManager, actionController) // New: Pass actionController
  })

  it('should initialize', async () => {
    await feature.init()
    expect(feature.id).toBe('my-feature')
  })

  it('should respond to events', async () => {
    await feature.init()
    const handler = vi.fn()
    eventBus.subscribe(EVENT_TYPES.DOCUMENT_LOADED, handler)
    // Trigger event...
    expect(handler).toHaveBeenCalled()
  })

  it('should declare keybindings', () => {
    const bindings = feature.getKeybindings?.() ?? []
    expect(bindings.length).toBeGreaterThan(0)
  })

  it('should clean up on destroy', async () => {
    await feature.init()
    await feature.destroy()
    // Verify cleanup
  })
})
```

## Feature Initialization Sequence

1. FeatureManager creates feature instance
2. Feature constructor called (dependency injection)
3. `feature.init()` called
4. Feature subscribes to EventBus
5. Feature declares keybindings/annotations
6. Feature registers highlight types
7. EventBus emits `FEATURE_INITIALIZED`
8. Other features can now interact with this feature (via events)

## Circular Dependency Prevention

Features cannot:
- Import other features
- Call methods on other features directly
- Store references to other features

Features can:
- Subscribe to events from other features
- Read public EventBus events
- Respond to event-based requests
