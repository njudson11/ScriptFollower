# Feature Plugin System

## Overview

ScriptFollower 3 uses a highly modular plugin system where every major piece of script-interactive logic is isolated as a "Feature". Features are registered at runtime and interact with the core through standard interfaces and an event-driven architecture.

## Feature Interface

All features must implement the `FeaturePlugin` interface:

```typescript
export interface FeaturePlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  
  init(): Promise<void>;
  destroy(): Promise<void>;
  
  // Optional extension points
  getKeybindings?(): KeyBinding[];
  getAnnotations?(): Annotation[];
  registerHighlightTypes?(registry: HighlightTypeRegistry): void;
}
```

## Feature Inheritance (Hierarchical Architecture)

To promote code reuse and consistent behaviour across different types of cues (Sound, Light, Tech), ScriptFollower 3 uses a hierarchical feature structure.

### 1. BaseCueFeature
The foundational feature that provides shared behaviours applicable to any script line:
- **Stop Actions**: Processes the `stop` annotation (`all`, `previous`, `[refs]`) to terminate active processes. It provides a global handler for explicit triggering via UI buttons or the `Space` bar.
- **End Behaviours**: Shared logic for what happens when a timed event (like a sound) completes: `loop`, `next-line`, `next-cue`, or `jump-to`.
- **Global Availability**: Registered as a core feature in `App.vue`, ensuring that `stop` annotations can be triggered on every line type in the script.

### 2. Derived Cue Features
Specialized features (like `SoundFeature`) extend `BaseCueFeature` to inherit standard behaviours while adding type-specific logic:
- **Inheritance**: Uses standard TypeScript class inheritance (`extends BaseCueFeature`).
- **Annotation Merging**: Combines base annotations with specialized ones (e.g., `volume`, `pan`, `fade-in`).
- **Behaviour Overrides**: Can provide specialized implementations for base methods (e.g., overriding `executeStopAction` to specifically stop audio buffers).

## Communication Patterns

### 1. Actions (UI -> Logic)
Features register handlers with the `ActionController` to respond to user intent.
```typescript
this.actionController.registerHandler(ACTION_TYPES.PLAY_CUE, this.handlePlay.bind(this));
```

### 2. Events (Logic -> UI / State)
Features subscribe to the `EventBus` to react to system changes.
```typescript
this.eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, (event) => {
  this.managePreloading(event.payload.lineId);
});
```

### 3. Annotations (Script -> Logic)
Features define the syntax and validation for their own parameters within the script's braced blocks `{...}`. These are registered with the `AnnotationManager`.

## Core Features List

| Feature | ID | Responsibility |
| :--- | :--- | :--- |
| **Base Cue** | `base-cue-feature` | Shared stop/end logic for all cues. |
| **Dialogue** | `dialogue-renderer` | Rendering character-based dialogue lines. |
| **Sound** | `sound-feature` | Audio playback, pre-loading, and routing. |
| **Voice** | `voice-recognition` | Web Speech API integration and text matching. |
| **Navigation** | `navigation-feature` | Keybindings for scrolling and selection. |
| **Search** | `search-feature` | Script-wide text search and highlighting. |

## Feature Manager

```typescript
class FeatureManager {
  async registerFeature(feature: FeaturePlugin): Promise<void>
  async unregisterFeature(featureId: string): Promise<void>
  getFeature(featureId: string): FeaturePlugin | undefined
  getAllFeatures(): FeaturePlugin[]
  hasFeature(featureId: string): boolean
  registerLineRenderer(lineType: LineType, component: Component, view: string = 'default'): void
  getLineRenderer(lineType: LineType, view: string = 'default'): Component | undefined
}
```

## Implementation Guidelines

1.  **Stateless UI**: Component renderers should rely on the `AppStore` or the manager provided by the feature, rather than holding local state.
2.  **Surgical Cleanup**: Always unregister all event listeners and action handlers in the `destroy()` method to prevent memory leaks.
3.  **Namespace Props**: When providing data to components, use unique keys to avoid injection collisions.
