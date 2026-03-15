import { FeaturePlugin, LineType, SoundCue, Annotation, KeyBinding, EndBehaviour } from '@/types/core'
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

  private boundHandlePlaySound: any;
  private boundHandleStopSound: any;
  private boundHandleTogglePlaySound: any;

  private managedPlayerIds: Set<string> = new Set()
  
  // Track loop counts for players currently playing
  private playerLoopCounts: Map<string, number> = new Map()

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

    this.boundHandlePlaySound = this.handlePlaySound.bind(this);
    this.boundHandleStopSound = this.handleStopSound.bind(this);
    this.boundHandleTogglePlaySound = this.handleTogglePlaySound.bind(this);
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
        description: 'Stereo pan (-1 to 1, or left/centre/right)',
        type: 'string',
        defaultValue: AppConfig.audio.defaultPan,
        parseValue: (val) => {
          const lowerVal = val.toLowerCase();
          if (['left', 'centre', 'right'].includes(lowerVal)) {
            return lowerVal;
          }
          const num = parseFloat(val);
          return isNaN(num) ? lowerVal : num;
        },
        validateValue: (val) => {
          if (typeof val === 'string') {
            return ['left', 'centre', 'right'].includes(val);
          }
          if (typeof val === 'number') {
            return val >= -1 && val <= 1;
          }
          return false;
        }
      },
      {
        name: 'pan-start',
        description: 'Stereo pan start (-1 to 1)',
        type: 'number',
        defaultValue: 0,
        constraints: { min: -1, max: 1 },
        parseValue: (val) => parseFloat(val),
        validateValue: (val) => val >= -1 && val <= 1
      },
      {
        name: 'pan-end',
        description: 'Stereo pan end (-1 to 1)',
        type: 'number',
        defaultValue: 0,
        constraints: { min: -1, max: 1 },
        parseValue: (val) => parseFloat(val),
        validateValue: (val) => val >= -1 && val <= 1
      },
      {
        name: 'chan',
        description: 'Virtual audio channel ID (e.g., "A", "B")',
        type: 'string',
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
        id: 'sound-play-pause',
        featureId: this.id,
        keys: ['space'],
        modifiers: {},
        actionType: ACTION_TYPES.TOGGLE_PLAY_SOUND_CUE,
        isActive: (context) => {
          if (!context.hasDocument || !context.currentLineId) return false;
          const line = this.appStore.getLineById(context.currentLineId);
          return line?.lineType === LineType.SOUND_CUE && (!!line.metadata.sound || !!line.annotation);
        },
      },
    ];
  }

  async init(): Promise<void> {
    this.annotationManager.registerFeatureAnnotations(this.id, this.getAnnotations())
    this.featureManager.registerLineRenderer(LineType.SOUND_CUE, SoundCueLine, 'default')
    this.featureManager.registerLineRenderer(LineType.SOUND_CUE, markRaw(SoundCuePanel), 'right-panel')

    this.unregisterActions.push(
      this.actionController.registerHandler(ACTION_TYPES.PLAY_SOUND_CUE, this.boundHandlePlaySound),
      this.actionController.registerHandler(ACTION_TYPES.STOP_SOUND_CUE, this.boundHandleStopSound),
      this.actionController.registerHandler(ACTION_TYPES.TOGGLE_PLAY_SOUND_CUE, this.boundHandleTogglePlaySound)
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

    const cleanupDocLoaded = this.eventBus.subscribe(EVENT_TYPES.DOCUMENT_LOADED, this.handleDocumentLoaded.bind(this));
    this.unregisterEvents.push(cleanupDocLoaded);

    console.log('[Sound Feature] Initialized')
  }

  private async handleDocumentLoaded(): Promise<void> {
    const lines = this.appStore.getLines();
    const soundCueSubTypes = new Set<string>();
    
    lines.forEach(line => {
      if (line.lineType === LineType.SOUND_CUE && line.lineSubType) {
        soundCueSubTypes.add(line.lineSubType);
      }
    });

    const currentChannels = [...this.appStore.state.virtualChannels];
    currentChannels.forEach(ch => {
        if (ch.id !== AppConfig.audio.baseChannelId) {
            this.appStore.removeVirtualChannel(ch.id);
        }
    });

    if (soundCueSubTypes.size === 0) {
        this.appStore.updateVirtualChannel(AppConfig.audio.baseChannelId, { name: `Channel ${AppConfig.audio.baseChannelId}` });
    } else {
        soundCueSubTypes.forEach(subType => {
            this.appStore.addVirtualChannel({
                id: subType,
                name: `Channel ${subType}`,
                volume: AppConfig.audio.defaultChannelVolume,
                isMuted: false,
                outputDeviceId: 'default'
            });
        });
    }
  }

  async destroy(): Promise<void> {
    this.unregisterActions.forEach(unreg => unreg())
    this.unregisterEvents.forEach(unreg => unreg())
    this.managedPlayerIds.clear()
    this.audioPlaybackManager.stopAll()
    this.playerLoopCounts.clear()
  }

  private managePreloading(activeLineId: string): void {
    const lines = this.appStore.getLines()
    const currentIndex = this.appStore.getLineIndex(activeLineId)
    if (currentIndex === -1) return

    const ahead = AppConfig.audio.preloadCuesAhead
    const behind = AppConfig.audio.preloadCuesBehind

    const startIdx = Math.max(0, currentIndex - behind)
    const endIdx = Math.min(lines.length - 1, currentIndex + ahead)

    console.log(`[Sound Feature] Preloading focused on line ${currentIndex} (${activeLineId}). Window: ${startIdx}-${endIdx}`);

    const cuesInWindow = new Map<string, { cue: SoundCue, channelId: string }>()
    
    for (let i = startIdx; i <= endIdx; i++) {
      const line = lines[i]
      if (line.lineType === LineType.SOUND_CUE && line.metadata.sound) {
        const cue = line.metadata.sound as SoundCue
        const channelId = this.appStore.resolveChannelId(line, this.annotationManager);
        cuesInWindow.set(cue.id, { cue, channelId })
      }
    }

    const activePlayerIds = new Set(this.audioPlaybackManager.getCurrentlyPlayingPlayers().map(p => p.id));

    // Identify players to unload: those that are managed but NO LONGER in the window AND NOT currently playing.
    const idsToUnload: string[] = []
    this.managedPlayerIds.forEach(id => {
      if (!cuesInWindow.has(id) && !activePlayerIds.has(id)) {
        idsToUnload.push(id)
      }
    })

    if (idsToUnload.length > 0) {
      console.log(`[Sound Feature] Unloading ${idsToUnload.length} cues:`, idsToUnload);
      this.audioPlaybackManager.destroyPlayers(idsToUnload)
      idsToUnload.forEach(id => this.managedPlayerIds.delete(id))
    }

    // Load or ensure loaded all cues in the current window
    cuesInWindow.forEach((info, id) => {
      const player = this.audioPlaybackManager.getPlayer(id, info.cue.url, info.channelId)
      this.managedPlayerIds.add(id)
      if (!player.isLoaded && player.loadStatus !== 'loading' && player.loadStatus !== 'decoding') {
        console.log(`[Sound Feature] Loading cue ${id} into channel ${info.channelId}`);
        player.load().catch(err => console.error(`[Sound Feature] Failed to preload cue ${id}:`, err))
      }
    })
  }

  private executeStopAction(lineId: string, stopValue: string): void {
    if (stopValue === 'all') {
      this.audioPlaybackManager.stopAll();
    } else if (stopValue === 'previous') {
      const lines = this.appStore.getLines();
      const currentIndex = this.appStore.getLineIndex(lineId);
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

      // If there's no cue, we've still executed the stop action (if any)
      if (!cue) return; 

      const channelId = this.appStore.resolveChannelId(line, this.annotationManager);
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
      let endBehaviour: EndBehaviour = cue.endBehaviour || 'none';
      let loopCount = cue.loopCount !== undefined ? cue.loopCount : 0;
      let jumpRef = cue.jumpRef;

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

        const eb = this.annotationManager.getValue(line.annotation, 'end-behaviour');
        if (eb !== undefined) endBehaviour = eb as EndBehaviour;

        const lc = this.annotationManager.getValue(line.annotation, 'loop-count');
        if (lc !== undefined) loopCount = lc;

        const jr = this.annotationManager.getValue(line.annotation, 'jump-ref');
        if (jr !== undefined) jumpRef = jr;
      }

      player.volume = (volume || (AppConfig.audio.defaultVolume * 100)) / 100
      
      let pStart = cue.panStart;
      let pEnd = cue.panEnd;

      if (line.annotation) {
        const ps = this.annotationManager.getValue(line.annotation, 'pan-start');
        if (ps !== undefined) pStart = ps;
        
        const pe = this.annotationManager.getValue(line.annotation, 'pan-end');
        if (pe !== undefined) pEnd = pe;
      }

      if (overridePan !== undefined) {
        player.balance = overridePan;
      } else {
        if (typeof pan === 'number') {
          player.balance = pan;
        } else {
          player.balance = pan === 'left' ? -1 : pan === 'right' ? 1 : 0;
        }
      }

      // Clear any existing loop count tracking for this player
      this.playerLoopCounts.delete(player.id);

      // Set up onEnded callback for behaviours
      player.onEnded(() => {
        this.handleEndBehaviour(player, {
          endBehaviour,
          loopCount,
          jumpRef,
          startTimeSeconds: start,
          endTimeSeconds: end,
          fadeInDurationMs: fadeIn,
          fadeOutDurationMs: fadeOut,
          panStart: pStart,
          panEnd: pEnd
        }, lineId);
      });

      await player.play({
        startTimeSeconds: start,
        endTimeSeconds: end,
        fadeInDurationMs: fadeIn,
        fadeOutDurationMs: fadeOut,
        panStart: pStart,
        panEnd: pEnd
      });
    } catch (error) {
      console.error(`[Sound Feature] Failed to play cue ${cue.id}:`, error)
    }
  }

  private async handleEndBehaviour(player: any, options: any, currentLineId: string) {
    const { endBehaviour, loopCount, jumpRef } = options;

    if (endBehaviour === 'none') return;

    if (endBehaviour === 'loop') {
      let currentLoops = this.playerLoopCounts.get(player.id) || 0;
      
      // loopCount 0 means indefinite
      if (loopCount === 0 || currentLoops < loopCount) {
        this.playerLoopCounts.set(player.id, currentLoops + 1);
        
        // Re-play the sound with same options
        await player.play({
          startTimeSeconds: options.startTimeSeconds,
          endTimeSeconds: options.endTimeSeconds,
          fadeInDurationMs: options.fadeInDurationMs,
          fadeOutDurationMs: options.fadeOutDurationMs,
          panStart: options.panStart,
          panEnd: options.panEnd
        });
      } else {
        this.playerLoopCounts.delete(player.id);
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
        const nextCue = lines.slice(currentIndex + 1).find(l => l.lineType === LineType.SOUND_CUE);
        if (nextCue) {
          this.actionController.dispatch({
            type: ACTION_TYPES.SELECT_LINE,
            payload: { lineId: nextCue.id }
          });
        }
      }
    } else if (endBehaviour === 'jump-to' && jumpRef) {
      const lines = this.appStore.getLines();
      const targetCue = lines.find(l => l.lineType === LineType.SOUND_CUE && l.metadata.soundRef === jumpRef);
      if (targetCue) {
        this.actionController.dispatch({
          type: ACTION_TYPES.SELECT_LINE,
          payload: { lineId: targetCue.id }
        });
      }
    }
  }

  private handleTogglePlaySound(action: any): void {
    const lineId = action.payload?.lineId;
    if (!lineId) return;

    const line = this.appStore.getLineById(lineId);
    if (!line || line.lineType !== LineType.SOUND_CUE) return;

    // Check if we have either a sound cue OR an annotation that might need triggering
    if (!line.metadata.sound && !line.annotation) return;

    const cue = line.metadata.sound as SoundCue | undefined;
    
    if (cue) {
      const channelId = this.appStore.resolveChannelId(line, this.annotationManager);
      const player = this.audioPlaybackManager.getPlayer(cue.id, cue.url, channelId);

      if (player.isPlaying) {
        player.stop();
        return;
      }
    }

    // Dispatch play for annotations or sound
    this.actionController.dispatch({
      type: ACTION_TYPES.PLAY_SOUND_CUE,
      payload: { cue: cue, lineId: lineId }
    });
  }

  private handleStopSound(action: any): void {
    const { cueId } = action.payload;
    this.audioPlaybackManager.stopCues([cueId])
    this.playerLoopCounts.delete(cueId)
  }
}
