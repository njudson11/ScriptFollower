// src/types/actions.ts

/**
 * Represents a generic action dispatched through the ActionController.
 * Actions are simple objects that describe something that happened,
 * or something that should happen within the application.
 */
export interface Action {
  /**
   * A unique string identifier for the type of action.
   * Recommended format: `DOMAIN_EVENT_NAME` (e.g., `DOCUMENT_LOADED`, `LINE_SELECTED`, `KEYBINDING_TRIGGERED`).
   */
  type: string;
  /**
   * Optional payload carrying any relevant data for the action.
   */
  payload?: any;
}

/**
 * Defines a set of standard action types used throughout the application.
 */
export const ACTION_TYPES = {
  NAVIGATE_NEXT_LINE: 'NAVIGATE_NEXT_LINE',
  NAVIGATE_PREVIOUS_LINE: 'NAVIGATE_PREVIOUS_LINE',
  SELECT_LINE: 'SELECT_LINE',
  // Add other common actions here as needed
  // TOGGLE_FEATURE: 'TOGGLE_FEATURE',
  // OPEN_SETTINGS: 'OPEN_SETTINGS',
  // SAVE_DOCUMENT: 'SAVE_DOCUMENT',
};