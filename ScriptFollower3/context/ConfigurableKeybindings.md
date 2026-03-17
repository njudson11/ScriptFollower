# Configurable Keybindings System

## Overview

Rather than hardcoding keybindings in UI code, features declare what keybindings they support. This enables:
- Conflict resolution
- Context-aware activation
- User reconfiguration
- Centralized keybinding display

## IKeybinding Interface

```typescript
interface KeyBinding {
  readonly id: string                    // Unique ID
  readonly featureId: string             // Which feature
  readonly keys: readonly string[]       // Base keys: ['space'], ['ctrl', 'shift', 'n']
  readonly modifiers: {
    readonly shift?: boolean
    readonly ctrl?: boolean
    readonly alt?: boolean
    readonly meta?: boolean
  }
  readonly actionType: string            // The type of action to dispatch
  readonly actionPayload?: any          // Optional payload to dispatch with the action
  readonly isActive?: (context: any) => boolean  // When it's active
}
```

## Key Combination

```typescript
interface KeyCombination {
  keys: string[]                         // Base keys
  modifiers: {
    shift?: boolean
    ctrl?: boolean
    alt?: boolean
    meta?: boolean
  }
}

// Examples
const spacebar: KeyCombination = { keys: ['space'], modifiers: {} }
const ctrlShiftN: KeyCombination = { keys: ['n'], modifiers: { ctrl: true, shift: true } }
const ctrlPlus: KeyCombination = { keys: ['+'], modifiers: { ctrl: true } }
```

## Keybinding Manager

```typescript
class KeybindingManager {
  registerKeybinding(keybinding: KeyBinding): void
  unregisterKeybinding(keybindingId: string): void
  
  getKeybindingsForFeature(featureId: string): KeyBinding[]
  getKeybindingsForKeys(keys: KeyCombination): KeyBinding[]
  
  handleKeyDown(event: KeyboardEvent): Promise<void>
  
  resolveConflict(bindings: KeyBinding[], context: any): KeyBinding | undefined
}
```

## Sound Feature Example

Sound Feature declares:

```typescript
getKeybindings(): KeyBinding[] {
  return [
    {
      id: 'sound-play-pause',
      featureId: 'sound',
      keys: ['space'],
      modifiers: {},
      actionType: 'SOUND_PLAY_PAUSE',
      actionPayload: { /* relevant data */ },
      isActive: (context) => {
        // Active only if document loaded and line selected
        return context.hasDocument && context.currentLineId !== null
      },
    },
    {
      id: 'sound-stop-all',
      featureId: 'sound',
      keys: ['escape'],
      modifiers: {},
      actionType: 'SOUND_STOP_ALL',
      isActive: () => true,
    },
    {
      id: 'sound-volume-up',
      featureId: 'sound',
      keys: ['+'],
      modifiers: { ctrl: true },
      actionType: 'SOUND_VOLUME_UP',
      isActive: (context) => context.hasDocument,
    },
    {
      id: 'sound-volume-down',
      featureId: 'sound',
      keys: ['-'],
      modifiers: { ctrl: true },
      actionType: 'SOUND_VOLUME_DOWN',
      isActive: (context) => context.hasDocument,
    },
    {
      id: 'sound-next-cue',
      featureId: 'sound',
      keys: ['n'],
      modifiers: { ctrl: true },
      actionType: 'SOUND_NEXT_CUE',
      isActive: (context) => context.hasDocument,
    },
    {
      id: 'sound-prev-cue',
      featureId: 'sound',
      keys: ['p'],
      modifiers: { ctrl: true },
      actionType: 'SOUND_PREV_CUE',
      isActive: (context) => context.hasDocument,
    }
  ]
}
```

## Keybinding Activation

When user presses a key:

1. **Capture**: App captures keydown event
2. **Normalize**: Convert to KeyCombination
3. **Find Matches**: Get all bindings for this key combo
4. **Filter**: Keep only `isActive() === true`
5. **Conflict Resolution**: If multiple active, resolve conflict
6. **Dispatch Action**: Dispatch an action via the `ActionController`

```typescript
class KeybindingManager {
  async handleKeyDown(event: KeyboardEvent): Promise<void> {
    const keyCombination = this.extractKeyCombination(event)
    const context = this.buildContext()
    
    const matchingBindings = this.getKeybindingsForKeys(keyCombination)
      .filter(binding => binding.isActive(context))
    
    if (matchingBindings.length === 0) return
    
    if (matchingBindings.length === 1) {
      const binding = matchingBindings[0]
      // Dispatch action via ActionController
      this.actionController.dispatch({ type: binding.actionType, payload: binding.actionPayload });
    } else {
      // Conflict
      const resolved = this.resolveConflict(matchingBindings, context)
      if (resolved) {
        // Dispatch action via ActionController
        this.actionController.dispatch({ type: resolved.actionType, payload: resolved.actionPayload });
      }
    }
  }

  private buildContext() {
    return {
      hasDocument: this.appStore.getCurrentDocument() !== null,
      currentLineId: this.selectionManager.getCurrentLine(),
      selectedLines: this.selectionManager.getSelectedLines(),
      timestamp: Date.now()
    }
  }
}
```

## Conflict Resolution

When multiple keybindings claim the same key:

1. **Priority**: Use binding.priority (higher wins) - *Note: Priority not yet implemented*
2. **Contextual Order**: The system processes all registered keybindings and executes the **first** one whose `isActive()` check returns true.
3. **Implicit Mutual Exclusion**: Features (like `SoundFeature` and `BaseCueFeature`) coordinate their `isActive` logic to ensure that only one feature claims a key for a specific line type.

