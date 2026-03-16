# UIArchitecture - Vue 3 Component System

## Overview

ScriptFollower 3 uses Vue 3 Composition API with TypeScript for a modular, type-safe UI. Components use `provide/inject` to access managers without prop drilling. The UI is designed to be fully functional as a **Progressive Web App (PWA)**.

## Component Hierarchy

```
App.vue (Root)
├── Toolbar
├── DocumentViewer
│   └── ScriptLine (repeating)
│       ├── LineWidgetContainer
│       │   └── Modular Widgets (Toggle, Button, Timer, etc.)
│       └── LineHighlights
├── Sidebar
│   └── LineItem (repeating)
│       └── LineWidgetContainer
└── RightPanel
    ├── TabHeader
    │   └── CollapseButton
    ├── TabContent
    │   ├── ActionPanel (Contextual)
    │   ├── MasterAudioPanel
    │   ├── LineDataPanel
    │   └── DocumentInfoPanel
    └── LineDataPanel
```

## Styling System

### CSS Variable Architecture
The application uses a two-tier CSS variable system defined in `src/css/theme.css`:
1.  **Base Palette (Primitives)**: Hex values for colors (e.g., `--palette-blue-500`).
2.  **Semantic Mappings**: Functional aliases (e.g., `--color-primary: var(--palette-blue-500)`).

### Decoupled Styles
To maintain a clean codebase and support global theming:
- **No in-component CSS**: All `<style>` blocks in `.vue` files must only contain `@import` statements pointing to dedicated `.css` files in `src/css/`.
- **Logic-Based Grouping**: Styles are consolidated into shared files:
    - `Buttons.css`: Global application buttons and variants.
    - `Widgets.css`: Script-line interaction components and containers.
    - `theme.css`: Core design system and variables.
- **Variable-only colors**: No literal hex/rgb values are permitted in component-specific CSS files; they must use semantic variables from `theme.css`.

## Core Components

### App.vue
Root component that initializes all managers and provides them to the tree. It manages the high-level grid layout, PWA lifecycle, and **Global Drag and Drop** for project loading.

### DocumentViewer.vue
The central script area. Standardizes line rendering with a vertical stack: content on top, custom controls (like Trigger buttons) in the middle, and annotations at the bottom.

### RightPanel.vue
Context-sensitive sidebar that manages several diagnostic and control tabs.
- **Action Tab (New)**: Displays contextual controls for the currently selected line.
    - If a sound cue is selected, it shows the full `SoundCuePanel`.
    - If a dialogue or stage direction with actions is selected, it shows the `BaseCuePanel`.
- **Master Audio Tab**: Global mixing desk and hardware routing.
- **Line Data Tab**: Raw metadata and XML debugging.
- **Doc Info Tab**: Global project settings and character colour mapping.

**Contextual Switching Logic**:
- When a line is selected, the panel automatically switches to the **Action** tab if the line has registered contextual actions.
- If no line is selected, it defaults to **Doc Info** (if a script is loaded) or **Master Audio**.

## Global Interactions

### 1. Action Controller
The central hub for user intent. Components dispatch actions (e.g., `LOAD_DOCUMENT`, `TRIGGER_LINE_ACTION`), and features register handlers to process them.

### 2. Drag and Drop
The application supports global drag-and-drop for streamlined project loading:
- **Global Drop Zone**: The entire `App.vue` container acts as a drop target.
- **Smart Logic**: Handles dropped folders and multiple files (e.g., `.odt` scripts and associated sound directories).
- **Visual Feedback**: A blurred overlay with an upload icon appears when files are dragged over the window.

## State Management with AppStore

The `AppStore` holds the reactive state for the entire UI, including:
- **Highlight Customization**: `highlightColours` state for user-defined UI elements.
- **Character Mapping**: `characterColours` for dialogue line differentiation.
- **Virtual Mixing**: State for the Master Audio Panel and virtual channels.

## PWA and Offline Support
- **Service Worker**: Configured via `vite-plugin-pwa`.
- **Caching**: Offline reliability for script and audio assets.
