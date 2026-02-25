// src/features/KeybindingFeature.ts

import type { FeaturePlugin, KeyBinding, Event, ScriptLineBase, Document } from '@/types/core'
import type { FeatureManager } from '@/core/FeatureManager'
import type { ActionController } from '@/core/ActionController'
import type { AppStore } from '@/store/AppStore'
import { EVENT_TYPES } from '@/core/EventBus'
import { ACTION_TYPES } from '@/types/actions'
import { LineSelectionManager } from '@/core/LineSelectionManager';

export class KeybindingFeature implements FeaturePlugin {
  readonly id = 'keybinding-feature'
  readonly name = 'Global Keybinding Manager'
  readonly version = '1.0.0'
  readonly description = 'Manages global keyboard shortcuts and dispatches actions via the ActionController.'

  private featureManager: FeatureManager
  private actionController: ActionController
  private appStore: AppStore; // To get application context for isActive checks
  private documentKeyListener: ((event: KeyboardEvent) => void) | null = null;
  private lineSelectionManager: LineSelectionManager;

  constructor(featureManager: FeatureManager, actionController: ActionController, appStore: AppStore, lineSelectionManager: LineSelectionManager) {
    this.featureManager = featureManager
    this.actionController = actionController
    this.appStore = appStore;
    this.lineSelectionManager = lineSelectionManager;
  }

  async init(): Promise<void> {
    console.log(`[${this.name}] Initializing...`);
    this.documentKeyListener = this.handleDocumentKeyDown.bind(this);
    document.addEventListener('keydown', this.documentKeyListener);
    console.log(`[${this.name}] Global keydown listener registered.`);
  }

  async destroy(): Promise<void> {
    console.log(`[${this.name}] Destroying...`);
    if (this.documentKeyListener) {
      document.removeEventListener('keydown', this.documentKeyListener);
      this.documentKeyListener = null;
      console.log(`[${this.name}] Global keydown listener unregistered.`);
    }
    this.featureManager.unregisterFeature(this.id);
  }

  // Helper to normalize keyboard events for matching keybindings
  private normalizeKeyEvent(event: KeyboardEvent): { keys: string[]; modifiers: KeyBinding['modifiers'] } {
    const keys: string[] = [];
    const modifiers: KeyBinding['modifiers'] = {
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    };

    // Determine the key to push, only if it's not a modifier key itself
    let keyToPush = event.key.toLowerCase();

    // Handle special keys. ONLY space needs remapping here.
    if (keyToPush === ' ') keyToPush = 'space';

    // Only add the key if it's not one of the modifier keys,
    // preventing e.g. 'control' from being in the `keys` array when Ctrl is pressed.
    if (keyToPush !== 'control' && keyToPush !== 'shift' && keyToPush !== 'alt' && keyToPush !== 'meta') {
      keys.push(keyToPush);
    }

    keys.sort(); // Sorting is important for consistent matching

    return { keys, modifiers };
  }

  private handleDocumentKeyDown(event: KeyboardEvent): void {
    // Safety check for dependencies
    if (!this.lineSelectionManager || !this.appStore || !this.featureManager) {
      return;
    }

    const { keys, modifiers } = this.normalizeKeyEvent(event);
    const allKeybindings = this.featureManager.getAllKeybindings();

    const appState = this.appStore.getState();
    const currentLineId = this.lineSelectionManager.getCurrentLine();
    const currentLine = currentLineId ? this.appStore.getLineById(currentLineId) : undefined;
    const context = {
      ...appState,
      currentLineId: currentLineId,
      currentLine: currentLine,
      hasDocument: appState.currentDocument !== null
    };

    for (const kb of allKeybindings) {
      // Check if keys match
      const kbKeys = [...kb.keys].sort();
      const keysMatch = (kbKeys.length === keys.length) && kbKeys.every((value, index) => value === keys[index]);

      // Check if modifiers match
      const modifiersMatch = 
        (!!kb.modifiers?.shift === modifiers.shift) &&
        (!!kb.modifiers?.ctrl === modifiers.ctrl) &&
        (!!kb.modifiers?.alt === modifiers.alt) &&
        (!!kb.modifiers?.meta === modifiers.meta);
      
      if (keysMatch && modifiersMatch) {
        // Check if the keybinding is active in the current context
        if (!kb.isActive || kb.isActive(context)) {
          event.preventDefault(); // Prevent default browser action as soon as a keybinding matches AND is active
          
          let payload = kb.actionPayload;
          // For specific actions, inject dynamic payload from context if not already provided
          if (kb.actionType === ACTION_TYPES.TOGGLE_PLAY_SOUND_CUE) {
            payload = { lineId: context.currentLineId };
          } else if (kb.actionType === ACTION_TYPES.NAVIGATE_NEXT_LINE && !payload) {
             payload = { lineId: context.currentLineId, offset: 1 };
          } else if (kb.actionType === ACTION_TYPES.NAVIGATE_PREVIOUS_LINE && !payload) {
            payload = { lineId: context.currentLineId, offset: -1 };
          }

          this.actionController.dispatch({ type: kb.actionType, payload: payload });
          return; // Only dispatch one action per key event
        }
      }
    }
  }
}

