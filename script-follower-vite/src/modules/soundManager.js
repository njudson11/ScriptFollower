import { ref } from 'vue'

/**
 * Manages the playback of audio files, including playing, stopping,
 * and tracking the state of currently playing sounds.
 */
export class SoundManager {
  /**
   * The reactive state of currently playing audio.
   * @type {import('vue').Ref<Record<string, {audio: HTMLAudioElement, timeLeft: number, duration: number, interval: number, url: string}>>}
   */
  playingAudios = ref({})

  /**
   * @param {import('./soundProcessor').SoundProcessor} soundProcessor - An instance of SoundProcessor to find audio files.
   */
  constructor(soundProcessor) {
    if (!soundProcessor) {
      throw new Error('SoundManager requires a SoundProcessor instance.')
    }
    this.soundProcessor = soundProcessor
  }

  /**
   * Toggles playback for a sound cue by its reference ID.
   * If the sound is playing, it will be stopped. If it's stopped, it will be played.
   * @param {string} ref - The reference ID of the sound cue.
   */
  playOrStopSound(ref) {
    if (this.isPlaying(ref)) {
      this.stopSound(ref)
    } else {
      this.playSound(ref)
    }
  }

  /**
   * Plays a sound cue by its reference ID.
   * @param {string} ref - The reference ID of the sound cue.
   * @private
   */
  playSound(ref) {
    if (! this.isSoundAvailable(ref) ) return;
    const file = this.soundProcessor.findSoundFile(ref)
    if (!file) {
      console.warn(`Sound file for ref ${ref} not found.`)
      return
    }

    const url = URL.createObjectURL(file)
    const audio = new Audio(url)

    audio.onloadedmetadata = () => {
      const duration = audio.duration
      const interval = setInterval(() => {
        const sound = this.playingAudios.value[ref]
        if (!sound) {
          clearInterval(interval)
          return
        }

        const newTimeLeft = Math.max(0, duration - audio.currentTime)
        sound.timeLeft = newTimeLeft

        if (audio.ended || newTimeLeft <= 0) {
          this.stopSound(ref)
        }
      }, 100)

      this.playingAudios.value = {
        ...this.playingAudios.value,
        [ref]: {
          audio,
          duration,
          timeLeft: duration,
          interval,
          url
        }
      }
    }

    audio.play().catch(e => console.error(`Error playing sound ref ${ref}:`, e))

    audio.onended = () => {
      if (this.playingAudios.value[ref]) {
        this.stopSound(ref)
      }
    }
  }

  /**
   * Stops a currently playing sound cue by its reference ID.
   * @param {string} ref - The reference ID of the sound cue.
   */
  stopSound(ref) {
    const sound = this.playingAudios.value[ref]
    if (sound) {
      sound.audio.pause()
      sound.audio.currentTime = 0
      clearInterval(sound.interval)
      URL.revokeObjectURL(sound.url)

      const { [ref]: _, ...rest } = this.playingAudios.value
      this.playingAudios.value = rest
    }
  }

  /**
   * Stops all currently playing sounds. Useful for component cleanup.
   */
  stopAllSounds() {
    Object.keys(this.playingAudios.value).forEach(ref => {
      this.stopSound(ref)
    })
  }

    /**
   * Checks if a sound matching the given reference ID is currently playing.
   * @param {string} ref - The reference ID of the sound cue.
   * @returns {boolean} - True if the sound is playing, false otherwise.
   */
  isPlaying(ref) {
    if ( this.playingAudios.value ){
        return !!this.playingAudios.value[ref]
    }
    return false;
  }

  isSoundAvailable(ref) {
    return this.soundProcessor.isSoundAvailable(ref)
  }
}

