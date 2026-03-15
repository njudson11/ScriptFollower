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
    │   ├── UIHighlightingColors (Pickers for Active Line / Voice)
    │   └── StyleTreeItem (recursive)
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
- **Variable-only colors**: No literal hex/rgb values are permitted in component-specific CSS files; they must use semantic variables from `theme.css`.

## Core Components

### App.vue
Root component that initializes all managers and provides them to the tree. It manages the high-level grid layout and PWA lifecycle.

### DocumentInfoPanel.vue
The central hub for UI customization and document metadata.
- **Dynamic Theming**: Allows users to customize character dialogue background colors and global highlight colors (Active Line, Voice Match) via color pickers.
- **Store Sync**: Updates to these colors are synchronized through the `AppStore`, which dynamically updates CSS variables on `document.documentElement` for immediate visual feedback.

## Global Interactions

### 1. Action Controller
The central hub for user intent. Components dispatch actions (e.g., `LOAD_DOCUMENT`, `SELECT_LINE`), and features register handlers to process them. This ensures a clean decoupling between UI components and the underlying business logic.

### 2. Drag and Drop
The application supports global drag-and-drop for streamlined project loading:
- **Global Drop Zone**: The entire `App.vue` container acts as a drop target.
- **Recursive Processing**: Handles dropped folders and multiple files using recursive file tree traversal.
- **Smart Logic**: 
    - Dropping a single `.odt` file triggers `LOAD_DOCUMENT`.
    - Dropping a folder or a mix of files triggers `LOAD_SOUNDS`, which attempts to match sounds to the script and can even load an `.odt` found within the folder.
- **Visual Feedback**: A full-screen blurred overlay with an upload icon appears when files are dragged over the window.

## State Management with AppStore

The `AppStore` holds the reactive state for the entire UI, including:
- **Highlight Customization**: `highlightColours` state for user-defined UI elements.
- **Character Mapping**: `characterColours` for dialogue line differentiation.
- **Virtual Mixing**: State for the Master Audio Panel and virtual channels.

## PWA and Offline Support
- **Service Worker**: Configured via `vite-plugin-pwa`.
- **Caching**: Offline reliability for script and audio assets.
