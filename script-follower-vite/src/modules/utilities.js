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