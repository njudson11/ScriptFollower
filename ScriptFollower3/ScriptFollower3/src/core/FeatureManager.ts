/**
 * Feature Manager for registering and managing feature plugins
 */
import { FeaturePlugin, LineType, KeyBinding } from '@/types/core'
import { EventBus, EVENT_TYPES } from '@/core/EventBus'
import { ActionController } from './ActionController'
import { LineSelectionManager } from './LineSelectionManager'
import { Component } from 'vue'

export class FeatureManager {
  private features: Map<string, FeaturePlugin> = new Map()
  private eventBus: EventBus
  private actionController: ActionController 
  private selectionManager: LineSelectionManager
  private lineRenderers: Map<LineType, Map<string, Component>> = new Map()
  private registeredKeybindingUnregisters: Map<string, Array<() => void>> = new Map()

  constructor(eventBus: EventBus, actionController: ActionController, selectionManager: LineSelectionManager) { 
    this.eventBus = eventBus
    this.actionController = actionController 
    this.selectionManager = selectionManager
  }

  /**
   * Register a feature plugin
   */
  async registerFeature(feature: FeaturePlugin): Promise<void> {
    if (this.features.has(feature.id)) {
      console.warn(`[FeatureManager] Feature ${feature.id} is already registered. Skipping.`);
      return;
    }

    try {
      // Add to map FIRST so that it's tracked during initialisation
      this.features.set(feature.id, feature)
      
      // Initialise the feature
      await feature.init()

      // Register any custom highlight types defined by the feature
      if (feature.registerHighlightTypes) {
        feature.registerHighlightTypes(this.selectionManager.getHighlightRegistry());
      }

      this.eventBus.emit({
        type: EVENT_TYPES.FEATURE_INITIALISED,
        payload: { featureId: feature.id, featureName: feature.name },
        timestamp: new Date()
      })
    } catch (error) {
      // Clean up if init fails
      this.features.delete(feature.id);
      
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
      return; // Silently ignore if not found (good for HMR)
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
   */
  registerLineRenderer(lineType: LineType, component: Component, view: string = 'default'): void {
    if (!this.lineRenderers.has(lineType)) {
      this.lineRenderers.set(lineType, new Map<string, Component>())
    }

    const viewMap = this.lineRenderers.get(lineType)!
    viewMap.set(view, component)
  }

  /**
   * Get the custom Vue component registered for a specific line type and view.
   */
  getLineRenderer(lineType: LineType, view: string = 'default'): Component | undefined {
    const viewMap = this.lineRenderers.get(lineType)
    if (!viewMap) {
      return undefined
    }
    return viewMap.get(view) || viewMap.get('default')
  }
}
