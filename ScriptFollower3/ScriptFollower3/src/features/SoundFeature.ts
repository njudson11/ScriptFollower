import { FeaturePlugin, LineType, SoundCue } from '@/types/core'
import type { FeatureManager } from '@/core/FeatureManager'
import type { ActionController } from '@/core/ActionController'
import type { AudioPlaybackManager } from '@/core/AudioPlaybackManager'
import type { AppStore } from '@/store/AppStore'
import type { EventBus } from '@/core/EventBus' // Import EventBus type
import { ACTION_TYPES } from '@/types/actions'
import { EVENT_TYPES } from '@/core/EventBus'
import { AppConfig } from '@/config/AppConfig'
import SoundCueLine from '@/components/SoundCueLine.vue'

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
  private eventBus: EventBus // Add eventBus property
  private unregisterActions: Array<() => void> = []
  private unregisterEvents: Array<() => void> = []

  // Keep track of which players we've created for pre-loading
  private managedPlayerIds: Set<string> = new Set()

  constructor(
    featureManager: FeatureManager,
    actionController: ActionController,
    audioPlaybackManager: AudioPlaybackManager,
    appStore: AppStore,
    eventBus: EventBus // Receive eventBus
  ) {
    this.featureManager = featureManager
    this.actionController = actionController
    this.audioPlaybackManager = audioPlaybackManager
    this.appStore = appStore
    this.eventBus = eventBus
  }

  async init(): Promise<void> {
    // Register the custom renderer for SOUND_CUE lines in the document viewer
    this.featureManager.registerLineRenderer(LineType.SOUND_CUE, SoundCueLine, 'default')

    // Register action handlers
    this.unregisterActions.push(
      this.actionController.registerHandler(ACTION_TYPES.PLAY_SOUND_CUE, this.handlePlaySound.bind(this)),
      this.actionController.registerHandler(ACTION_TYPES.STOP_SOUND_CUE, this.handleStopSound.bind(this))
    )

    // Listen for line selection to manage pre-loading
    // Use the eventBus provided in the constructor
    const cleanupSelection = this.eventBus.subscribe(EVENT_TYPES.LINE_SELECTED, (event) => {
      if (event.payload.lineId) {
        this.managePreloading(event.payload.lineId)
      }
    })
    this.unregisterEvents.push(cleanupSelection)

    console.log('[Sound Feature] Initialized')
  }

  async destroy(): Promise<void> {
    this.unregisterActions.forEach(unregister => unregister())
    this.unregisterEvents.forEach(unregister => unregister())
    this.managedPlayerIds.clear()
    this.audioPlaybackManager.stopAll()
  }

  /**
   * Calculates which cues should be loaded and which should be removed based on proximity.
   */
  private managePreloading(currentLineId: string): void {
    const lines = this.appStore.getLines()
    const currentIndex = lines.findIndex(l => l.id === currentLineId)
    if (currentIndex === -1) return

    const ahead = AppConfig.audio.preloadCuesAhead
    const behind = AppConfig.audio.preloadCuesBehind

    const startIdx = Math.max(0, currentIndex - behind)
    const endIdx = Math.min(lines.length - 1, currentIndex + ahead)

    const cuesToLoad = new Map<string, SoundCue>()
    
    // Identify all sound cues in the active window
    for (let i = startIdx; i <= endIdx; i++) {
      const line = lines[i]
      if (line.lineType === LineType.SOUND_CUE && line.metadata.sound) {
        const cue = line.metadata.sound as SoundCue
        cuesToLoad.set(cue.id, cue)
      }
    }

    // Unload players that are no longer in the window
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

    // Pre-load players in the window
    cuesToLoad.forEach((cue, id) => {
      const player = this.audioPlaybackManager.getPlayer(id, cue.url)
      this.managedPlayerIds.add(id)
      if (!player.isLoaded) {
        player.load().catch(err => console.error(`[Sound Feature] Failed to preload cue ${id}:`, err))
      }
    })
  }

  private async handlePlaySound(action: any): Promise<void> {
    const { cue } = action.payload;
    
    try {
      const player = this.audioPlaybackManager.getPlayer(cue.id, cue.url)
      this.managedPlayerIds.add(cue.id)
      
      if (!player.isLoaded) {
        await player.load()
      }

      player.volume = (cue.volume || 100) / 100
      player.balance = cue.pan === 'left' ? -1 : cue.pan === 'right' ? 1 : 0

      await player.play(
        cue.startOffsetSeconds,
        cue.endOffsetSeconds,
        cue.fadeIn,
        cue.fadeOut
      )
    } catch (error) {
      console.error(`[Sound Feature] Failed to play cue ${cue.id}:`, error)
    }
  }

  private handleStopSound(action: any): void {
    const { cueId } = action.payload;
    this.audioPlaybackManager.stopCues([cueId])
  }
}
