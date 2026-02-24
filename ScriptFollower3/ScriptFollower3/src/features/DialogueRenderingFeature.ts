import type { FeaturePlugin } from '@/types/core'
import { LineType } from '@/types/core'
import type { FeatureManager } from '@/core/FeatureManager'
import DialogueLine from '@/components/DialogueLine.vue'

export class DialogueRenderingFeature implements FeaturePlugin {
  readonly id = 'dialogue-renderer-feature'
  readonly name = 'Dialogue Line Renderer'
  readonly version = '1.0.0'
  readonly description = 'Provides custom rendering for dialogue lines, separating character name and dialogue text.'

  private featureManager: FeatureManager

  constructor(featureManager: FeatureManager) {
    this.featureManager = featureManager
  }

  async init(): Promise<void> {
    console.log(`[${this.name}] Initializing...`)
    this.featureManager.registerLineRenderer(LineType.DIALOGUE, DialogueLine, 'default')
    console.log(`[${this.name}] Registered custom renderer for LineType.DIALOGUE`)
  }

  async destroy(): Promise<void> {
    console.log(`[${this.name}] Destroying...`)
    // No specific unregistration for now, as FeatureManager will handle potential overwrites
  }
}
