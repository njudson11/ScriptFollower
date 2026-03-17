// src/features/KeybindingFeature.ts

import type { FeaturePlugin, KeyBinding, Event, ScriptLineBase, Document } from '@/types/core'
import type { FeatureManager } from '@/core/FeatureManager'
import type { ActionController } from '@/core/ActionController'
import type { AppStore, AppState } from '@/store/AppStore'
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
  private appStore: AppStore; 
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
  }

  private normaliseKeyEvent(event: KeyboardEvent): { keys: string[]; modifiers: KeyBinding['modifiers'] } {
    const keys: string[] = [];
    const modifiers: KeyBinding['modifiers'] = {
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      meta: event.metaKey,
    };

    let keyToPush = event.key.toLowerCase();
    if (keyToPush === ' ') keyToPush = 'space';

    if (keyToPush !== 'control' && keyToPush !== 'shift' && keyToPush !== 'alt' && keyToPush !== 'meta') {
      keys.push(keyToPush);
    }

    keys.sort();
    return { keys, modifiers };
  }

  private handleDocumentKeyDown(event: KeyboardEvent): void {
    if (!this.lineSelectionManager || !this.appStore || !this.featureManager) {
      return;
    }

    const target = event.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.tagName === 'SELECT' ||
                    target.isContentEditable;
    
    // For buttons, Space triggers a 'click'. To avoid duplicate action dispatch, 
    // we let the button's click handler win and ignore the global keybinding.
    const isButton = target.tagName === 'BUTTON';

    if (isInput || (isButton && event.key === ' ')) {
        // Special case: always allow Escape to clear focus
        if (event.key !== 'Escape') {
            return;
        }
    }

    const { keys, modifiers } = this.normaliseKeyEvent(event);
    const allKeybindings = this.featureManager.getAllKeybindings();

    const appState = this.appStore.getState();
    const currentLineId = this.lineSelectionManager.getCurrentLine();
    const context = {
      ...appState,
      currentLineId: currentLineId,
      hasDocument: appState.currentDocument !== null
    };

    for (const kb of allKeybindings) {
      const kbKeys = [...kb.keys].sort();
      const keysMatch = (kbKeys.length === keys.length) && kbKeys.every((value, index) => value === keys[index]);

      const modifiersMatch = 
        (!!kb.modifiers?.shift === modifiers.shift) &&
        (!!kb.modifiers?.ctrl === modifiers.ctrl) &&
        (!!kb.modifiers?.alt === modifiers.alt) &&
        (!!kb.modifiers?.meta === modifiers.meta);
      
      if (keysMatch && modifiersMatch) {
        if (!kb.isActive || kb.isActive(context)) {
          event.preventDefault();
          
          let payload = kb.actionPayload;
          if (kb.actionType === ACTION_TYPES.TOGGLE_PLAY_SOUND_CUE) {
            payload = { lineId: context.currentLineId };
          } else if (kb.actionType === ACTION_TYPES.NAVIGATE_NEXT_LINE && !payload) {
             payload = { lineId: context.currentLineId, offset: 1 };
          } else if (kb.actionType === ACTION_TYPES.NAVIGATE_PREVIOUS_LINE && !payload) {
            payload = { lineId: context.currentLineId, offset: -1 };
          }

          console.log(`[KeybindingFeature] Executing ${kb.actionType} for line ${context.currentLineId}`);
          this.actionController.dispatch({ type: kb.actionType, payload: payload });
          return; // Stop at first active match
        }
      }
    }
  }
}
