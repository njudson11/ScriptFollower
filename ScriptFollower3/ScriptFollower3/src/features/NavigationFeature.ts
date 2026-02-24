// ScriptFollower3/src/features/NavigationFeature.ts

import type { FeaturePlugin, KeyBinding } from '@/types/core';
import type { FeatureManager } from '@/core/FeatureManager';
import type { ActionController, ActionHandler } from '@/core/ActionController';
import type { AppStore, AppState } from '@/store/AppStore';
import type { LineSelectionManager } from '@/core/LineSelectionManager';
import { ACTION_TYPES } from '@/types/actions';
import { ScriptLineBase } from '@/types/core';

export class NavigationFeature implements FeaturePlugin {
  readonly id = 'navigation-feature';
  readonly name = 'Document Navigation';
  readonly version = '1.0.0';
  readonly description = 'Provides keyboard-based navigation through the document lines.';

  private featureManager: FeatureManager;
  private actionController: ActionController;
  private appStore: AppStore;
  private selectionManager: LineSelectionManager;

  private actionUnregisterFunctions: (() => void)[] = [];

  constructor(
    featureManager: FeatureManager,
    actionController: ActionController,
    appStore: AppStore,
    selectionManager: LineSelectionManager
  ) {
    this.featureManager = featureManager;
    this.actionController = actionController;
    this.appStore = appStore;
    this.selectionManager = selectionManager;
  }

  async init(): Promise<void> {
    console.log(`[${this.name}] Initializing...`);
    
    // Keybindings are automatically registered with FeatureManager by calling getKeybindings()

    // Register action handlers
    this.actionUnregisterFunctions.push(
      this.actionController.registerHandler(
        ACTION_TYPES.NAVIGATE_NEXT_LINE,
        this.handleNavigateNextLine.bind(this)
      )
    );
    this.actionUnregisterFunctions.push(
      this.actionController.registerHandler(
        ACTION_TYPES.NAVIGATE_PREVIOUS_LINE,
        this.handleNavigatePreviousLine.bind(this)
      )
    );
    this.actionUnregisterFunctions.push(
      this.actionController.registerHandler(
        ACTION_TYPES.SELECT_LINE,
        this.handleSelectLine.bind(this)
      )
    );
    console.log(`[${this.name}] Initialized.`);
  }

  async destroy(): Promise<void> {
    console.log(`[${this.name}] Destroying...`);
    // Unregister keybindings (FeatureManager handles this for all registered features)
    // Unregister action handlers
    this.actionUnregisterFunctions.forEach(unregister => unregister());
    this.actionUnregisterFunctions = [];
    console.log(`[${this.name}] Destroyed.`);
  }

  getKeybindings(): KeyBinding[] {
    return [
      {
        id: 'navigate-next-line',
        featureId: this.id,
        keys: ['arrowdown'],
        modifiers: {},
        actionType: ACTION_TYPES.NAVIGATE_NEXT_LINE,
        isActive: (context: AppState) => {
          const currentDocument = context.currentDocument;
          if (!currentDocument || currentDocument.lines.length === 0) return false;
          
          const currentLineId = this.selectionManager.getCurrentLine();
          if (!currentLineId) return true; // If no line selected, allow to select first

          const lines = currentDocument.lines;
          const currentIndex = lines.findIndex(line => line.id === currentLineId);
          return currentIndex < lines.length - 1;
        },
      },
      {
        id: 'navigate-previous-line',
        featureId: this.id,
        keys: ['arrowup'],
        modifiers: {},
        actionType: ACTION_TYPES.NAVIGATE_PREVIOUS_LINE,
        isActive: (context: AppState) => {
          const currentDocument = context.currentDocument;
          if (!currentDocument || currentDocument.lines.length === 0) return false;

          const currentLineId = this.selectionManager.getCurrentLine();
          if (!currentLineId) return false; // Cannot go previous if nothing selected

          const lines = currentDocument.lines;
          const currentIndex = lines.findIndex(line => line.id === currentLineId);
          return currentIndex > 0;
        },
      },
    ];
  }

  private async handleNavigateNextLine(): Promise<void> {
    const currentDocument = this.appStore.getCurrentDocument();
    if (!currentDocument || currentDocument.lines.length === 0) return;

    const lines = currentDocument.lines;
    const currentLineId = this.selectionManager.getCurrentLine();

    let nextLine: ScriptLineBase | undefined;
    if (!currentLineId) {
      // If no line is currently selected, select the first line
      nextLine = lines[0];
    } else {
      const currentIndex = lines.findIndex(line => line.id === currentLineId);
      if (currentIndex !== -1 && currentIndex < lines.length - 1) {
        nextLine = lines[currentIndex + 1];
      }
    }

    if (nextLine) {
      this.selectionManager.selectLine(nextLine.id);
    }
  }

  private async handleNavigatePreviousLine(): Promise<void> {
    const currentDocument = this.appStore.getCurrentDocument();
    if (!currentDocument || currentDocument.lines.length === 0) return;

    const lines = currentDocument.lines;
    const currentLineId = this.selectionManager.getCurrentLine();

    if (!currentLineId) {
      // If no line is selected, there's no previous line to go to.
      return;
    }

    const currentIndex = lines.findIndex(line => line.id === currentLineId);
    if (currentIndex > 0) {
      this.selectionManager.selectLine(lines[currentIndex - 1].id);
    }
  }

  private async handleSelectLine(action: { payload?: { lineId: string } }): Promise<void> {
    const lineId = action.payload?.lineId;
    if (lineId) {
      this.selectionManager.selectLine(lineId);
    } else {
      console.warn(`[${this.name}] SELECT_LINE action dispatched without a lineId payload.`);
    }
  }
}
