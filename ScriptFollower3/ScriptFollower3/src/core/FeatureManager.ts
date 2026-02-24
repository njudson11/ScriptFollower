/**
 * Feature Manager for registering and managing feature plugins
 */

import { FeaturePlugin, LineType, KeyBinding } from '@/types/core'
import { EventBus, EVENT_TYPES } from '@/core/EventBus'
import { ActionController } from './ActionController'
import { Component } from 'vue'

export class FeatureManager {
  private features: Map<string, FeaturePlugin> = new Map()
  private eventBus: EventBus
  private actionController: ActionController // Added ActionController dependency
  private lineRenderers: Map<LineType, Map<string, Component>> = new Map()
  // Map to store unregister functions for keybindings, keyed by featureId
  private registeredKeybindingUnregisters: Map<string, Array<() => void>> = new Map()

  constructor(eventBus: EventBus, actionController: ActionController) { // Updated constructor
    this.eventBus = eventBus
    this.actionController = actionController // Initialize ActionController
  }

  /**
   * Register a feature plugin
   */
  async registerFeature(feature: FeaturePlugin): Promise<void> {
    if (this.features.has(feature.id)) {
      throw new Error(`Feature ${feature.id} is already registered`)
    }

    try {
      await feature.init()
      this.features.set(feature.id, feature)

      // Register keybindings if the feature provides them
      if (feature.getKeybindings) {
        const keybindings = feature.getKeybindings()
        const unregisters: Array<() => void> = []
        keybindings.forEach(kb => {
          // The ActionController will handle the actual keydown listening and dispatching
          // For now, we'll store a placeholder for unregistering (actual unregistering logic for keybindings
          // will be implemented in a dedicated KeybindingFeature that interacts with ActionController)
          // For now, this just ensures the FeatureManager is aware of keybindings a feature *wants* to provide.
          // The actual registration with a global key listener will be handled by a KeybindingFeature.
          // This part of FeatureManager is more about knowing *what* keybindings a feature declares.
          // It's a bit of a placeholder until the KeybindingFeature is fully implemented.
          // For now, just register the actions with the ActionController directly if that makes sense.

          // Simplified approach: Features will just declare their keybindings, and a separate KeybindingFeature
          // will pick these up from FeatureManager and register them globally with ActionController.
          // So, this registerFeature does NOT directly register with ActionController.
          // It just makes the Keybindings available.
          
          // Re-evaluation: The current design of ActionController.ts is for *action* registration, not keybinding registration.
          // A KeybindingFeature will query FeatureManager for *all* registered keybindings from *all* features,
          // then register them with a global key listener, and *then* dispatch actions through ActionController.
          // So, FeatureManager itself just stores what keybindings a feature exposes.
          // No direct ActionController interaction from FeatureManager on keybindings yet.
        })
        if (unregisters.length > 0) {
          this.registeredKeybindingUnregisters.set(feature.id, unregisters)
        }
      }

      this.eventBus.emit({
        type: EVENT_TYPES.FEATURE_INITIALIZED,
        payload: { featureId: feature.id, featureName: feature.name },
        timestamp: new Date()
      })
    } catch (error) {
      this.eventBus.emit({
        type: EVENT_TYPES.FEATURE_ERROR,
        payload: {
          featureId: feature.id,
          error: error instanceof Error ? error.message : String(error)
        },
        timestamp: new Date()
      })
      throw error
    }
  }

  /**
   * Unregister a feature plugin
   */
  async unregisterFeature(featureId: string): Promise<void> {
    const feature = this.features.get(featureId)
    if (!feature) {
      throw new Error(`Feature ${featureId} is not registered`)
    }

    try {
      await feature.destroy()
      this.features.delete(featureId)

      // Call unregister functions for any keybindings registered by this feature
      if (this.registeredKeybindingUnregisters.has(featureId)) {
        this.registeredKeybindingUnregisters.get(featureId)?.forEach(unregister => unregister())
        this.registeredKeybindingUnregisters.delete(featureId)
      }

      this.eventBus.emit({
        type: EVENT_TYPES.FEATURE_DESTROYED,
        payload: { featureId },
        timestamp: new Date()
      })
    } catch (error) {
      this.eventBus.emit({
        type: EVENT_TYPES.FEATURE_ERROR,
        payload: {
          featureId,
          error: error instanceof Error ? error.message : String(error)
        },
        timestamp: new Date()
      })
      throw error
    }
  }

  /**
   * Get a feature by ID
   */
  getFeature(featureId: string): FeaturePlugin | undefined {
    return this.features.get(featureId)
  }

  /**
   * Get all registered features
   */
  getAllFeatures(): FeaturePlugin[] {
    return Array.from(this.features.values())
  }

  /**
   * Check if a feature is registered
   */
  hasFeature(featureId: string): boolean {
    return this.features.has(featureId)
  }

  /**
   * Get all keybindings declared by all registered features.
   */
  getAllKeybindings(): KeyBinding[] {
    const allKeybindings: KeyBinding[] = []
    this.features.forEach(feature => {
      if (feature.getKeybindings) {
        allKeybindings.push(...feature.getKeybindings())
      }
    })
    return allKeybindings
  }

  /**
   * Register a custom Vue component for rendering a specific line type and view.
   * @param lineType The type of the line to render.
   * @param component The Vue component to use for rendering.
   * @param view The name of the view (e.g., 'default', 'sidebar'). Defaults to 'default'.
   */
  registerLineRenderer(lineType: LineType, component: Component, view: string = 'default'): void {
    if (!this.lineRenderers.has(lineType)) {
      this.lineRenderers.set(lineType, new Map<string, Component>())
    }

    const viewMap = this.lineRenderers.get(lineType)!
    if (viewMap.has(view)) {
      console.warn(
        `A custom renderer for LineType ${lineType} and view '${view}' is already registered. Overwriting.`
      )
    }
    viewMap.set(view, component)
  }

  /**
   * Get the custom Vue component registered for a specific line type and view.
   * If the specified view is not found, it falls back to the 'default' view.
   * Returns undefined if no renderer is registered for the given line type (neither for the specific view nor for 'default').
   * @param lineType The type of the line.
   * @param view The desired view. Defaults to 'default'.
   */
  getLineRenderer(lineType: LineType, view: string = 'default'): Component | undefined {
    const viewMap = this.lineRenderers.get(lineType)
    if (!viewMap) {
      return undefined
    }

    // Try to get the specific view, otherwise fall back to the default view.
    return viewMap.get(view) || viewMap.get('default')
  }
}
