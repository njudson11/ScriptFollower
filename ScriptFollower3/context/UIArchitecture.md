# UIArchitecture - Vue 3 Component System

## Overview

ScriptFollower 3 uses Vue 3 Composition API with TypeScript for a modular, type-safe UI. Components use `provide/inject` to access managers without prop drilling.

## Component Hierarchy

```
App.vue (Root)
├── Toolbar
├── DocumentViewer
│   └── ScriptLine (repeating)
│       └── LineHighlights
├── Sidebar
│   └── LineItem (repeating)
└── RightPanel
    ├── TabHeader
    │   └── CollapseButton
    ├── DocumentInfoPanel
    │   └── StyleTreeItem (recursive)
    └── LineDataPanel
```

## Core Components

### App.vue

Root component that:
- Initializes all managers (EventBus, AppStore, LineSelectionManager, ActionController, FeatureManager)
- Provides managers to child components
- Handles document upload
- Manages error state
- Registers Feature Plugins
- Controls global layout, including dynamic adjustment of `RightPanel`'s column width when collapsed.

```typescript
const eventBus = new EventBus()
const appStore = new AppStore(eventBus) // Instantiate AppStore first
const selectionManager = new LineSelectionManager(eventBus, appStore) // Pass appStore to LineSelectionManager
const actionController = new ActionController(eventBus) // Instantiate ActionController
const featureManager = new FeatureManager(eventBus, actionController) // Pass ActionController to FeatureManager

// Provide managers to child components
provide('eventBus', eventBus)
provide('selectionManager', selectionManager)
provide('featureManager', featureManager)
provide('appStore', appStore)
provide('actionController', actionController) // Provide ActionController

const gridTemplateColumns = computed(() => {
  const rightPanelWidth = appStore.state.isRightPanelCollapsed ? '40px' : '350px';
  return `200px 1fr ${rightPanelWidth}`;
});
```

### Toolbar.vue

Header with:
- App title
- Current document name
- Editable page number display for the currently selected line
- File upload button

```typescript
const appStore = inject('appStore') as AppStore
const selectionManager = inject('selectionManager') as LineSelectionManager

const currentDocument = computed(() => appStore.getCurrentDocument())
const currentLine = computed(() => appStore.getLineById(selectionManager.getCurrentLine()));

const editablePageNumber = ref<number | null>(currentLine.value?.pageNumber ?? null);
watch(() => currentLine.value?.pageNumber, (newPageNumber) => {
  editablePageNumber.value = newPageNumber ?? null;
});

const handlePageNumberChange = () => { /* ... navigation logic ... */ };
```

### DocumentViewer.vue

Central content area displaying:
- All script lines with full text
- Color-coded line types
- Hover effects
- Line highlighting
- Keyboard navigation
- Dynamically renders line components using `featureManager.getLineRenderer(lineType, 'default')`
- Passes `context-document-viewer` class for context-specific styling
- Uses `useStickyScroll` composable for smooth scrolling to active line

```typescript
const lines = computed(() => appStore.getLines())
const currentLineId = computed(() => selectionManager.getCurrentLine())

// Dynamically get line component based on LineType and 'default' view
const getLineComponent = (lineType: LineType): Component => {
  return featureManager.getLineRenderer(lineType, 'default') || DefaultLineComponent
}

const { setLineRef } = useStickyScroll({ /* ... */ });
```

### Sidebar.vue

Left panel listing:
- All visible script lines
- Line type badge
- Line preview text
- Dynamic line highlighting based on document position (calculated by LineSelectionManager)
- Progress bar feature indicating current document position
- Dynamically renders line components using `featureManager.getLineRenderer(lineType, 'sidebar')`
- Passes `context-sidebar` class for context-specific styling
- Uses `useStickyScroll` composable for smooth scrolling to active line
- Click to select

```typescript
const visibleLines = computed(() => { /* ... filtering logic ... */ });
const sidebarProgressBarFeature = featureManager.getFeature('sidebar-progress-bar-feature') as SidebarProgressBarFeature;

const getLineComponent = (lineType: LineType): Component => {
  return featureManager.getLineRenderer(lineType, 'sidebar') || DefaultLineComponent
}

const { setLineRef } = useStickyScroll({ /* ... */ });
```

### RightPanel.vue

Right-hand panel acting as a tabbed container for document information and line data.
- Manages `activeTab` state.
- Conditionally renders `DocumentInfoPanel` or `LineDataPanel`.
- Contains the `collapse-button` to toggle its collapsed state via `appStore`.

```typescript
const currentDocument = computed(() => appStore.getCurrentDocument())
const currentLine = computed(() => appStore.getLineById(selectionManager.getCurrentLine()))
const activeTab = ref<'documentInfo' | 'lineData'>('documentInfo');
// ... tab switching logic
```

