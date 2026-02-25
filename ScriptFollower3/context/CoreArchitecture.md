# ScriptFollower 3 - Core Architecture

## Overview

ScriptFollower 3 uses a **modular plugin architecture** where features are completely decoupled from the core system. The architecture enables adding new features with minimal changes to existing code.

## Architectural Layers

```
┌─────────────────────────────────────────────────────┐
│          UI Components (Vue 3 + External CSS)        │
│  Toolbar, Sidebar, DocumentViewer, RightPanel      │
└────────────────────┬────────────────────────────────┘
                     │ provide/inject
┌────────────────────▼────────────────────────────────┐
│          State Management (AppStore)                │
│  Document, Selection, Virtual Channels, Feature Data│
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│      Core Managers                                  │
│  - EventBus: Cross-feature communication           │
│  - ActionController: Centralized action dispatching│
│  - LineSelectionManager: Selection & Focus         │
│  - AudioPlaybackManager: Multi-channel mixing desk │
│  - AnnotationManager: Script-based configuration   │
│  - FeatureManager: Plugin registration             │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│      Feature Plugins (IFeaturePlugin)              │
│  - SoundFeature (Advanced Cues)                    │
│  - MasterAudioPanelFeature (Mixing Hub)            │
│  - KeybindingFeature (Global Shortcuts)            │
│  - DialogueRenderingFeature (Custom UI)            │
│  - SidebarProgressBarFeature                       │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│      Core Data                                      │
│  - ScriptLineBase (immutable, with Page Numbers)    │
│  - Document (versioned)                            │
│  - Virtual Channels (A, B, C...)                   │
└─────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Separation of Concerns
- **UI Layer**: Presentation only, imports dedicated CSS files.
- **State Layer**: AppStore manages reactive state for all features.
- **Manager Layer**: Business logic for selections, events, audio routing, and annotations.
- **Feature Layer**: Self-contained plugins implementing `IFeaturePlugin`.

### 2. Event-Driven & Action-Based
- **EventBus**: Loose coupling via pub/sub for state changes.
- **ActionController**: Command bus for triggering application logic (e.g., `PLAY_SOUND_CUE`, `SELECT_LINE`).

### 3. Multi-Channel Audio Engine
- **Independent Mixing**: Virtual channels (`GainNode`s) allow for complex sub-mixes.
- **Real-Time Monitoring**: Application-wide tracking of active players with progress and metadata.
- **Script Integration**: Direct channel routing via `{chan=X}` annotations.

## Key Concepts

### ScriptLineBase
```typescript
interface ScriptLineBase {
  readonly id: string
  readonly lineNumber: number
  readonly lineType: LineType
  readonly text: string
  readonly annotation?: string
  readonly metadata: Record<string, any>
  readonly pageNumber: number | null
}
```

### Virtual Audio Channels
```typescript
interface IVirtualChannel {
  readonly id: string;
  readonly name: string;
  readonly volume: number;
  readonly isMuted: boolean;
}
```

## Success Criteria

✅ Zero core changes required for new features
✅ Type-safe multi-channel audio routing
✅ Standardized annotation parsing across features
✅ Decoupled styles for better maintainability
✅ Reliable asynchronous file handling (FileList to Array)
