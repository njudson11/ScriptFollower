import { reactive } from 'vue'

/**
 * Manages the playback of audio files using Web Audio API,
 * including playing, stopping, tracking state, volume, and stereo balance.
 * Designed as a drop-in replacement for SoundManager.
 */
export class WebAudioSoundManager {
  /**
   * The reactive state of currently playing audio.
   * Each record contains:
   * - audio: The AudioBufferSourceNode instance.
   * - gainNode: The GainNode for volume control.
   * - pannerNode: The StereoPannerNode for balance control.
   * - timeLeft: The remaining playback time in seconds.
   * - duration: The total duration of the audio.
   * - interval: The ID of the setInterval used to update timeLeft.
   * - url: The object URL created for the audio file (for cleanup).
   */
  constructor(soundProcessor) {
    if (!soundProcessor) {
      throw new Error('WebAudioSoundManager requires a SoundProcessor instance.')
    }
    this.soundProcessor = soundProcessor
    this.playingAudios = reactive({}) // Now reactive object
    this.onSoundEndCallbacks = [] // Explicitly initialize here

    // Initialize AudioContext
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    } catch (e) {
      console.error('Web Audio API is not supported in this browser:', e)
      alert('Web Audio API is not supported in this browser. Sound features may not work.')
    }
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
    // SoundProcessor should ideally preload ArrayBuffers for Web Audio API
    return this.soundProcessor.findPreloadedSound(ref) !== null
  }

  /**
   * Plays a sound cue by its reference ID using Web Audio API.
   * @param {object} line - The line object for the sound cue.
   * @param {Array<object>} lines - The array of all document lines.
   * @private
   */
  async playSound(line, lines) {
    if (!this.audioContext) return

    const ref = line.ref
    if (line.soundCue && line.soundCue.stopAll) {
      this.stopAllSounds()
    }
    if (line.soundCue && line.soundCue.stopPrev) {
      const currentIdx = lines.findIndex(l => l.idx === line.idx)
      if (currentIdx > 0) {
        for (let i = currentIdx - 1; i >= 0; i--) {
          const prevLine = lines[i]
          if (prevLine.type === 'SOUND') {
            if (this.isPlaying(prevLine.ref)) {
              this.stopSound(prevLine.ref)
            }
            break
          }
        }
      }
    }
    if (!this.isSoundAvailable(ref)) return

    const file = this.soundProcessor.findSoundFile(ref)
    if (!file) {
      console.warn(`Sound file for ref ${ref} not found.`)
      return
    }

    try {
      // Ensure audio context is resumed (needed for some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)

      const sourceNode = this.audioContext.createBufferSource()
      sourceNode.buffer = audioBuffer

      const gainNode = this.audioContext.createGain()
      const pannerNode = this.audioContext.createStereoPanner()

      // Set initial volume
      if (line.soundCue) {
        gainNode.gain.value = (line.soundCue.volume !== undefined ? line.soundCue.volume : 100) / 100
        pannerNode.pan.value = (line.soundCue.balance !== undefined ? line.soundCue.balance : 0) / 100
      } else {
        gainNode.gain.value = 1
        pannerNode.pan.value = 0
      }

      // Connect nodes: source -> gain -> panner -> destination
      sourceNode.connect(gainNode)
      gainNode.connect(pannerNode)
      pannerNode.connect(this.audioContext.destination)

      // Start tracking playback
      const startTracking = () => {
        this.updatePlayingAudios(ref, sourceNode, gainNode, pannerNode, audioBuffer.duration, line)
      }

      sourceNode.onended = () => {
        if (this.playingAudios[ref]) {
          this.stopSound(ref) // Stop and clean up
          if (this.onSoundEndCallbacks.length > 0) {
            this.onSoundEndCallbacks.forEach(callback => callback(line))
          }
        }
      }

      sourceNode.start(0) // Play immediately
      startTracking()

    } catch (e) {
      console.error(`Error playing sound ref ${ref} with Web Audio API:`, e)
    }
  }

  /**
   * Updates the state of a playing audio (Web Audio API).
   * @param {string} ref - The reference ID of the sound cue.
   * @param {AudioBufferSourceNode} sourceNode - The source node.
   * @param {GainNode} gainNode - The gain node.
   * @param {StereoPannerNode} pannerNode - The panner node.
   * @param {number} duration - The total duration of the audio.
   * @param {object} line - The line object corresponding to the sound.
   */
  updatePlayingAudios(ref, sourceNode, gainNode, pannerNode, duration, line) {
    const startTime = this.audioContext.currentTime
    const interval = setInterval(() => {
      const sound = this.playingAudios[ref]
      if (!sound) {
        clearInterval(interval)
        return
      }
      const elapsedTime = this.audioContext.currentTime - startTime
      const newTimeLeft = Math.max(0, duration - elapsedTime)
      sound.timeLeft = newTimeLeft
      if (newTimeLeft <= 0) {
        clearInterval(interval)
      }
    }, 100)

    Object.assign(this.playingAudios, {
      ...this.playingAudios,
      [ref]: {
        audio: sourceNode, // Storing sourceNode as 'audio' for compatibility
        gainNode,
        pannerNode,
        duration,
        timeLeft: duration,
        interval,
        url: null, // Not directly applicable for Web Audio API buffer sources
        line // Store the line object for context
      }
    })
  }

  /**
   * Stops a currently playing sound cue by its reference ID.
   * @param {string} ref - The reference ID of the sound cue.
   */
  stopSound(ref) {
    const sound = this.playingAudios[ref]
    if (sound) {
      sound.audio.stop() // Stop the AudioBufferSourceNode
      sound.audio.disconnect() // Disconnect source
      sound.gainNode.disconnect() // Disconnect gain
      sound.pannerNode.disconnect() // Disconnect panner

      clearInterval(sound.interval)

      delete this.playingAudios[ref]
    }
  }

  /**
   * Stops all currently playing sounds.
   */
  stopAllSounds() {
    Object.keys(this.playingAudios).forEach(ref => {
      this.stopSound(ref)
    })
  }

  /**
   * Sets the volume for a currently playing sound.
   * @param {string} ref - The reference ID of the sound cue.
   * @param {number} volume - The volume level from 0 to 100.
   */
  setVolume(ref, volume) {
    const sound = this.playingAudios[ref]
    if (sound && sound.gainNode) {
      sound.gainNode.gain.value = parseFloat(volume) / 100
    }
  }

  /**
   * Sets the stereo balance (panning) for a currently playing sound.
   * @param {string} ref - The reference ID of the sound cue.
   * @param {number} balance - The balance level from -100 (left) to 100 (right).
   */
  setBalance(ref, balance) {
    const sound = this.playingAudios[ref]
    if (sound && sound.pannerNode) {
      sound.pannerNode.pan.value = parseFloat(balance) / 100 // -1 to 1 range
    }
  }

  /**
   * Checks if a sound matching the given reference ID is currently playing.
   * @param {string} ref - The reference ID of the sound cue.
   * @returns {boolean} - True if the sound is playing, false otherwise.
   */
  isPlaying(ref) {
    return !!this.playingAudios[ref]
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
   * Clears all sounds and releases resources.
   */
  clear() {
    this.stopAllSounds()
    Object.keys(this.playingAudios).forEach(key => delete this.playingAudios[key])
    this.soundProcessor.clear()
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}
