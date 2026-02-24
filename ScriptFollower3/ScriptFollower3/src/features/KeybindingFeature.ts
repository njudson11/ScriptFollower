// src/features/KeybindingFeature.ts

import type { FeaturePlugin, KeyBinding, Event } from '@/types/core'
import type { FeatureManager } from '@/core/FeatureManager'
import type { ActionController } from '@/core/ActionController'
import type { AppStore } from '@/store/AppStore'
import { EVENT_TYPES } from '@/core/EventBus'

// Helper to normalize keyboard events for matching keybindings
function normalizeKeyEvent(event: KeyboardEvent): { keys: string[]; modifiers: KeyBinding['modifiers'] } {
  const keys: string[] = [];
  const modifiers: KeyBinding['modifiers'] = {
    shift: event.shiftKey,
    ctrl: event.ctrlKey,
    alt: event.altKey,
    meta: event.metaKey, // Command key on Mac, Windows key on Windows
  };

  // Add actual key pressed, unless it's a modifier key itself
  if (!event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey) {
    keys.push(event.key.toLowerCase());
  }

  // Sort keys to handle different press orders
  keys.sort();

  return { keys, modifiers };
}

export class KeybindingFeature implements FeaturePlugin {
  readonly id = 'keybinding-feature'
  readonly name = 'Global Keybinding Manager'
  readonly version = '1.0.0'
  readonly description = 'Manages global keyboard shortcuts and dispatches actions via the ActionController.'

  private featureManager: FeatureManager
  private actionController: ActionController
  private appStore: AppStore; // To get application context for isActive checks
  private documentKeyListener: ((event: KeyboardEvent) => void) | null = null;

  constructor(featureManager: FeatureManager, actionController: ActionController, appStore: AppStore) {
    this.featureManager = featureManager
    this.actionController = actionController
    this.appStore = appStore;
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
  }

  private handleDocumentKeyDown(event: KeyboardEvent): void {
    const { keys, modifiers } = normalizeKeyEvent(event);
    const allKeybindings = this.featureManager.getAllKeybindings();

    for (const kb of allKeybindings) {
      // Check if keys match
      const kbKeys = [...kb.keys].sort(); // Sort for consistent comparison
      const keysMatch = (kbKeys.length === keys.length) && kbKeys.every((value, index) => value === keys[index]);

      // Check if modifiers match
      const modifiersMatch = 
        (!!kb.modifiers?.shift === modifiers.shift) &&
        (!!kb.modifiers?.ctrl === modifiers.ctrl) &&
        (!!kb.modifiers?.alt === modifiers.alt) &&
        (!!kb.modifiers?.meta === modifiers.meta);
      
      if (keysMatch && modifiersMatch) {
        // Check if the keybinding is active in the current context
        const context = this.appStore.getState(); // Provide current app state as context
        if (!kb.isActive || kb.isActive(context)) {
          event.preventDefault(); // Prevent default browser action for this keybinding
          this.actionController.dispatch({ type: kb.actionType, payload: kb.actionPayload });
          return; // Only dispatch one action per key event
        }
      }
    }
  }
}