**Emit Conflict Event** for user notification:

```typescript
this.eventBus.emit({
  type: EVENT_TYPES.KEYBINDING_CONFLICT,
  payload: {
    keys: keyCombination,
    conflictingBindings: matchingBindings.map(b => ({
      featureId: b.featureId,
      action: b.action
    }))
  },
  timestamp: new Date()
})
```

## Context-Aware Activation

`isActive()` callback enables conditional activation:

```typescript
{
  id: 'sound-play',
  keys: ['space'],
  isActive: (context) => {
    // Only active if:
    // - Document is loaded
    // - A line is selected
    // - Not in search mode
    return context.hasDocument && 
           context.currentLineId !== null &&
           !context.isSearching
  },
  actionType: 'SOUND_PLAY',
  actionPayload: { /* relevant data, e.g., lineId: context.currentLineId */ }
}
```

## Line-Type Scoping

Keybindings can be scoped to specific line types:

```typescript
{
  id: 'lights-activate-for-stage-direction',
  keys: ['l'],
  modifiers: { ctrl: true },
  isActive: (context) => {
    if (!context.currentLineId) return false
    const line = context.currentLine
    return line.lineType === LineType.STAGE_DIRECTION
  },
  handler: (context) => this.activateLights()
}
```

## Dynamic Keybindings

Features can register/unregister bindings dynamically:

```typescript
class SearchFeature implements FeaturePlugin {
  async init() {
    // Normal keybindings
    this.keybindingManager.registerKeybinding({
      id: 'search-open',
      keys: ['f'],
      modifiers: { ctrl: true },
      action: 'openSearch',
      isActive: () => true,
      handler: () => this.openSearchUI()
    })
  }

  openSearchUI() {
    // Show search panel
    // Register search-specific keybindings
    this.keybindingManager.registerKeybinding({
      id: 'search-next',
      keys: ['g'],
      modifiers: { ctrl: true },
      action: 'findNext',
      isActive: () => this.isSearching,
      handler: () => this.findNext()
    })
  }

  closeSearchUI() {
    // Hide search panel
    // Unregister search-specific keybindings
    this.keybindingManager.unregisterKeybinding('search-next')
  }
}
```

## Keybinding Display

The UI can show all active keybindings:

```typescript
class KeybindingPanel {
  getAllKeybindings(): KeyBinding[] {
    const all: KeyBinding[] = []
    for (const feature of this.featureManager.getAllFeatures()) {
      all.push(...(feature.getKeybindings?.() ?? []))
    }
    return all
  }

  formatKeybinding(binding: KeyBinding): string {
    const keys = binding.keys.join('+')
    const modifiers = []
    if (binding.modifiers.ctrl) modifiers.push('Ctrl')
    if (binding.modifiers.shift) modifiers.push('Shift')
    if (binding.modifiers.alt) modifiers.push('Alt')
    if (binding.modifiers.meta) modifiers.push('Cmd')
    
    const all = [...modifiers, keys]
    return all.join('+')
  }
}
```

## Implementation in App.vue

```typescript
onMounted(() => {
  window.addEventListener('keydown', (event) => {
    keybindingManager.handleKeyDown(event)
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', (event) => {
    keybindingManager.handleKeyDown(event)
  })
})
```

## Best Practices

### 1. Use Modifiers Sparingly
```typescript
// ✅ Good - discoverable
{ keys: ['space'], modifiers: {} }
{ keys: ['escape'], modifiers: {} }

// ❌ Bad - too many modifiers
{ keys: ['x'], modifiers: { ctrl: true, shift: true, alt: true } }
```

### 2. Avoid Conflicts
```typescript
// ✅ Good - different keys or context
{
  keys: ['space'],
  isActive: (context) => context.inDocumentViewer
}

{
  keys: ['space'],
  isActive: (context) => context.inSearchBox
}

// ❌ Bad - same key, same context
{ keys: ['space'], isActive: () => true, action: 'action1' }
{ keys: ['space'], isActive: () => true, action: 'action2' }
```

### 3. Meaningful Actions
```typescript
// ✅ Good - describes intent
{ action: 'playOrPause', handler: () => this.playOrPause() }

// ❌ Bad - vague
{ action: 'doThing', handler: () => this.doThing() }
```

### 4. Document Keybindings
```typescript
{
  id: 'sound-play',
  action: 'playOrPause',
  // ✅ Add description
  description: 'Play or pause current line sound cue'
}
```

## User Configuration

Future: Allow users to rebind keys:

```typescript
const userBindings = {
  'sound-play': { keys: ['p'], modifiers: { ctrl: true } }
}

const getKeybinding = (id: string) => {
  return userBindings[id] ?? defaultBindings[id]
}
```

## Keybinding Events

Features can monitor keybinding triggers:

```typescript
this.eventBus.subscribe(EVENT_TYPES.KEYBINDING_TRIGGERED, (event) => {
  const { keybindingId, featureId, action } = event.payload
  // Log, analytics, etc.
})
```

## Summary

The keybinding system enables:
- ✅ Features declare, not hardcode
- ✅ Context-aware activation
- ✅ Automatic conflict detection
- ✅ Discoverable keybindings
- ✅ User reconfiguration (future)
- ✅ No core changes for new keybindings
