import { FeaturePlugin, Annotation, EndBehaviour, LineType, KeyBinding } from '@/types/core'
import type { FeatureManager } from '@/core/FeatureManager'
import type { ActionController } from '@/core/ActionController'
import type { AppStore } from '@/store/AppStore'
import type { AnnotationManager } from '@/core/AnnotationManager'
import { EVENT_TYPES } from '@/core/EventBus'
import type { EventBus } from '@/core/EventBus'
import { ACTION_TYPES } from '@/types/actions'
import { markRaw } from 'vue'
import BaseCuePanel from '@/components/BaseCuePanel.vue'
import type { LineSelectionManager } from '@/core/LineSelectionManager'

/**
 * Base feature providing shared cue behaviours: stop actions and end-of-playback behaviours.
 * This can be used as a standalone feature or inherited by specific cue features.
 */
export class BaseCueFeature implements FeaturePlugin {
  readonly id: string = 'base-cue-feature'
  readonly name: string = 'Base Cue Behaviours'
  readonly version: string = '1.2.0'
  readonly description: string = 'Provides shared stop and end behaviour logic for all cue types.'

  protected featureManager: FeatureManager
  protected actionController: ActionController
  protected appStore: AppStore
  protected annotationManager: AnnotationManager
  protected eventBus: EventBus
  protected selectionManager: LineSelectionManager

  constructor(
    featureManager: FeatureManager,
    actionController: ActionController,
    appStore: AppStore,
    annotationManager: AnnotationManager,
    eventBus: EventBus,
    selectionManager: LineSelectionManager
  ) {
    this.featureManager = featureManager
    this.actionController = actionController
    this.appStore = appStore
    this.annotationManager = annotationManager
    this.eventBus = eventBus
    this.selectionManager = selectionManager
  }

  getAnnotations(): Annotation[] {
    return [
      {
        name: 'stop',
        description: 'Stop behaviour: "previous", "all", or a comma-separated list of SoundRefs e.g., "[0001,0002]"',
        type: 'string',
        parseValue: (val) => val.trim(),
        validateValue: (val) => {
          if (val === 'all' || val === 'previous') return true;
          return /^\[\s*\w+(\s*,\s*\w+)*\s*\]$/.test(val);
        }
      },
      {
        name: 'end-behaviour',
        description: 'Behaviour when playback ends: "none", "loop", "next-line", "next-cue", "jump-to"',
        type: 'enum',
        defaultValue: 'none',
        constraints: { enum: ['none', 'loop', 'next-line', 'next-cue', 'jump-to'] },
        parseValue: (val) => val.trim().toLowerCase(),
        validateValue: (val) => ['none', 'loop', 'next-line', 'next-cue', 'jump-to'].includes(val)
      },
      {
        name: 'loop-count',
        description: 'Number of times to loop (0 for indefinite)',
        type: 'number',
        defaultValue: 0,
        constraints: { min: 0 },
        parseValue: (val) => parseInt(val, 10),
        validateValue: (val) => !isNaN(val) && val >= 0
      },
      {
        name: 'jump-ref',
        description: 'Cue reference to jump to when playback ends',
        type: 'string',
        parseValue: (val) => val.trim(),
        validateValue: (val) => val.length > 0
      }
    ]
  }

  getKeybindings(): KeyBinding[] {
    return [
      {
        id: 'trigger-line-action',
        featureId: this.id,
        keys: ['space'],
        modifiers: {},
        actionType: ACTION_TYPES.TRIGGER_LINE_ACTION,
        isActive: (context) => {
          if (!context.hasDocument || !context.currentLineId) return false;
          const line = this.appStore.getLineById(context.currentLineId);
          // Only handle if it's NOT a sound cue (sound feature handles its own space bar)
          // or if the sound feature is not registered.
          return !!line && line.lineType !== LineType.SOUND_CUE && this.hasAction(line.id);
        },
      },
    ];
  }

