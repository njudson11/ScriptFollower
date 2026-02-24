import { FeaturePlugin, KeyBinding, Annotation, HighlightTypeRegistry } from '@/types/core';
import AudioTestPanel from '@/components/AudioTestPanel.vue';
import { FeatureManager } from '@/core/FeatureManager';

export class AudioTestFeature implements FeaturePlugin {
  readonly id = 'audio-test-feature';
  readonly name = 'Audio Test';
  readonly version = '1.0.0';
  readonly description = 'A feature to test the AudioPlayback component.';

  constructor(private featureManager: FeatureManager) {}

  async init(): Promise<void> {
    // Register the UI component for the right panel
    this.featureManager.registerLineRenderer('AUDIO_TEST' as any, AudioTestPanel, 'right-panel');
    console.log('AudioTestFeature initialized');
  }

  async destroy(): Promise<void> {
    console.log('AudioTestFeature destroyed');
  }

  // Not needed for this POC but required by interface if I don't make them optional
  getKeybindings(): KeyBinding[] { return []; }
  getAnnotations(): Annotation[] { return []; }
  registerHighlightTypes(registry: HighlightTypeRegistry): void {}
}
