# UIArchitecture - Vue 3 Component System

## Overview

ScriptFollower 3 uses Vue 3 Composition API with TypeScript for a modular, type-safe UI. Components use `provide/inject` to access managers without prop drilling. The UI is designed to be fully functional as a **Progressive Web App (PWA)**.

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
    │   ├── CharacterColors (List + Pickers)
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
- Includes PWA support via `vite-plugin-pwa` for offline reliability and OS installation.

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
- Custom character background colors (managed via `appStore.state.characterColors`)
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
- Dynamic line highlighting based on document position
- **Nearest Visible Navigation**: Automatically scrolls to the nearest visible line if the current selection is a hidden type.
- Progress bar feature indicating current document position
- Dynamically renders line components using `featureManager.getLineRenderer(lineType, 'sidebar')`
- Passes `context-sidebar` class for context-specific styling
- Uses `useStickyScroll` composable for smooth scrolling to active line
- Click to select

```typescript
const visibleLines = computed(() => { /* ... filtering logic ... */ });
const sidebarProgressBarFeature = featureManager.getFeature('sidebar-progress-bar-feature') as SidebarProgressBarFeature;

// activeSidebarLineId is calculated by LineSelectionManager.getSidebarActiveLine
// which ensures navigation always lands on a visible element.
const activeSidebarLineId = sidebarProgressBarFeature.activeSidebarLineId;

const getLineComponent = (lineType: LineType): Component => {
  return featureManager.getLineRenderer(lineType, 'sidebar') || DefaultLineComponent
}

const { setLineRef } = useStickyScroll({
  viewerRef: sidebarContentRef,
  lines: visibleLines,
  currentLineId: activeSidebarLineId,
  scrollOffsetPx
});
```

### RightPanel.vue

Right-hand panel acting as a tabbed container for document information and line data.
- Manages `activeTab` state.
- Conditionally renders `DocumentInfoPanel` or `LineDataPanel`.
- Contains the `collapse-button` to toggle its collapsed state via `appStore`.

### DocumentInfoPanel.vue

Displays detailed information about the currently loaded document.
- **Character Color Management**: Lists unique dialogue sub-types alphabetically with dedicated color pickers.
- **Collapsible Styles**: Hierarchical view of document styles using `StyleTreeItem`, now with a collapsible header.
- Displays document metadata and statistics.

```typescript
const dialogueSubTypes = computed(() => {
  // Extracts unique character names from LineType.DIALOGUE lines
});

const isStylesCollapsed = ref(AppConfig.ui.documentInfo.defaultStylesCollapsed);
```

### LineDataPanel.vue

Displays detailed information about the currently selected script line.
- Receives `currentLine` as a prop.
- Displays line details (ID, line number, type, text, metadata, page number).
- Includes functionality to pretty-print XML content from metadata.

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

## State Management with AppStore

```typescript
// Includes reactive state for:
// - Document data
// - Selection/Highlights
// - Virtual mixing channels
// - Character-specific background colors
```

## Styling System

### CSS Variables for Theming
Managed in `src/css/theme.css`, supporting global color schemes and PWA `theme-color`.

### Component Styles
Scoped styles for components are managed in dedicated `.css` files in `src/css/`.

## PWA and Offline Support
- **Service Worker**: Configured via `vite.config.ts` for automatic updates.
- **Manifest**: Includes high-resolution icons (192x192, 512x512) for OS installation.
- **Caching**: Workbox configuration for offline reliability of script and audio assets.
