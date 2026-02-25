# Implementation Roadmap

## Phase Overview

```
Phase 1: Core Foundation ✅
Phase 2: Document Processing ✅ (ODT Support)
Phase 3: Core Features ✅ (Sound Feature)
Phase 4: Advanced Features ✅ (Mixing Hub)
Phase 5: UI Polish & Testing 🏗️ (In Progress)
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

## Phase 4: Advanced Features ✅
- ✅ **Master Audio Panel**: Centralized mixing and monitoring hub
- ✅ **Multi-Context Audio Engine**: Functional hardware output separation
- ✅ **Automatic Channel Management**: Virtual channels generated from script subtypes
- ✅ **Real-Time monitor**: Live active playback list with `soundRef` resolution
- ✅ **Environment Awareness**: Privacy-compliant device discovery and adaptive UI logic

## Phase 5: UI Polish & Testing 🏗️
- ✅ **CSS Modernization**: Initial decoupling of component styles to dedicated files
- [ ] **Theme Consistency**: Application-wide design system and fader styling
- [ ] **Responsive Design**: Optimization for booth monitors and mobile/tablet
- [ ] **Performance Tuning**: Virtual scrolling for large scripts (>1000 lines)
- [ ] **Unit & Integration Testing**: Exhaustive coverage for managers and audio engine

## Phase 6: Production Ready
- [ ] **Electron Migration**: Full desktop integration with native file system access
- [ ] **State Persistence**: Save/Load project configurations and user settings
- [ ] **Offline Reliability**: Service worker optimization for PWA
- [ ] **v1.0 Release**: Documentation complete and beta feedback addressed
