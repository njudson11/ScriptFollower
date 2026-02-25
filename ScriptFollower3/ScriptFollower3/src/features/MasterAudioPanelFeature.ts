import { FeaturePlugin, KeyBinding, Annotation, HighlightTypeRegistry } from '@/types/core';
import MasterAudioPanel from '@/components/MasterAudioPanel.vue';
import { FeatureManager } from '@/core/FeatureManager';

export class MasterAudioPanelFeature implements FeaturePlugin {
  readonly id = 'master-audio-panel-feature';
  readonly name = 'Master Audio Panel';
  readonly version = '1.0.0';
  readonly description = 'Provides a comprehensive master audio control panel for the application.';

  constructor(private featureManager: FeatureManager) {}

  async init(): Promise<void> {
    // Register the UI component for the right panel
    this.featureManager.registerLineRenderer('MASTER_AUDIO_PANEL' as any, MasterAudioPanel, 'right-panel');
    console.log('MasterAudioPanelFeature initialized');
  }

  async destroy(): Promise<void> {
    console.log('MasterAudioPanelFeature destroyed');
  }

  // Not needed for this POC but required by interface if I don't make them optional
  getKeybindings(): KeyBinding[] { return []; }
  getAnnotations(): Annotation[] { return []; }
  registerHighlightTypes(registry: HighlightTypeRegistry): void {}
}
