# ScriptFollower 3 - Core Architecture

## Overview

ScriptFollower 3 uses a **modular plugin architecture** where features are completely decoupled from the core system. The architecture enables adding new features with minimal changes to existing code.

## Architectural Layers

```
┌─────────────────────────────────────────────────────┐
│          UI Components (Vue 3)                       │
│  Toolbar, Sidebar, DocumentViewer, RightPanels     │
└────────────────────┬────────────────────────────────┘
                     │ provide/inject
┌────────────────────▼────────────────────────────────┐
│          State Management (AppStore)                │
│  Document, Selection, Feature Data                 │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│      Core Managers                                  │
│  - EventBus: Cross-feature communication           │
│  - ActionController: Centralized action dispatching│
│  - LineSelectionManager: Line selection & focus (depends on AppStore)    │
│  - FeatureManager: Plugin registration             │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│      Feature Plugins (IFeaturePlugin)              │
│  - DialogueRenderingFeature                        │
│  - KeybindingFeature                               │
│  - NavigationFeature                               │
│  - SidebarProgressBarFeature                       │
│  - (Other Features like Sound, Lights, Search, etc.)
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│      Core Data                                      │
│  - ScriptLineBase (immutable)                       │
│  - Document                                        │
│  - LineType enums (stage play specific)            │
└─────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Separation of Concerns
- **UI Layer**: Presentation only, delegates all logic to managers
- **State Layer**: AppStore manages reactive state
- **Manager Layer**: Business logic for selections, events, and features
- **Feature Layer**: Plugin-based, self-contained features
- **Data Layer**: Immutable core data structures

### 2. Plugin Architecture
Features declare what they need via interfaces:
- `IFeaturePlugin`: Plugin lifecycle and capabilities
- `IKeybinding[]`: Keyboard shortcuts with context awareness
- `IAnnotation[]`: Per-line configuration syntax
- `IHighlightType`: Custom visual highlight types

Adding a new feature requires:
1. Implement `IFeaturePlugin`
2. Register with FeatureManager
3. No core code changes needed

### 3. Event-Driven Communication
- EventBus enables loose coupling between features
- Features publish/subscribe to events
- No direct feature-to-feature dependencies
- System events: document, selection, feature lifecycle

### 4. Immutable Data
- ScriptLineBase is readonly
- All modifications create new Document objects
- Enables time-travel debugging and undo/redo

### 5. Type Safety
- Full TypeScript implementation
- Strict interfaces for all extension points
- Compile-time validation of feature implementations

## File Structure

```
ScriptFollower3/
├── context/                    # Architecture documentation
│   ├── CoreArchitecture.md
│   ├── ScriptLineBaseDataModel.md
│   ├── FeaturePluginSystem.md
│   ├── SoundFeature.md
│   ├── EventSystem.md
│   ├── ImplementationRoadmap.md
│   ├── DocumentProcessorArchitecture.md
│   ├── UIArchitecture.md
│   ├── UIPanelsDetail.md
│   ├── ConfigurableKeybindings.md
│   ├── FeatureAnnotations.md
│   ├── LineSelectionAndFocus.md
│   ├── ErrorHandling.md
│   └── ARCHITECTURE_REVIEW.md
│
└── ScriptFollower3/            # Vue 3 + Vite application
    ├── src/
    │   ├── App.vue
    │   ├── main.ts
    │   ├── types/
    │   │   └── core.ts         # Type definitions
    │   ├── core/
    │   │   ├── EventBus.ts
    │   │   ├── LineSelectionManager.ts
    │   │   ├── FeatureManager.ts
    │   │   └── ActionController.ts
    │   ├── parsers/
    │   │   ├── ODTParser.ts
    │   │   ├── DOCXParser.ts
    │   │   └── PDFParser.ts
    │   ├── store/
    │   │   └── AppStore.ts
    │   ├── components/
    │   │   ├── Toolbar.vue
    │   │   ├── Sidebar.vue
    │   │   ├── DocumentViewer.vue
    │   │   ├── RightPanel.vue
    │   │   ├── DefaultLineComponent.vue
    │   │   ├── DialogueLine.vue
    │   │   ├── LineTypeFilter.vue
    │   │   ├── DocumentInfoPanel.vue
    │   │   ├── LineDataPanel.vue
    │   │   └── StyleTreeItem.vue
    │   ├── features/
    │   │   ├── DialogueRenderingFeature.ts
    │   │   ├── KeybindingFeature.ts
    │   │   ├── NavigationFeature.ts
    │   │   └── SidebarProgressBarFeature.ts
    │   ├── config/
    │   │   └── AppConfig.ts
    │   ├── composables/
    │   │   └── useStickyScroll.ts
    │   └── css/
    │       ├── App.css
    │       ├── DefaultLineComponent.css
    │       ├── DialogueLine.css
    │       ├── DocumentViewer.css
    │       ├── LineTypeFilter.css
    │       ├── LineTypeStyles.css
    │       ├── main.css
    │       ├── RightPanel.css
    │       ├── Sidebar.css
    │       ├── SidebarProgressBarFeature.css
    │       ├── Toolbar.css
    │       ├── DocumentInfoPanel.css
    │       ├── LineDataPanel.css
    │       └── StyleTreeItem.css
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── index.html
```

## Key Concepts

### ScriptLineBase
The immutable core data structure representing a single script line:
```typescript
interface ScriptLineBase {
  readonly id: string
  readonly documentId: string
  readonly lineNumber: number
  readonly lineType: LineType
  readonly text: string
  readonly metadata: Record<string, any>
}
```

### Document
A collection of script lines with metadata:
```typescript
interface Document {
  readonly id: string
  readonly name: string
  readonly format: 'DOCX' | 'ODT' | 'PDF' | 'XML'
  readonly lines: readonly ScriptLineBase[]
  readonly createdAt: Date
  readonly updatedAt: Date
}
```

### Line Types
Stage play specific line classifications:
- `ACT_HEADING`: "ACT ONE" or "ACT TWO"
- `SCENE_HEADING`: "INT. OFFICE - DAY"
- `CHARACTER`: "JOHN"
- `DIALOGUE`: "This is what the character says."
- `STAGE_DIRECTION`: "John enters the room."
- `PARENTHETICAL`: "(nervously)"
- `BLANK`: Empty lines

### EventBus
Central communication hub:
```typescript
class EventBus {
  subscribe(eventType: string, listener: EventListener): () => void
  emit(event: Event): Promise<void>
  clear(): void
}
```

### ActionController
The ActionController acts as a central command bus for dispatching and handling application-wide actions. It decouples the source of an action (e.g., a keybinding, a UI click, a feature) from its handler(s), allowing for flexible and extensible interaction patterns. Features or core modules can register handlers for specific action types, and any part of the application can dispatch actions without needing direct knowledge of who will process them.

### FeaturePlugin Interface
All features implement this interface:
```typescript
interface FeaturePlugin {
  readonly id: string
  readonly name: string
  readonly version: string
  readonly description: string
  init(): Promise<void>
  destroy(): Promise<void>
  getKeybindings?(): KeyBinding[]
  getAnnotations?(): Annotation[]
  registerHighlightTypes?(registry: HighlightTypeRegistry): void
}
```

## Data Flow

### Document Loading
```
User selects .odt file
    ↓
