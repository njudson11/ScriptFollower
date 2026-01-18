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
  onSoundEndCallbacks = []

  /**
   * @param {import('./soundProcessor').SoundProcessor} soundProcessor - An instance of SoundProcessor to find audio files.
   * @throws {Error} If a SoundProcessor instance is not provided.
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
   * @param {object} line - The line object for the sound cue.
   * @param {Array<object>} lines - The array of all document lines.
   */
  playOrStopSound(line, lines) {
    if (this.isPlaying(line.ref)) {
      this.stopSound(line.ref)
    } else {
      this.playSound(line, lines)
    }
  }

  /**
   * Checks if a sound is preloaded.
   * @param {string} ref - The reference ID of the sound cue.
   * @returns {boolean} - True if the sound is preloaded, false otherwise.
   */
  isPreloaded(ref) {
    return this.soundProcessor.findPreloadedSound(ref) !== null
  }

  /**
   * Plays a sound cue by its reference ID.
   * @param {object} line - The line object for the sound cue.
   * @param {Array<object>} lines - The array of all document lines.
   * @private
   */
  playSound(line, lines) {
    const ref = line.ref;
    if (line.soundCue && line.soundCue.stopAll) {
      this.stopAllSounds();
    }
    if (line.soundCue && line.soundCue.stopPrev) {
      const currentIdx = lines.findIndex(l => l.idx === line.idx);
      if (currentIdx > 0) {
        for (let i = currentIdx - 1; i >= 0; i--) {
          const prevLine = lines[i];
          if (prevLine.type === 'SOUND') {
            if (this.isPlaying(prevLine.ref)) {
              this.stopSound(prevLine.ref);
            }
            break; 
          }
        }
      }
    }
    if (!this.isSoundAvailable(ref)) return;
    const file = this.soundProcessor.findSoundFile(ref)
    if (!file) {
      console.warn(`Sound file for ref ${ref} not found.`)
      return
    }
    let audio = this.soundProcessor.findPreloadedSound(ref)
    const url = URL.createObjectURL(file)
    if (!audio) {
      audio = new Audio(url)
    }

    // Set initial volume
    if (line.soundCue) {
      audio.volume = (line.soundCue.volume !== undefined ? line.soundCue.volume : 100) / 100;
    } else {
      audio.volume = 1;
    }

    // Helper to start tracking playback
    const startTracking = () => {
      this.updatePlayingAudios(ref, audio, url)
    }

    // If metadata is already loaded (preloaded), start tracking immediately
    if (audio.readyState >= 1 && audio.duration) {
      startTracking()
    } else {
      // Otherwise, wait for metadata to load
      audio.onloadedmetadata = startTracking
    }

    audio.play().catch(e => console.error(`Error playing sound ref ${ref}:`, e))

    audio.onended = () => {
      if (this.playingAudios.value[ref]) {
        this.stopSound(ref)
        if (this.onSoundEndCallbacks.length > 0) {
          this.onSoundEndCallbacks.forEach(callback => callback(line))
        }
      }
    }
  }

  /**
   * Updates the state of a playing audio.
   * @param {string} ref - The reference ID of the sound cue.
   * @param {HTMLAudioElement} audio - The audio element.
   * @param {string} url - The URL of the audio file.
   */
  updatePlayingAudios(ref, audio, url) {
      const duration = audio.duration
      const interval = setInterval(() => {
        const sound = this.playingAudios.value[ref]
        if (!sound) {
          clearInterval(interval)
          return
        }
        const newTimeLeft = Math.max(0, duration - audio.currentTime)
        sound.timeLeft = newTimeLeft
        if (newTimeLeft <= 0) {
          clearInterval(interval)
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
   * Sets the volume for a currently playing sound.
   * @param {string} ref - The reference ID of the sound cue.
   * @param {number} volume - The volume level from 0 to 100.
   */
  setVolume(ref, volume) {
    const sound = this.playingAudios.value[ref];
    if (sound && sound.audio) {
      sound.audio.volume = parseFloat(volume) / 100;
    }
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

  /**
   * Checks if a sound is available.
   * @param {string} ref - The reference ID of the sound cue.
   * @returns {boolean} - True if the sound is available, false otherwise.
   */
  isSoundAvailable(ref) {
    return this.soundProcessor.isSoundAvailable(ref)
  }

  /**
   * Clears all sounds.
   */
  clear(){
    this.stopAllSounds()
    this.playingAudios.value = {}
    this.soundProcessor.clear()
  }
}

