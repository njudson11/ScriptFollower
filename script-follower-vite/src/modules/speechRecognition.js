/**
 * Simple speech recognition utility for browsers supporting the Web Speech API.
 * @param {function(string):void} onResult - Callback for recognized text.
 * @param {function(string):void} [onError] - Optional callback for errors.
 * @param {function():void} [onEnd] - Optional callback when recognition ends.
 * @returns {object} - { start, stop, isSupported }
 */
export function useSpeechRecognition(onResult, onError, onEnd) {
  let recognition = null
  let listening = false

  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  if (isSupported) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-GB'

    recognition.onresult = (event) => {
      const last = event.results.length - 1
      const transcript = event.results[last][0].transcript.trim()
      onResult(transcript)
    }
    recognition.onerror = (event) => {
      if (onError) onError(event.error)
      listening = false
    }
    recognition.onend = () => {
      listening = false
      if (onEnd) onEnd()
    }
  }

  return {
    /**
     * Starts the speech recognition service.
     */
    start() {
      if (recognition && !listening) {
        recognition.start()
        listening = true
      }
    },
    /**
     * Stops the speech recognition service.
     */
    stop() {
      if (recognition && listening) {
        recognition.stop()
        listening = false
      }
    },
    /**
     * Checks if the speech recognition service is currently listening.
     * @returns {boolean} - True if listening, false otherwise.
     */
    get isListening() {
      return listening
    },
    isSupported
  }
}