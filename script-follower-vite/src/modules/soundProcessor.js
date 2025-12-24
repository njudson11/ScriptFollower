export class SoundProcessor {
  /**
   * Processor for sound files.
   * @constructor
   * @param {File[]} files - An array of sound files.
   */
  constructor(files = []) {
    this.audioMap = new Map()
   // this.files = files // Array of File objects
    this.setFiles(files)
  }

  /**
   * Sets the sound files to be processed.
   * @param {File[]} files - An array of sound files.
   */
  setFiles(files) {
    this.files = Array.from(files)
    this.preloadFiles(files)
  }

  /**
   * Clears all sound files and preloaded audio.
   */
  clear(){
    this.files = []
    this.audioMap.forEach(audio => {
      audio.src = ''
    })
    this.audioMap.clear()
  }

  /**
   * Preload all sound files into Audio objects.
   * @param {File[]} files
   */
  preloadFiles(files) {
    if (!files || files.length==0) return
    this.audioMap.clear()
    for (const file of files) {
      const url = URL.createObjectURL(file)
      const audio = new Audio(url)
      // Optionally, force preloading
      audio.preload = 'auto'
      // Use the 4-digit prefix as the key
      const ref = file.name.substring(0, 4)
      this.audioMap.set(ref, audio)
      console.log(`Preloaded sound: ${file.name} as ref ${ref}`) 
    }
  }

  /**
   * Finds a preloaded sound by its reference.
   * @param {string} ref - The reference of the sound to find.
   * @returns {HTMLAudioElement|null} - The preloaded audio element or null if not found.
   */
  findPreloadedSound(ref) {
    if (!this.audioMap || !ref) return null
    return this.audioMap.get(ref) || null
  } 

  /**
   * Find a sound file by its 4-digit prefix.
   * @param {string} ref - The 4-digit reference code.
   * @returns {File|null}
   */
  findSoundFile(ref) {
    if (!this.files || !Array.isArray(this.files)) return null
    return this.files.find(file => file.name.startsWith(ref))
  }

  /**
   * Check if a sound file is available for a given ref.
   * @param {string} ref
   * @returns {boolean}
   */
  isSoundAvailable(ref) {
    return !!this.findSoundFile(ref) //Convert object to boolean
  }



  /**
   * Play the sound file for a given ref.
   * @param {string} ref
   * @returns {Promise<void>}
   */
  playSound(ref) {
    const audio = this.audioMap.get(ref)
    if (audio) {
      return this.playSoundPreloaded(ref)
    }else{
      return this.playSoundByInline(ref)
    }
  }

  /**
   * Plays a sound by creating an audio element inline.
   * @param {string} ref - The reference of the sound to play.
   * @returns {Promise<void>} - A promise that resolves when the sound has finished playing.
   */
  playSoundByInline(ref) {
    const file = this.findSoundFile(ref)
    if (!(file instanceof File)) {
      return Promise.reject(new Error('Invalid file type'))
    }
    const url = URL.createObjectURL(file)
    const audio = new Audio(url)
    return audio.play() 
  }

  /**
   * Plays a preloaded sound.
   * @param {string} ref - The reference of the sound to play.
   * @returns {Promise<void>} - A promise that resolves when the sound has finished playing.
   */
  playSoundPreloaded(ref) {
    const audio = this.audioMap.get(ref)
    if (!audio) return Promise.reject(new Error('Sound not preloaded or not found'))
    return audio.play()
  }
}