/**
 * Removes all HTML tags and most grammatical characters (punctuation) from a string.
 * @param {string} line
 * @returns {string}
 */
export function stripHtmlAndPunctuation(line) {
  // Remove HTML tags
  let clean = line.replace(/<[^>]*>/g, '')
  // Remove most grammatical characters (punctuation)
  clean = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’”“[\]\\|<>]/g, '')
  return clean
}

export function isSoundCue(line) {
  return /SOUND.*\d{4}/.test(line)
}

export function extractSoundRef(line) {
  const match = line.match(/\b(\d{4})\b/)
  return match ? match[1] : null
}