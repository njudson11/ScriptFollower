import { FeaturePlugin, LineType, SoundCue, Annotation, KeyBinding } from '@/types/core'
import type { FeatureManager } from '@/core/FeatureManager'
import type { ActionController } from '@/core/ActionController'
import type { AudioPlaybackManager } from '@/core/AudioPlaybackManager'
import type { AppStore } from '@/store/AppStore'
import type { EventBus } from '@/core/EventBus'
import { ACTION_TYPES } from '@/types/actions'
import { EVENT_TYPES } from '@/core/EventBus'
import { AppConfig } from '@/config/AppConfig'
import SoundCueLine from '@/components/SoundCueLine.vue'
import SoundCuePanel from '@/components/SoundCuePanel.vue'
import { markRaw } from 'vue'
import type { AnnotationManager } from '@/core/AnnotationManager'
import type { LineSelectionManager } from '@/core/LineSelectionManager'

/**
 * Feature responsible for managing sound cues and playback.
 */
export class SoundFeature implements FeaturePlugin {
  readonly id = 'sound-feature'
  readonly name = 'Sound Cues'
  readonly version = '1.0.0'
  readonly description = 'Provides playback controls for sound cues within the script.'

  private featureManager: FeatureManager
  private actionController: ActionController
  private audioPlaybackManager: AudioPlaybackManager
  private appStore: AppStore
  private eventBus: EventBus
  private annotationManager: AnnotationManager
  private selectionManager: LineSelectionManager
  private unregisterActions: Array<() => void> = []
  private unregisterEvents: Array<() => void> = []

  // Keep track of which players we've created for pre-loading
  private managedPlayerIds: Set<string> = new Set()

  constructor(
    featureManager: FeatureManager,
    actionController: ActionController,
    audioPlaybackManager: AudioPlaybackManager,
    appStore: AppStore,
    eventBus: EventBus,
    annotationManager: AnnotationManager,
    selectionManager: LineSelectionManager
  ) {
    this.featureManager = featureManager
    this.actionController = actionController
    this.audioPlaybackManager = audioPlaybackManager
    this.appStore = appStore
    this.eventBus = eventBus
    this.annotationManager = annotationManager
    this.selectionManager = selectionManager
  }

  getAnnotations(): Annotation[] {
    return [
      {
        name: 'volume',
        description: 'Sound volume (0-100)',
        type: 'number',
        defaultValue: 100,
        constraints: { min: 0, max: 100 },
        parseValue: (val) => parseFloat(val),
        validateValue: (val) => val >= 0 && val <= 100
      },
      {
        name: 'pan',
        description: 'Stereo pan (-1 to 1, or left/center/right)',
        type: 'string',
        defaultValue: 'center',
        parseValue: (val) => {
          const lowerVal = val.toLowerCase();
          if (['left', 'center', 'right'].includes(lowerVal)) {
            return lowerVal;
          }
          const num = parseFloat(val);
          return isNaN(num) ? lowerVal : num;
        },
        validateValue: (val) => {
          if (typeof val === 'string') {
            return ['left', 'center', 'right'].includes(val);
          }
          if (typeof val === 'number') {
            return val >= -1 && val <= 1;
          }
          return false;
        }
      },
      {
        name: 'chan',
        description: 'Virtual audio channel ID (e.g., "A", "B")',
        type: 'string',
        defaultValue: 'default',
        parseValue: (val) => val.trim(),
        validateValue: (val) => val.length > 0
      },
      {
        name: 'start',
        description: 'Start offset in seconds',
        type: 'number',
        defaultValue: 0,
        constraints: { min: 0 },
        parseValue: (val) => parseFloat(val),
        validateValue: (val) => val >= 0
      },
      {
        name: 'end',
        description: 'End offset in seconds',
        type: 'number',
        defaultValue: 0,
        constraints: { min: 0 },
        parseValue: (val) => parseFloat(val),
        validateValue: (val) => val >= 0
      },
      {
        name: 'fade-in',
        description: 'Fade in duration (milliseconds)',
        type: 'number',
        defaultValue: 0,
        constraints: { min: 0 },
        parseValue: (val) => parseFloat(val),
        validateValue: (val) => val >= 0
      },
      {
        name: 'fade-out',
        description: 'Fade out duration (milliseconds)',
        type: 'number',
        defaultValue: 0,
        constraints: { min: 0 },
        parseValue: (val) => parseFloat(val),
        validateValue: (val) => val >= 0
      },
      {
        name: 'stop',
        description: 'Stop behavior: "previous", "all", or a comma-separated list of SoundRefs e.g., "[0001,0002]"',
        type: 'string',
        parseValue: (val) => val.trim(),
        validateValue: (val) => {
          if (val === 'all' || val === 'previous') return true;
          return /^\[\s*\w+(\s*,\s*\w+)*\s*\]$/.test(val);
        }
      }
    ]
  }

