# ScriptFollower 3 - Core Architecture

## Overview

ScriptFollower 3 uses a **modular plugin architecture** where features are completely decoupled from the core system. The architecture enables adding new features with minimal changes to existing code. It is implemented as a **Progressive Web App (PWA)** for offline reliability and native-like installation.

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
│  Character-specific UI colors                       │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│      Core Managers                                  │
│  - EventBus: Cross-feature communication           │
│  - ActionController: Centralized action dispatching│
│  - LineSelectionManager: Selection & Focus         │
│  - AudioPlaybackManager: Multi-context mixing desk │
│  - AnnotationManager: Script-based configuration   │
│  - DocumentPostProcessor: Generic script enrichment│
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
- **UI Layer**: Presentation only, imports dedicated component CSS files.
- **State Layer**: AppStore manages reactive state for all features, including persistent virtual channel settings and character color mappings.
- **Manager Layer**: Business logic for selections, events, audio routing, and annotations.
- **Feature Layer**: Self-contained plugins implementing `IFeaturePlugin`.

### 2. Event-Driven & Action-Based
- **EventBus**: Loose coupling via pub/sub for state changes.
- **ActionController**: Command bus for triggering application logic (e.g., `PLAY_SOUND_CUE`, `SELECT_LINE`).

### 3. Multi-Context Audio Engine
- **Independent Mixing**: Virtual channels (`GainNode`s) allow for complex sub-mixes.
- **Hardware Routing**: In supported environments, different virtual channels can be mapped to different physical outputs via a pool of device-mapped `AudioContext`s.
- **Real-Time Monitoring**: Application-wide tracking of active players with progress and metadata.
- **Script Integration**: Automatic channel creation from sound subtypes and direct routing via `{chan=X}` annotations.

### 4. Progressive Web App (PWA)
- **Offline Capabilities**: Service worker caching for application shell and assets.
- **Asset Persistence**: Strategic caching of audio assets for reliable performance in booth environments.
- **Installable**: Native OS integration with high-resolution icons and dedicated windowing.

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
- **Primary Default**: **"Channel A"** serves as the base mixing target.
- **Subtype-Based**: Virtual channels are automatically generated for unique script subtypes upon loading.
- **Persistent**: All channel-to-hardware mappings are preserved across application views.

## Success Criteria

✅ Zero core changes required for new features
✅ Functional multi-device hardware routing (where supported)
✅ Reliable state persistence across all mixing desk settings
✅ Standardized annotation parsing across features
✅ Full offline support and OS installation via PWA
