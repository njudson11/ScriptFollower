export class SoundProcessor {
  constructor(files = []) {
    this.files = files // Array of File objects
  }

  setFiles(files) {
    this.files = files
  }

  /**
   * Find a sound file by its 4-digit prefix.
   * @param {string} ref - The 4-digit reference code.
   * @returns {File|null}
   */
  findSoundFile(ref) {
    if (!this.files || !ref) return null
    return this.files.find(file => file.name.startsWith(ref))
  }

  /**
   * Check if a sound file is available for a given ref.
   * @param {string} ref
   * @returns {boolean}
   */
  isSoundAvailable(ref) {
    return !!this.findSoundFile(ref)
  }

  /**
   * Play the sound file for a given ref.
   * @param {string} ref
   * @returns {Promise<void>}
   */
  playSound(ref) {
    const file = this.findSoundFile(ref)
    if (!file) return Promise.reject(new Error('Sound file not found'))
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    return audio.play()
  }
}