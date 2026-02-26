/**
 * Line Selection and Focus Management
 * Centralized management of line selection, highlighting, and focus
 */

import { ref, reactive } from 'vue' // Import ref and reactive
import { Highlight, HighlightStyle, HighlightTypeRegistry as IHighlightTypeRegistry, LineType } from '@/types/core'
import { EventBus, EVENT_TYPES } from '@/core/EventBus'
import type { AppStore } from '@/store/AppStore' // Import AppStore
import { ActionController } from '@/core/ActionController' // Import ActionController
import { ACTION_TYPES, Action } from '@/types/actions' // Import ACTION_TYPES and Action

/**
 * Built-in highlight type priorities
 */
export const DEFAULT_HIGHLIGHT_PRIORITIES = {
  SELECTED: 100,
  PLAYING: 90,
  TEMPORARY: 80,
  ERROR: 70,
  CUSTOM_START: 50 // Features can use 50-69 for custom highlights
} as const

export class HighlightTypeRegistry implements IHighlightTypeRegistry {
  private types: Map<string, HighlightStyle> = new Map()
  private priorities: Map<string, number> = new Map()

  constructor() {
    this.registerBuiltins()
  }

  private registerBuiltins(): void {
    this.register('selected', DEFAULT_HIGHLIGHT_PRIORITIES.SELECTED, {
      backgroundColor: '#e3f2fd',
      borderColor: '#2196f3',
      borderWidth: '2px'
    })

    this.register('playing', DEFAULT_HIGHLIGHT_PRIORITIES.PLAYING, {
      backgroundColor: '#fff3e0',
      borderColor: '#ff9800',
      borderWidth: '1px'
    })

    this.register('error', DEFAULT_HIGHLIGHT_PRIORITIES.ERROR, {
      backgroundColor: '#ffebee',
      borderColor: '#f44336',
      borderWidth: '1px'
    })

    this.register('temporary', DEFAULT_HIGHLIGHT_PRIORITIES.TEMPORARY, {
      opacity: 0.7
    })
  }

  register(type: string, priority: number, style: HighlightStyle): void {
    this.types.set(type, style)
    this.priorities.set(type, priority)
  }

  unregister(type: string): void {
    this.types.delete(type)
    this.priorities.delete(type)
  }

  get(type: string): HighlightStyle | undefined {
    return this.types.get(type)
  }

  getAll(): Map<string, HighlightStyle> {
    return new Map(this.types)
  }

  getPriority(type: string): number {
    return this.priorities.get(type) ?? 0
  }
}

export class LineSelectionManager {
  private _currentLineId = ref<string | null>(null) // Made reactive
  private _selectedLineIds = reactive(new Set<string>()) // Made reactive
  private highlights: Map<string, Highlight[]> = new Map()
  private highlightTypeRegistry: HighlightTypeRegistry
  private eventBus: EventBus
  private appStore: AppStore // Added AppStore dependency
  private selectionHistory: string[] = []
  private historyIndex: number = -1
  private unsubscribeFromActions: (() => void)[] = [] // To store unsubscribe function

  constructor(eventBus: EventBus, appStore: AppStore, actionController: ActionController) { // Added appStore and ActionController to constructor
    this.eventBus = eventBus
    this.appStore = appStore // Initialize appStore
    this.highlightTypeRegistry = new HighlightTypeRegistry()

    // Register action handlers
    this.unsubscribeFromActions.push(
      actionController.registerHandler(ACTION_TYPES.SELECT_LINE, this.handleSelectLineAction.bind(this))
    );
  }

  private handleSelectLineAction(action: Action): void {
    if (action.payload && action.payload.lineId) {
      this.selectLine(action.payload.lineId);
    } else {
      console.warn(`[LineSelectionManager] SELECT_LINE action received without lineId payload:`, action);
    }
  }

  /**
   * Select a line and make it current
   */
  selectLine(lineId: string | null): void {
    const oldLineId = this._currentLineId.value // Access reactive value
    this._currentLineId.value = lineId // Update reactive value
    this._selectedLineIds.clear() // Clear reactive Set
    if (lineId) {
      this._selectedLineIds.add(lineId) // Add to reactive Set
    }

    // Add to history only if lineId is not null and different from last entry
    if (lineId && lineId !== this.selectionHistory[this.historyIndex]) {
      this.selectionHistory.splice(this.historyIndex + 1)
      this.selectionHistory.push(lineId)
      this.historyIndex = this.selectionHistory.length - 1
    }

    this.eventBus.emit({
      type: EVENT_TYPES.LINE_SELECTED,
      payload: { lineId, oldLineId },
      timestamp: new Date()
    })

    this.eventBus.emit({
      type: EVENT_TYPES.SELECTION_CHANGED,
      payload: { selectedLineIds: Array.from(this._selectedLineIds) }, // Access reactive Set
      timestamp: new Date()
    })
  }

  /**
   * Add or remove a line from selection
   */
  toggleLineSelection(lineId: string): void {
    if (this._selectedLineIds.has(lineId)) {
      this._selectedLineIds.delete(lineId)
    } else {
      this._selectedLineIds.add(lineId)
    }

    this.eventBus.emit({
      type: EVENT_TYPES.SELECTION_CHANGED,
      payload: { selectedLineIds: Array.from(this._selectedLineIds) },
      timestamp: new Date()
    })
  }

