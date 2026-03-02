# Implementation Roadmap

## Phase Overview

```
Phase 1: Core Foundation ✅
Phase 2: Document Processing ✅ (Decoupled Parsing & Post-Processing)
Phase 3: Core Features ✅ (Sound Feature)
Phase 4: Advanced Features ✅ (Mixing Hub)
Phase 5: UI Polish & Testing ✅ (Completed)
Phase 6: Production Ready ✅ (PWA & Core UI)
```

## Phase 1: Core Foundation ✅
- ✅ Vite + Vue 3 + TypeScript project setup
- ✅ Core data model (ScriptLineBase, Document)
- ✅ Central Managers (EventBus, LineSelectionManager, FeatureManager, ActionController, AppStore)
- ✅ Basic UI layout (Toolbar, Sidebar, DocumentViewer, RightPanel)

## Phase 2: Document Processing ✅
- ✅ ODT Parser implementation
- ✅ **Document Post-Processor**: Generic pipeline for all formats
- ✅ **Metadata Extraction**: regex-based rules in AppConfig
- ✅ **Character Propagation**: Forward-fill missing dialogue characters
- ✅ **SubType Sync**: Link characterName to lineSubType automatically
- ✅ Page number extraction and propagation (reverse flow)

## Phase 3: Core Features ✅
- ✅ **Sound Feature**: Full integration with Web Audio API, including annotation-only triggering.
- ✅ **Annotation System**: Key-value parsing for script-based control, including `LineAnnotation.vue` component.
- ✅ **Keybinding Feature**: Global shortcut management, now extended to annotation-only cues.
- ✅ **Dialogue Rendering**: Custom component for script readability

## Phase 4: Advanced Features ✅
- ✅ **Master Audio Panel**: Centralized mixing and monitoring hub
- ✅ **Multi-Context Audio Engine**: Functional hardware output separation
- ✅ **Automatic Channel Management**: Virtual channels generated from script subtypes
- ✅ **Real-Time monitor**: Live active playback list with `soundRef` resolution
- ✅ **Environment Awareness**: Privacy-compliant device discovery and adaptive UI logic
- ✅ **Voice Recognition**: Proximity-weighted phonetic script following with auto-focus support

## Phase 5: UI Polish & Testing ✅
- ✅ **CSS Modernization**: Initial decoupling of component styles to dedicated files.
- ✅ **Theme Consistency**: Application-wide design system and fader styling.
- ✅ **Responsive Design**: Optimization for booth monitors and mobile/tablet, including touch controls.
- ✅ **Nearest Visible Navigation**: Sidebar automatically scrolls to nearest visible line when jumping to hidden lines.
- ✅ **Character Color Management**: Custom background colors per character in Dialogue lines.
- [ ] **Performance Tuning**: Virtual scrolling for large scripts (>1000 lines)
- [ ] **Unit & Integration Testing**: Exhaustive coverage for managers and audio engine

## Phase 6: Production Ready ✅
- ✅ **Offline Reliability**: Full PWA implementation with Service Worker (vite-plugin-pwa)
- ✅ **OS Integration**: High-resolution icons and manifest for macOS/Windows installation
- [ ] **Electron Migration**: Full desktop integration with native file system access
- [ ] **State Persistence**: Save/Load project configurations and user settings
- [ ] **v1.0 Release**: Documentation complete and beta feedback addressed