### DocumentInfoPanel.vue (New)

Displays detailed information about the currently loaded document.
- Receives `currentDocument` as a prop.
- Displays document metadata, statistics, and a hierarchical view of document styles using `StyleTreeItem`.

```typescript
interface DocumentInfoPanelProps {
  currentDocument: Document | null
}
const props = defineProps<DocumentInfoPanelProps>()

const styleTree = computed(() => { /* ... tree building logic ... */ });
```

### LineDataPanel.vue (New)

Displays detailed information about the currently selected script line.
- Receives `currentLine` as a prop.
- Displays line details (ID, line number, type, text, metadata, page number).
- Includes functionality to pretty-print XML content from metadata.

```typescript
interface LineDataPanelProps {
  currentLine: ScriptLineBase | undefined
  onClearSelection: () => void
}
const props = defineProps<LineDataPanelProps>()

const prettyPrintXml = (xmlString: string): string => { /* ... */ };
```

### StyleTreeItem.vue (New)

A recursive component for rendering a single node in the document styles tree.
- Receives `styleInfo` and `level` props.
- Displays the style's name and parent (if any).
- Recursively renders child `StyleTreeItem` components for nested styles.

```typescript
interface StyleTreeItemProps {
  styleInfo: StyleInfo & { children?: StyleInfo[] }
  level: number
}
const props = defineProps<StyleTreeItemProps>()
```

## Dependency Injection Pattern

### Provide (in App.vue)

```typescript
provide('eventBus', eventBus)
provide('selectionManager', selectionManager)
provide('featureManager', featureManager)
provide('appStore', appStore)
provide('actionController', actionController)
```

### Inject (in child components)

```typescript
const appStore = inject('appStore') as AppStore
const selectionManager = inject('selectionManager') as LineSelectionManager
const eventBus = inject('eventBus') as EventBus
```

Benefits:
- No prop drilling
- Type-safe with TypeScript
- Decouples component hierarchy from data flow
- All components access same instances

## State Management with AppStore

```typescript
// Computed properties auto-update
const appState = ref(appStore.getState())

onMounted(() => {
  appStore.subscribe(newState => {
    appState.value = newState
  })
})
```

## Reactivity Patterns

### Line Selection

```typescript
const currentLineId = computed(() => selectionManager.getCurrentLine())

watch(currentLineId, (newId) => {
  if (newId) {
    // Update UI when selection changes
  }
})
```

### Document Changes

```typescript
const document = computed(() => appStore.getCurrentDocument())

watch(document, (newDoc) => {
  if (newDoc) {
    // Refresh UI with new document
  }
})
```

### Event Subscription

```typescript
onMounted(() => {
  const unsubscribe = eventBus.subscribe(
    EVENT_TYPES.LINE_SELECTED,
    (event) => {
      // Update component based on event
    }
  )

  onBeforeUnmount(() => {
    unsubscribe()
  })
})
```

## Styling System

### CSS Variables for Theming

```css
:root {
  --primary-color: #2196f3;
  --secondary-color: #f5f5f5;
  --text-color: #333;
  --border-color: #e0e0e0;
  --highlight-color: #e3f2fd;
}
```

### Component Styles via External CSS Files

Scoped styles for components are now managed in dedicated `.css` files located in the `src/css/` directory. These files are imported into the Vue component's `<style scoped>` block.

Example (`DocumentViewer.vue`):
```vue
<style scoped>
@import '../css/DocumentViewer.css';
</style>
```

Benefits:
- Clear separation of concerns (HTML, JS, CSS)
- Easier to manage and update styles
- Improved maintainability for large projects
- Leverages Vite's CSS processing capabilities

## Accessibility Features

### Keyboard Navigation

```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    // Move to next
  } else if (event.key === 'Enter') {
    // Activate
  }
}
```

### ARIA Labels

```html
<div class="line-item" role="button" tabindex="0" 
     aria-label="Line 5 - DIALOGUE">
  {{ line.text }}
</div>
```

### Focus Management

```typescript
const itemRef = ref<HTMLDivElement>()

const focusLine = (lineId: string) => {
  itemRef.value?.focus()
}
```

## Component Communication

### Child to Parent

```typescript
// Child emits event
const emit = defineEmits<{
  lineSelected: [lineId: string]
}>()

emit('lineSelected', lineId)

// Parent listens
<Sidebar @line-selected="handleLineSelected" />
```

### Sibling Communication

```typescript
// Via EventBus
eventBus.emit({
  type: EVENT_TYPES.LINE_SELECTED,
  payload: { lineId },
  timestamp: new Date()
})

// Other component subscribes
eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, (event) => {
  // React to event
})
```

