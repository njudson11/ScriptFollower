/**
 * Event Bus implementation for cross-feature communication
 */

import { Event } from '@/types/core'

type EventListener = (event: Event) => void | Promise<void>

export class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map()

  /**
   * Subscribe to events of a specific type
   */
  subscribe(eventType: string, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(listener)
    }
  }

  /**
   * Publish an event to all listeners
   */
  async emit(event: Event): Promise<void> {
    const listeners = this.listeners.get(event.type)
    if (!listeners) return

    await Promise.all(Array.from(listeners).map(listener => listener(event)))
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear()
  }

  /**
   * Get number of listeners for a specific event type
   */
  listenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.size ?? 0
  }
}

// Common event types
export const EVENT_TYPES = {
  // Document events
  DOCUMENT_LOADED: 'document:loaded',
  DOCUMENT_UNLOADED: 'document:unloaded',
  DOCUMENT_ERROR: 'document:error',
  SOUNDS_LOADED: 'sounds:loaded',

  // Selection events
  LINE_SELECTED: 'selection:lineSelected',
  SELECTION_CHANGED: 'selection:changed',
  HIGHLIGHT_ADDED: 'highlight:added',
  HIGHLIGHT_REMOVED: 'highlight:removed',

  // Feature events
  FEATURE_INITIALIZED: 'feature:initialized',
  FEATURE_DESTROYED: 'feature:destroyed',
  FEATURE_ERROR: 'feature:error',

  // UI events
  UI_READY: 'ui:ready',
  UI_ERROR: 'ui:error',

  // Keybinding events
  KEYBINDING_TRIGGERED: 'keybinding:triggered',
  KEYBINDING_CONFLICT: 'keybinding:conflict',

  // Annotation events
  ANNOTATION_PARSED: 'annotation:parsed',
  ANNOTATION_ERROR: 'annotation:error'
} as const