  /**
   * Add a highlight to a line
   */
  addHighlight(lineId: string, type: string, data?: Record<string, any>): void {
    const priority = this.highlightTypeRegistry.getPriority(type)
    const highlight: Highlight = {
      lineId,
      type,
      priority,
      data
    }

    if (!this.highlights.has(lineId)) {
      this.highlights.set(lineId, [])
    }
    this.highlights.get(lineId)!.push(highlight)

    this.eventBus.emit({
      type: EVENT_TYPES.HIGHLIGHT_ADDED,
      payload: { lineId, highlight },
      timestamp: new Date()
    })
  }

  /**
   * Remove a highlight from a line
   */
  removeHighlight(lineId: string, type: string): void {
    const highlights = this.highlights.get(lineId)
    if (!highlights) return

    const index = highlights.findIndex(h => h.type === type)
    if (index !== -1) {
      const highlight = highlights[index]
      highlights.splice(index, 1)

      if (highlights.length === 0) {
        this.highlights.delete(lineId)
      }

      this.eventBus.emit({
        type: EVENT_TYPES.HIGHLIGHT_REMOVED,
        payload: { lineId, type },
        timestamp: new Date()
      })
    }
  }

  /**
   * Clear all highlights for a line
   */
  clearHighlights(lineId: string): void {
    const highlights = this.highlights.get(lineId)
    if (highlights) {
      highlights.forEach(h => {
        this.eventBus.emit({
          type: EVENT_TYPES.HIGHLIGHT_REMOVED,
          payload: { lineId, type: h.type },
          timestamp: new Date()
        })
      })
      this.highlights.delete(lineId)
    }
  }

  /**
   * Get current selected line
   */
  getCurrentLine(): string | null {
    return this._currentLineId.value // Return reactive value
  }

  /**
   * Get all selected lines
   */
  getSelectedLines(): string[] {
    return Array.from(this._selectedLineIds) // Return reactive Set converted to Array
  }

  /**
   * Get highlights for a line
   */
  getHighlights(lineId: string): Highlight[] {
    const highlights = this.highlights.get(lineId) ?? []
    return highlights.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Get the highest priority highlight for a line
   */
  getPrimaryHighlight(lineId: string): Highlight | undefined {
    const highlights = this.getHighlights(lineId)
    return highlights[0]
  }

  /**
   * Get access to the highlight type registry
   */
  getHighlightRegistry(): HighlightTypeRegistry {
    return this.highlightTypeRegistry
  }

  /**
   * Determines the active line ID for the sidebar based on the current document line and line type visibility.
   * @param currentLineId The ID of the currently active line in the document viewer.
   * @param lineTypeVisibility A record indicating the visibility of each LineType.
   * @returns The ID of the line that should be active in the sidebar, or null if none.
   */
  getSidebarActiveLine(currentLineId: string | null, lineTypeVisibility: Record<LineType, boolean>): string | null {
    if (!currentLineId) return null;

    const allLines = this.appStore.getLines();
    const visibleLinesInSidebar = allLines.filter(line => lineTypeVisibility[line.lineType]);

    // 1. Check if the current document line is visible in the sidebar
    const currentLineInSidebar = visibleLinesInSidebar.find(line => line.id === currentLineId);
    if (currentLineInSidebar) {
      return currentLineInSidebar.id;
    }

    // 2. If not, find the nearest visible line
    const currentLineIndexInDoc = allLines.findIndex(line => line.id === currentLineId);
    if (currentLineIndexInDoc === -1) return null; // Current document line not found

    // Search forward
    let forwardMatchId: string | null = null;
    for (let i = currentLineIndexInDoc + 1; i < allLines.length; i++) {
      if (lineTypeVisibility[allLines[i].lineType]) {
        forwardMatchId = allLines[i].id;
        break;
      }
    }

    // Search backward
    let backwardMatchId: string | null = null;
    for (let i = currentLineIndexInDoc - 1; i >= 0; i--) {
      if (lineTypeVisibility[allLines[i].lineType]) {
        backwardMatchId = allLines[i].id;
        break;
      }
    }

    // Prefer forward match if both exist, otherwise return whichever exists
    return forwardMatchId || backwardMatchId || null;
  }

  /**
   * Undo last selection
   */
  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--
      const lineId = this.selectionHistory[this.historyIndex]
      this._currentLineId.value = lineId // Update reactive value
      this._selectedLineIds.clear() // Clear reactive Set
      this._selectedLineIds.add(lineId) // Add to reactive Set

      this.eventBus.emit({
        type: EVENT_TYPES.SELECTION_CHANGED,
        payload: { selectedLineIds: Array.from(this._selectedLineIds) },
        timestamp: new Date()
      })
    }
  }

  /**
   * Redo last selection
   */
  redo(): void {
    if (this.historyIndex < this.selectionHistory.length - 1) {
      this.historyIndex++
      const lineId = this.selectionHistory[this.historyIndex]
      this._currentLineId.value = lineId // Update reactive value
      this._selectedLineIds.clear() // Clear reactive Set
      this._selectedLineIds.add(lineId) // Add to reactive Set

      this.eventBus.emit({
        type: EVENT_TYPES.SELECTION_CHANGED,
        payload: { selectedLineIds: Array.from(this._selectedLineIds) },
        timestamp: new Date()
      })
    }
  }

  /**
   * Cleanup method to unregister action handlers.
   */
  destroy(): void {
    this.unsubscribeFromActions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFromActions = [];
  }
}