App.vue: handleFileUpload()
    ↓
ODTParser.parseODT()
    ↓
AppStore.new AppStore(eventBus)
    ↓
AppStore.loadDocument()
    ↓
LineSelectionManager.new LineSelectionManager(eventBus, appStore)
    ↓
LineSelectionManager.selectLine() (first line)
    ↓
EventBus.emit(DOCUMENT_LOADED)
    ↓
UI components react to state changes
```

### Line Selection
```
User clicks on line in sidebar
    ↓
Sidebar.vue: handleLineClick()
    ↓
LineSelectionManager.selectLine()
    ↓
EventBus.emit(LINE_SELECTED)
    ↓
DocumentViewer updates UI
    ↓
Features receive event, update their state
```

### Keybinding Trigger (New)
```
User presses a key configured as a keybinding
    ↓
KeybindingFeature detects key combination
    ↓
KeybindingFeature dispatches an Action via ActionController (e.g., NAVIGATE_NEXT_LINE)
    ↓
ActionController routes the Action to registered handlers (e.g., NavigationFeature)
    ↓
NavigationFeature processes the Action and interacts with relevant managers (e.g., LineSelectionManager)
```

### Feature Interaction
```
Feature needs to interact with another
    ↓
Feature publishes event via EventBus
    ↓
Other features subscribe and respond
    ↓
No direct feature-to-feature dependencies
```

## Extension Points

### 1. Add a New Feature
1. Create class implementing `IFeaturePlugin`
2. Register with FeatureManager
3. Declare keybindings, annotations, highlight types
4. Subscribe to relevant events

### 2. Add a New Line Type
1. Add to `LineType` enum in core.ts
2. Update line detection in document parsers
3. Features can reference new line type

### 3. Add a New Document Format
1. Create parser implementing format detection
2. Return array of ScriptLineBase objects
3. Register with DocumentProcessor

### 4. Add a New UI Component
1. Create Vue 3 component
2. Inject managers via provide/inject
3. Subscribe to AppStore and EventBus
4. Components auto-update on state changes

## Design Patterns

### Observer Pattern
EventBus enables pub/sub communication without coupling.

### Singleton Pattern
EventBus, FeatureManager, LineSelectionManager are singletons injected into all components.

### Factory Pattern
DocumentProcessor uses format detection to create appropriate parsers.

### Strategy Pattern
Keybindings use strategy pattern for context-aware execution.

### Decorator Pattern
Annotations decorate lines with feature-specific configuration.

## Success Criteria

✅ Features can be added with zero core changes
✅ No circular dependencies between features
✅ Event-based communication enables decoupling
✅ Type-safe plugin interface
✅ Immutable data enables predictable updates
✅ Full TypeScript support with strict types