  async init(): Promise<void> {
    this.annotationManager.registerFeatureAnnotations(this.id, this.getAnnotations())
    
    // Register BaseCuePanel for general line types that can have stop behaviours
    this.featureManager.registerLineRenderer(LineType.DIALOGUE, markRaw(BaseCuePanel), 'right-panel')
    this.featureManager.registerLineRenderer(LineType.STAGE_DIRECTION, markRaw(BaseCuePanel), 'right-panel')

    // Register handler for explicit trigger action
    this.actionController.registerHandler(ACTION_TYPES.TRIGGER_LINE_ACTION, this.handleTriggerAction.bind(this));
  }

  async destroy(): Promise<void> {}

  /**
   * Checks if a line has any actionable annotations managed by this feature.
   */
  public hasAction(lineId: string): boolean {
    const line = this.appStore.getLineById(lineId);
    if (!line || !line.annotation) return false;

    const stopValue = this.annotationManager.getValue(line.annotation, 'stop');
    return !!stopValue;
  }

  /**
   * Explicitly triggers the actions on a line.
   */
  protected handleTriggerAction(action: any): void {
    // If no lineId in payload, try to use currently selected line
    const targetLineId = action.payload?.lineId || this.selectionManager.getCurrentLine();
    
    if (targetLineId) {
      this.processStopAnnotation(targetLineId);
    }
  }

  /**
   * Shared logic to process the 'stop' annotation on a line.
   */
  protected processStopAnnotation(lineId: string): void {
    const line = this.appStore.getLineById(lineId);
    if (!line || !line.annotation) return;

    const stopValue = this.annotationManager.getValue(line.annotation, 'stop');
    if (stopValue) {
      this.executeStopAction(lineId, stopValue);
    }
  }

  /**
   * Executes the actual stop logic. 
   */
  protected executeStopAction(lineId: string, stopValue: string): void {
    this.actionController.dispatch({
      type: ACTION_TYPES.STOP_SOUND_CUE, 
      payload: { 
        mode: stopValue,
        sourceLineId: lineId
      }
    });
  }

  /**
   * Shared logic to process end behaviours.
   */
  protected async handleEndBehaviour(options: {
    endBehaviour: EndBehaviour,
    loopCount: number,
    jumpRef?: string,
    currentLineId: string,
    playerId: string,
    loopTracker: Map<string, number>,
    onRestart: () => Promise<void>
  }) {
    const { endBehaviour, loopCount, jumpRef, currentLineId, playerId, loopTracker, onRestart } = options;

    if (endBehaviour === 'none') return;

    if (endBehaviour === 'loop') {
      let currentLoops = loopTracker.get(playerId) || 0;
      if (loopCount === 0 || currentLoops < loopCount) {
        loopTracker.set(playerId, currentLoops + 1);
        await onRestart();
      } else {
        loopTracker.delete(playerId);
      }
    } else if (endBehaviour === 'next-line') {
      const lines = this.appStore.getLines();
      const currentIndex = this.appStore.getLineIndex(currentLineId);
      if (currentIndex !== -1 && currentIndex < lines.length - 1) {
        this.actionController.dispatch({
          type: ACTION_TYPES.SELECT_LINE,
          payload: { lineId: lines[currentIndex + 1].id }
        });
      }
    } else if (endBehaviour === 'next-cue') {
      const lines = this.appStore.getLines();
      const currentIndex = this.appStore.getLineIndex(currentLineId);
      if (currentIndex !== -1) {
        const currentLine = this.appStore.getLineById(currentLineId);
        if (currentLine) {
          const nextCue = lines.slice(currentIndex + 1).find(l => l.lineType === currentLine.lineType);
          if (nextCue) {
            this.actionController.dispatch({
              type: ACTION_TYPES.SELECT_LINE,
              payload: { lineId: nextCue.id }
            });
          }
        }
      }
    } else if (endBehaviour === 'jump-to' && jumpRef) {
      const lines = this.appStore.getLines();
      const targetCue = lines.find(l => l.metadata.soundRef === jumpRef);
      if (targetCue) {
        this.actionController.dispatch({
          type: ACTION_TYPES.SELECT_LINE,
          payload: { lineId: targetCue.id }
        });
      }
    }
  }
}
