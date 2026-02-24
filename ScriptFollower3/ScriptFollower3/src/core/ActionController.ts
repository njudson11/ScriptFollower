// src/core/ActionController.ts

import { EventBus } from './EventBus';
import { Action } from '@/types/actions';

/**
 * Type definition for an action handler function.
 */
export type ActionHandler = (action: Action) => Promise<void> | void;

/**
 * The ActionController is a central hub for dispatching and handling application-wide actions.
 * It allows different parts of the application (e.g., UI, features) to trigger actions
 * without needing direct knowledge of which components or features will handle them.
 *
 * It supports registering multiple handlers for a single action type.
 */
export class ActionController {
  private handlers: Map<string, Set<ActionHandler>> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Registers a handler function for a specific action type.
   * Multiple handlers can be registered for the same action type.
   * @param actionType The type of action to handle.
   * @param handler The function that will be called when the action is dispatched.
   * @returns A function to unregister the handler.
   */
  registerHandler(actionType: string, handler: ActionHandler): () => void {
    if (!this.handlers.has(actionType)) {
      this.handlers.set(actionType, new Set());
    }
    this.handlers.get(actionType)?.add(handler);

    console.log(`[ActionController] Registered handler for action: ${actionType}`);

    return () => {
      this.handlers.get(actionType)?.delete(handler);
      if (this.handlers.get(actionType)?.size === 0) {
        this.handlers.delete(actionType);
      }
      console.log(`[ActionController] Unregistered handler for action: ${actionType}`);
    };
  }

  /**
   * Dispatches an action, triggering all registered handlers for that action type.
   * Emits an 'ACTION_DISPATCHED' event through the EventBus.
   * @param action The action object to dispatch.
   */
  async dispatch(action: Action): Promise<void> {
    console.log(`[ActionController] Dispatching action: ${action.type}`, action.payload);
    this.eventBus.emit({ type: 'ACTION_DISPATCHED', payload: action, timestamp: new Date() });

    const handlersForType = this.handlers.get(action.type);
    if (handlersForType) {
      const promises: (Promise<void> | void)[] = [];
      for (const handler of handlersForType) {
        try {
          promises.push(handler(action));
        } catch (error) {
          console.error(`[ActionController] Error in handler for action ${action.type}:`, error);
          this.eventBus.emit({
            type: 'ACTION_HANDLER_ERROR',
            payload: { action, error: error instanceof Error ? error.message : String(error) },
            timestamp: new Date()
          });
        }
      }
      await Promise.all(promises); // Wait for all async handlers to complete
    } else {
      console.warn(`[ActionController] No handlers registered for action type: ${action.type}`);
    }
  }
}
