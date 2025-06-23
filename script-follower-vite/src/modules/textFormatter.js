/**
 * Formats plain text into HTML paragraphs and applies custom styles.
 * @param {string} text - The raw text to format.
 * @param {Array<{regex: RegExp, className: string}>} [highlightRules] - Optional array of highlight rules.
 * @returns {string} - HTML string.
 */
export function formatTextToHtml(text, highlightRules = []) {
  // Apply highlight rules first
  let html = text
  for (const rule of highlightRules) {
    html = html.replace(rule.regex, match => `<span class="${rule.className}">${match}</span>`)
  }
  // Then wrap paragraphs
  html = html
    .split(/\r?\n\r?\n/) // split on double line breaks (paragraphs)
    .map(p => `<p>${p.replace(/\r?\n/g, '<br>')}</p>`)
    .join('')
  return html
}

/**
 * Highlights parts of a line based on highlight rules.
 * @param {string} line - The line of text to highlight.
 * @param {Array<{regex: RegExp, className: string}>} highlightRules - Array of rules.
 * @returns {string} - HTML string with highlights applied.
 */
export function highlightLine(line, highlightRules) {
  let htmlLine = line
  if (!htmlLine || htmlLine.trim() === '') return ''
  for (const rule of highlightRules) {
    htmlLine = htmlLine.replace(rule.regex, match => `<span class="${rule.className}">${match}</span>`)
  }
  return htmlLine
}

/**
 * Extracts and cleans dialogue lines from an array of lines.
 * @param {string[]} lines - Array of script lines.
 * @returns {Array<{ clean: string, idx: number }>}
 */
export function extractCleanLines(lines) {
  // Regex: start of line, any text up to the first colon, then the dialogue
  const dialogueRegex = /^([^:\n]+):\s*(.*)$/i
  return lines
    .map((line, idx) => {
      // Remove HTML tags
      const noHtml = line.replace(/<[^>]*>/g, '')
      const match = noHtml.match(dialogueRegex)
      if (match) {
        // match[2] is the dialogue section after the character name and colon
        let dialogue = match[2] || ''
        // Remove grammatical characters, including en dash (–) and em dash (—)
        dialogue = dialogue.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’”“[\]\\|<>–—]/g, '')
        return { clean: dialogue.trim(), idx }
      }
      return null
    })
    .filter(Boolean)
}