  getKeybindings(): KeyBinding[] {
    return [
      {
        id: 'sound-play-pause',
        featureId: this.id,
        keys: ['space'],
        modifiers: {},
        actionType: ACTION_TYPES.TOGGLE_PLAY_SOUND_CUE,
        isActive: (context) => {
          if (!context.hasDocument || !context.currentLineId) return false;
          const line = this.appStore.getLineById(context.currentLineId);
          return line?.lineType === LineType.SOUND_CUE && !!line?.metadata.sound;
        },
      },
    ];
  }

  async init(): Promise<void> {
    this.annotationManager.registerFeatureAnnotations(this.id, this.getAnnotations())
    this.featureManager.registerLineRenderer(LineType.SOUND_CUE, SoundCueLine, 'default')
    this.featureManager.registerLineRenderer(LineType.SOUND_CUE, markRaw(SoundCuePanel), 'right-panel')

    this.unregisterActions.push(
      this.actionController.registerHandler(ACTION_TYPES.PLAY_SOUND_CUE, this.handlePlaySound.bind(this)),
      this.actionController.registerHandler(ACTION_TYPES.STOP_SOUND_CUE, this.handleStopSound.bind(this)),
      this.actionController.registerHandler(ACTION_TYPES.TOGGLE_PLAY_SOUND_CUE, this.handleTogglePlaySound.bind(this))
    )

    const cleanupSelection = this.eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, (event) => {
      if (event.payload.lineId) {
        this.managePreloading(event.payload.lineId)
      }
    })
    this.unregisterEvents.push(cleanupSelection)

    const cleanupSoundsLoaded = this.eventBus.subscribe(EVENT_TYPES.SOUNDS_LOADED, () => {
      const currentLineId = this.selectionManager.getCurrentLine();
      if (currentLineId) {
        this.managePreloading(currentLineId);
      }
    });
    this.unregisterEvents.push(cleanupSoundsLoaded);

