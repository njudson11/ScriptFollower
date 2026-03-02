import { FeaturePlugin, KeyBinding, HighlightTypeRegistry, LineType } from '@/types/core';
import { IVoiceRecognitionEngine, VoiceRecognitionResult } from '@/types/voice';
import { AppStore } from '@/store/AppStore';
import { EventBus, EVENT_TYPES } from '@/core/EventBus';
import { ActionController } from '@/core/ActionController';
import { ACTION_TYPES } from '@/types/actions';
import { LineSelectionManager } from '@/core/LineSelectionManager';
import { TextMatcher } from '@/core/TextMatcher';
import { AppConfig } from '@/config/AppConfig';

/**
 * Feature plugin for voice recognition and script following.
 */
export class VoiceRecognitionFeature implements FeaturePlugin {
  public readonly id = 'voice-recognition';
  public readonly name = 'Voice Recognition';
  public readonly version = '1.0.0';
  public readonly description = 'Hands-free script following via speech-to-text matching.';

  private engine: IVoiceRecognitionEngine;
  private textMatcher: TextMatcher;
  private currentTranscript: string = '';

  constructor(
    private appStore: AppStore,
    private eventBus: EventBus,
    private actionController: ActionController,
    private selectionManager: LineSelectionManager,
    engine: IVoiceRecognitionEngine
  ) {
    this.engine = engine;
    this.textMatcher = new TextMatcher();
  }

  public async init(): Promise<void> {
    this.engine.onResult(this.handleResult.bind(this));
    this.engine.onError((err) => {
      console.error('VoiceRecognitionFeature: Engine Error', err);
      this.appStore.setError(`Voice Error: ${err.message}`);
    });
    this.engine.onStatusChange((status) => {
      this.eventBus.emit({
        type: 'voice:statusChanged',
        payload: { status },
        timestamp: new Date()
      });
    });

    // Subscribe to voice-related actions
    this.eventBus.subscribe('ACTION_DISPATCHED', (event) => {
      const { type } = event.payload;
      if (type === 'TOGGLE_VOICE') {
        this.toggleVoice();
      } else if (type === 'START_VOICE') {
        this.startVoice();
      } else if (type === 'STOP_VOICE') {
        this.stopVoice();
      }
    });
  }

  public async destroy(): Promise<void> {
    await this.stopVoice();
  }

  public getKeybindings(): KeyBinding[] {
    return [
      {
        id: 'toggle-voice',
        featureId: this.id,
        keys: ['v'],
        modifiers: { ctrl: true },
        actionType: 'TOGGLE_VOICE' as any,
      }
    ];
  }

  public registerHighlightTypes(registry: HighlightTypeRegistry): void {
    // High confidence match
    registry.register('voice:matched', 65, {
      backgroundColor: 'rgba(76, 175, 80, 0.15)', // Light Green
      borderColor: '#4caf50',
      borderWidth: '2px'
    });

    // Partial or low confidence
    registry.register('voice:partial', 60, {
      backgroundColor: 'rgba(255, 235, 59, 0.15)', // Light Yellow
      borderColor: '#fbc02d',
      borderWidth: '1px'
    });

    // Active listening window
    registry.register('voice:listening', 55, {
      borderColor: 'rgba(33, 150, 243, 0.3)', // Light Blue border
      borderWidth: '1px'
    });
  }

  private async toggleVoice(): Promise<void> {
    if (this.engine.isRunning) {
      await this.stopVoice();
    } else {
      await this.startVoice();
    }
  }

  private async startVoice(): Promise<void> {
    try {
      await this.engine.start();
      this.currentTranscript = '';
      this.appStore.setLastVoiceTranscript(null);
    } catch (err) {
      console.error('Failed to start voice engine', err);
    }
  }

  private async stopVoice(): Promise<void> {
    await this.engine.stop();
    this.appStore.setLastVoiceTranscript(null);
  }

  private handleResult(result: VoiceRecognitionResult): void {
    // For rolling streams, we keep the last segment
    this.currentTranscript = result.transcript;
    this.appStore.setLastVoiceTranscript(this.currentTranscript);

    // Filter for DIALOGUE lines and map to matchable objects using metadata.dialogue
    const allLines = this.appStore.getLines();
    const dialogueLines = allLines
      .filter(line => line.lineType === LineType.DIALOGUE && line.metadata?.dialogue)
      .map(line => ({
        id: line.id,
        text: line.metadata.dialogue as string
      }));

    if (dialogueLines.length === 0) return;

    const currentLineId = this.selectionManager.getCurrentLine();
    
    // Find the relative index within the filtered dialogue lines
    let activeMatchIndex = 0;
    if (currentLineId) {
      const idx = dialogueLines.findIndex(l => l.id === currentLineId);
      if (idx !== -1) activeMatchIndex = idx;
    }

    const match = this.textMatcher.findClosestLine(dialogueLines, this.currentTranscript, {
      ...AppConfig.voice.textMatcher,
      activeIndex: activeMatchIndex
    });

    if (match.index !== -1) {
      const matchedLineId = dialogueLines[match.index].id;
      
      // Visual feedback with confidence score
      this.selectionManager.addHighlight(matchedLineId, 'voice:matched', { score: match.score });
      
      // Auto-expire highlight based on config
      setTimeout(() => {
        this.selectionManager.removeHighlight(matchedLineId, 'voice:matched');
      }, AppConfig.voice.matchLingerMs);

      // Check runtime focus setting from store
      const setFocus = this.appStore.state.voiceSettings.setFocusOnMatch;
      
      if (setFocus && matchedLineId !== currentLineId) {
        this.actionController.dispatch({
          type: ACTION_TYPES.SELECT_LINE as any,
          payload: { lineId: matchedLineId }
        });
        
        // Clear transcript buffer after a successful focus-advancing match
        // to prevent immediate re-matching or "echo" matches
        this.currentTranscript = '';
        this.appStore.setLastVoiceTranscript(null);
      }
    }
  }
}
