# Implementation Roadmap

## Phase Overview

```
Phase 1: Core Foundation ✅
Phase 2: Document Processing ✅ (ODT Support)
Phase 3: Core Features ✅ (Sound Feature)
Phase 4: Advanced Features 🏗️ (In Progress)
Phase 5: UI Polish & Testing
Phase 6: Production Ready
```

## Phase 1: Core Foundation ✅
- ✅ Vite + Vue 3 + TypeScript project setup
- ✅ Core data model (ScriptLineBase, Document)
- ✅ Central Managers (EventBus, LineSelectionManager, FeatureManager, ActionController, AppStore)
- ✅ Basic UI layout (Toolbar, Sidebar, DocumentViewer, RightPanel)

## Phase 2: Document Processing ✅
- ✅ ODT Parser implementation
- ✅ Automated "Load Project Folder" workflow
- ✅ Intelligent file matching based on numerical prefixes
- ✅ Page number extraction and propagation

## Phase 3: Core Features ✅
- ✅ **Sound Feature**: Full integration with Web Audio API
- ✅ **Annotation System**: Key-value parsing for script-based control
- ✅ **Keybinding Feature**: Global shortcut management
- ✅ **Dialogue Rendering**: Custom component for script readability

## Phase 4: Advanced Features 🏗️
- ✅ **Master Audio Panel**: Centralized mixing and monitoring hub
- ✅ **Virtual Audio Channels**: Alphabetical multi-channel mixing engine
- ✅ **Real-Time monitor**: Application-wide active playback list with `soundRef` resolution
- ✅ **Output Device Selection**: System-level device mapping (PWA)
- [ ] **Lights Feature**: Basic integration for lighting cues
- [ ] **Search Feature**: Full-text script search with highlights

## Phase 5: UI Polish & Testing
- [ ] **CSS Modernization**: Component-dedicated stylesheets and theme consistency
- [ ] **Responsive Design**: Optimization for booth monitors and mobile/tablet
- [ ] **Performance Tuning**: Virtual scrolling for large scripts (>1000 lines)
- [ ] **Unit & Integration Testing**: Exhaustive coverage for managers and audio engine

## Phase 6: Production Ready
- [ ] **Electron Migration**: Full desktop integration with native file system access
- [ ] **State Persistence**: Save/Load project configurations and user settings
- [ ] **Offline Reliability**: Service worker optimization for PWA
- [ ] **v1.0 Release**: Documentation complete and beta feedback addressed