    console.log('[Sound Feature] Initialized')
  }

  async destroy(): Promise<void> {
    this.unregisterActions.forEach(unregister => unregister())
    this.unregisterEvents.forEach(unregister => unregister())
    this.managedPlayerIds.clear()
    this.audioPlaybackManager.stopAll()
  }

  private managePreloading(currentLineId: string): void {
    const lines = this.appStore.getLines()
    const currentIndex = lines.findIndex(l => l.id === currentLineId)
    if (currentIndex === -1) return

    const ahead = AppConfig.audio.preloadCuesAhead
    const behind = AppConfig.audio.preloadCuesBehind

    const startIdx = Math.max(0, currentIndex - behind)
    const endIdx = Math.min(lines.length - 1, currentIndex + ahead)

    const cuesToLoad = new Map<string, SoundCue>()
    
    for (let i = startIdx; i <= endIdx; i++) {
      const line = lines[i]
      if (line.lineType === LineType.SOUND_CUE && line.metadata.sound) {
        const cue = line.metadata.sound as SoundCue
        cuesToLoad.set(cue.id, cue)
      }
    }

    const idsToUnload: string[] = []
    this.managedPlayerIds.forEach(id => {
      if (!cuesToLoad.has(id)) {
        idsToUnload.push(id)
      }
    })

    if (idsToUnload.length > 0) {
      this.audioPlaybackManager.destroyPlayers(idsToUnload)
      idsToUnload.forEach(id => this.managedPlayerIds.delete(id))
    }

    cuesToLoad.forEach((cue, id) => {
      const player = this.audioPlaybackManager.getPlayer(id, cue.url)
      this.managedPlayerIds.add(id)
      if (!player.isLoaded) {
        player.load().catch(err => console.error(`[Sound Feature] Failed to preload cue ${id}:`, err))
      }
    })
  }

  private executeStopAction(lineId: string, stopValue: string): void {
    if (stopValue === 'all') {
      this.audioPlaybackManager.stopAll();
    } else if (stopValue === 'previous') {
      const lines = this.appStore.getLines();
      const currentIndex = lines.findIndex(l => l.id === lineId);
      if (currentIndex > 0) {
        const prevLine = lines[currentIndex - 1];
        const prevCue = prevLine.metadata.sound as SoundCue | undefined;
        if (prevCue) {
          this.audioPlaybackManager.stopCues([prevCue.id]);
        }
      }
    } else if (stopValue.startsWith('[') && stopValue.endsWith(']')) {
      const soundRefs = stopValue.slice(1, -1).split(',').map(s => s.trim());
      if (soundRefs.length > 0) {
        const lines = this.appStore.getLines();
        const cueIdsToStop = lines
          .filter(line => 
            line.metadata.soundRef && 
            soundRefs.includes(line.metadata.soundRef) &&
            line.metadata.sound
          )
          .map(line => (line.metadata.sound as SoundCue).id);
        
        if (cueIdsToStop.length > 0) {
          this.audioPlaybackManager.stopCues(cueIdsToStop);
        }
      }
    }
  }
  
  private async handlePlaySound(action: any): Promise<void> {
    const { cue, lineId, overridePan } = action.payload;
    
    try {
      const line = this.appStore.getLineById(lineId);
      if (!line) return;

      const stopValue = this.annotationManager.getValue(line.annotation, 'stop');
      if (stopValue) {
        this.executeStopAction(lineId, stopValue);
      }

      if (!cue) return; 

      const channelId = this.annotationManager.getValue(line.annotation, 'chan') || 'default';
      const player = this.audioPlaybackManager.getPlayer(cue.id, cue.url, channelId)
      this.managedPlayerIds.add(cue.id)
      
      if (!player.isLoaded) {
        await player.load()
      }

      let volume = cue.volume;
      let pan = cue.pan;
      let start = cue.startOffsetSeconds;
      let end = cue.endOffsetSeconds;
      let fadeIn = cue.fadeIn;
      let fadeOut = cue.fadeOut;

      if (line.annotation) {
        const v = this.annotationManager.getValue(line.annotation, 'volume');
        if (v !== undefined) volume = v;
        
        const p = this.annotationManager.getValue(line.annotation, 'pan');
        if (p !== undefined) pan = p;

        const s = this.annotationManager.getValue(line.annotation, 'start');
        if (s !== undefined) start = s;

        const e = this.annotationManager.getValue(line.annotation, 'end');
        if (e !== undefined) end = e;

        const fi = this.annotationManager.getValue(line.annotation, 'fade-in');
        if (fi !== undefined) fadeIn = fi;

        const fo = this.annotationManager.getValue(line.annotation, 'fade-out');
        if (fo !== undefined) fadeOut = fo;
      }

      player.volume = (volume || 100) / 100
      
      if (overridePan !== undefined) {
        player.balance = overridePan;
      } else {
        if (typeof pan === 'number') {
          player.balance = pan;
        } else {
          player.balance = pan === 'left' ? -1 : pan === 'right' ? 1 : 0;
        }
      }

      await player.play(start, end, fadeIn, fadeOut)
    } catch (error) {
      console.error(`[Sound Feature] Failed to play cue ${cue.id}:`, error)
    }
  }

  private handleTogglePlaySound(action: any): void {
    const lineId = action.payload?.lineId;
    if (!lineId) return;

    const line = this.appStore.getLineById(lineId);
    if (!line || line.lineType !== LineType.SOUND_CUE || !line.metadata.sound) return;

    const cue = line.metadata.sound as SoundCue;
    const player = this.audioPlaybackManager.getPlayer(cue.id, cue.url);

    if (player.isPlaying) {
      player.stop();
    } else {
      this.actionController.dispatch({
        type: ACTION_TYPES.PLAY_SOUND_CUE,
        payload: { cue: cue, lineId: lineId }
      });
    }
  }

  private handleStopSound(action: any): void {
    const { cueId } = action.payload;
    this.audioPlaybackManager.stopCues([cueId])
  }
}