### Parent to Child

```typescript
// Via props
<DocumentViewer :document="document" />

// Via provide/inject (preferred for shared managers)
provide('appStore', appStore)
const appStore = inject('appStore')
```

## Feature-Provided UI Elements

Features can provide UI elements in two primary ways:

1.  **Custom Line Renderers (Views):** Features can register specific Vue components (`Component`) for rendering particular `LineType`s, customized for different UI contexts (e.g., 'default' view for `DocumentViewer`, 'sidebar' view for `Sidebar`). The `FeatureManager` handles resolution, falling back to 'default' if a specific view is not found.
    ```typescript
    // In a feature's init() method
    this.featureManager.registerLineRenderer(LineType.DIALOGUE, DialogueLine, 'default')
    this.featureManager.registerLineRenderer(LineType.DIALOGUE, CompactDialogueLine, 'sidebar')
    ```
    UI components consume this via:
    ```typescript
    // In DocumentViewer.vue or Sidebar.vue
    const getLineComponent = (lineType: LineType): Component => {
      return featureManager.getLineRenderer(lineType, 'view-name') || DefaultLineComponent
    }
    ```

2.  **Exposing Reactive Data/Computed Properties for Core UI Components:** Features can expose reactive state or computed properties that core UI components (like `Sidebar.vue`) can inject and use to render UI elements (e.g., a progress bar). This allows features to control parts of the UI without directly rendering components into slots or modifying core component templates.
    ```typescript
    // In a feature class (e.g., SidebarProgressBarFeature)
    import { computed } from 'vue'
    // ...
    public progressPercentage = computed<number>(() => { /* calculation */ });
    // ...
    
    // In a core UI component (e.g., Sidebar.vue)
    const sidebarProgressBarFeature = featureManager.getFeature('sidebar-progress-bar-feature') as SidebarProgressBarFeature
    // ...
    <div v-if="sidebarProgressBarFeature.progressPercentage.value > 0"
         :style="{ width: sidebarProgressBarFeature.progressPercentage.value + '%' }">
    </div>
    ```

## Error Handling

### Error Boundary

```typescript
export class ErrorBoundary extends Vue {
  data() {
    return { hasError: false }
  }

  onErrorCaptured(error: Error) {
    this.hasError = true
    eventBus.emit({
      type: EVENT_TYPES.UI_ERROR,
      payload: { error: error.message },
      timestamp: new Date()
    })
    return false
  }
}
```

### Component Error States

```typescript
const error = ref<string | null>(null)

try {
  await loadDocument(file)
} catch (err) {
  error.value = err instanceof Error ? err.message : 'Unknown error'
}
```

## Performance Optimization

### Virtual Scrolling (for large scripts)

```typescript
// For scripts with 1000+ lines
import { useVirtualizer } from '@tanstack/vue-virtual'

const virtualizer = useVirtualizer({
  count: lines.value.length,
  getScrollElement: () => scrollRef.value,
  estimateSize: () => 50
})
```

### Lazy Loading Features

```typescript
const featurePanels = ref<any[]>([])

const loadFeaturePanel = async (featureId: string) => {
  const feature = featureManager.getFeature(featureId)
  if (feature?.getUIComponents) {
    featurePanels.value.push(...feature.getUIComponents())
  }
}
```

### Computed Caching

```typescript
// Vue automatically caches computed results
const visibleLines = computed(() => {
  return lines.value.filter(line => line.lineType !== LineType.BLANK)
})
```

## Testing Components

```typescript
import { mount } from '@vue/test-utils'
import DocumentViewer from '@/components/DocumentViewer.vue'

describe('DocumentViewer', () => {
  it('renders lines', () => {
    const wrapper = mount(DocumentViewer, {
      global: {
        provide: {
          appStore: mockAppStore,
          selectionManager: mockSelectionManager
        }
      }
    })

    expect(wrapper.find('.script-line').exists()).toBe(true)
  })

  it('handles line selection', async () => {
    const wrapper = mount(DocumentViewer, { /* ... */ })
    await wrapper.find('.script-line').trigger('click')
    expect(mockSelectionManager.selectLine).toHaveBeenCalled()
  })
})
```

## Responsive Design

### Mobile Breakpoints

```css
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    position: absolute;
    left: -100%;
  }

  .main-content {
    flex-direction: column;
  }
}
```

### Adaptive UI

```typescript
const isMobile = ref(window.innerWidth < 768)

onMounted(() => {
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
  })
})
```

## Future Enhancements

1. **Dark Mode**: CSS variables + preference detection
2. **Custom Themes**: User-defined color schemes
3. **Tabs**: Multiple documents open simultaneously
4. **Split View**: Compare versions side-by-side
5. **Export UI**: PDF, print, document export
