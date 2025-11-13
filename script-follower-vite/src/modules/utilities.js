import { lineTypeLabel } from './constants.js'
import { appValues } from './constants.js'


/**
 * Checks if the window width is considered mobile size.
 * @returns {boolean} - True if the window width is less than or equal to the mobile minimum width.
 */
export function isMobileSize(){
  return window.innerWidth <= appValues.mobileMinWidth
}
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

/**
 * Checks if a line is a sound cue.
 * @param {string} line - The line to check.
 * @returns {boolean} - True if the line is a sound cue, false otherwise.
 */
export function isSoundCue(line) {
  return /SOUND.*\d{4}/.test(line)
}

/**
 * Extracts the sound reference from a line.
 * @param {string} line - The line to extract the sound reference from.
 * @returns {string|null} - The sound reference or null if not found.
 */
export function extractSoundRef(line) {
  if (!isSoundCue(line)) return null;
  const match = line.match(/\b(\d{4})\b/)
  return match ? match[1] : null
}

/**
 * Extracts the technical description from a line.
 * @param {import('./documentProcessor').lineDefinition} line - The line to extract the description from.
 * @returns {string} - The technical description.
 */
export function extractTechDescription(line) {
  // Match the rest of the line after a tab
  const lineText = line.cleanText || line.text || '';
  const match = lineText.match(/\t(.*)/);
  if (match) {
    // If a tab is found, return the description after the line.ref and any dashes or whitespace
    // This assumes the description is everything after the tab
    let description = match[1].trim();
    description= description.replace(line.ref, ''); // Remove line ref
    description = description.replace(/^\s*-+/, ''); // Remove leading dashes and spaces
    return description.trim(); // Remove leading dashes and trim spaces
  }
  return lineText.replace(/^\s*\w+\s*:\s*/, '').trim(); // Remove tag and leading spaces
}

/**
 * Gets the line type from a line's tag.
 * @param {import('./documentProcessor').lineDefinition} line - The line to get the type from.
 * @returns {string} - The line type.
 */
export function getTypeByTag(line) {
  switch (line.tag.replace(" ","").toUpperCase()) {
    case 'SFX':
    case 'SOUND':
    case 'SOUNDA':
    case 'SOUND_20_A':
    case 'SOUNDB':
    case 'SOUND_20_B':
    case 'MUSIC':
      return lineTypeLabel.sound;
    case 'TECH':
      return lineTypeLabel.tech;
    case 'CURTAINS':
    case 'CURTAIN':
      return lineTypeLabel.curtain;
    case 'LIGHT':
    case 'LIGHTS':
      return lineTypeLabel.light;
    case 'DIALOGUE':
      return lineTypeLabel.dialogue;
    case 'SCENE':
      return lineTypeLabel.scene;
    case 'PAGE_NUMBER':
      return lineTypeLabel.pageNumber;
    case 'NOTE':
      return lineTypeLabel.note;
    case 'DIRECTION':
      return lineTypeLabel.stageDirection;
    case 'HEADING':
      return lineTypeLabel.heading;
    default:
      return lineTypeLabel.character;
  }
}

/**
 * Gets the tag from a line.
 * @param {import('./documentProcessor').lineDefinition} line - The line to get the tag from.
 * @returns {string} - The tag.
 */
export function getTag(line) {
    const tagPattern = /^([\w ]+?)(:|\t)/g; // Matches # followed by word characters
    const match = line.text.match(tagPattern);
    if (match) {
      return match[0].replace(':', '').replace('\t', '').trim().toUpperCase(); // Remove colon and tab
    }
    return findTagByRules(line).toUpperCase();
  }

  const tagRules = [
    { regex: /Act (One|Two).*$/igm, tag: lineTypeLabel.scene },
    { regex: /^\s*\(.*?\)\s*$/igm, tag: lineTypeLabel.stageDirection },
    { style: 'PageNumber',tag: lineTypeLabel.pageNumber },
    { style: 'Page_20_Number',tag: lineTypeLabel.pageNumber },
    { style: 'Stage_20_Direction',tag: lineTypeLabel.stageDirection },
    { style: 'Title',tag: lineTypeLabel.heading },
    { style: 'Subtitle',tag: lineTypeLabel.heading },
    { style: 'Heading_20_2',tag: lineTypeLabel.heading },
    { style: 'Heading_20_1',tag: lineTypeLabel.heading }
  ]

  /**
   * Finds a tag for a line based on a set of rules.
   * @param {import('./documentProcessor').lineDefinition} line - The line to find the tag for.
   * @returns {string} - The tag.
   */
  function findTagByRules(line) {
    for (const rule of tagRules) {
      if (rule.style && line.style === rule.style) {
        return rule.tag.toUpperCase(); // Return the tag defined in the rule
      }
      if (rule.regex){
        const match = line.text.match(rule.regex);
        if (match) {
          return rule.tag.toUpperCase(); // Return the tag defined in the rule
        }
      }
    }
    return "dialogue"; // Default tag if no rules match
  }

  /**
   * Wraps sections of a string in <span> tags according to rules.
   * @param {string} input - The input string.
   * @param {Array<{match: RegExp|string, className: string}>} rules - The rules to apply.
   * @returns {string} - The processed HTML string.
   */
  export function wrapWithSpans(line, rules) {
      // Helper to split text nodes and HTML tags

      function splitNodes(str) {
          // Split into text and tags
          const regex = /(<span[^>]*>.*?<\/span>)/gs;
          let result = [];
          let lastIndex = 0;
          let match;
          while ((match = regex.exec(str)) !== null) {
              if (match.index > lastIndex) {
                  result.push({ type: 'text', value: str.slice(lastIndex, match.index) });
              }
              result.push({ type: 'html', value: match[0] });
              lastIndex = regex.lastIndex;
          }
          if (lastIndex < str.length) {
              result.push({ type: 'text', value: str.slice(lastIndex) });
          }
          return result;
      }
  
      let current = line.text;
      try{
        for (const rule of rules) {
            if (rule.types && !rule.types.includes(line.type)) {
              continue; // Skip this rule if the line type does not match
            }
            const nodes = splitNodes(current);
            current = nodes.map(node => {
                if (node.type === 'html') return node.value;
                // Only apply rule to text nodes
                if (!node.value) return '';
                let { match, className } = rule;
                if (typeof match === 'string') {
                    // Escape for RegExp
                    match = new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                }
                return node.value.replace(match, m => `<span class="${className}">${m}</span>`);
            }).join('');
        }
      }
      catch (error) {
          console.error('Error applying rules to ' + line.text + ':', error);
          throw error; // Re-throw the error to handle it upstream
      }
      return current;
  }

/**
 * Generate a CSV string of sound cues from a DocumentProcessor and SoundManager.
 * @param {object} docProcessor - The DocumentProcessor instance (should have .lines).
 * @param {object} soundManager - The SoundManager instance (should have .soundProcessor with .findSoundFile(ref)).
 * @returns {string} CSV content
 */
export function generateSoundCueCSV(docProcessor, soundManager) {
  const lines = docProcessor.lines.value || [];
  const csvRows = [
    ['Page', 'Cue #', 'Description', 'Filename']
  ];

  for (const line of lines) {
    if (line.type === lineTypeLabel.sound && line.ref) {
      const page = line.pageNumber || line.page || '';
      const cue = line.ref;
      const description = line.description || '';
      let filename = '';
      if (
        soundManager &&
        soundManager.soundProcessor &&
        typeof soundManager.soundProcessor.findSoundFile === 'function'
      ) {
        const file = soundManager.soundProcessor.findSoundFile(cue);
        filename = file ? file.name : '';
      }
      csvRows.push([
        page,
        cue,
        description.replace(/—/g, '-').replace(/"/g, '""'), // Replace emdash, then escape quotes
        filename.replace(/—/g, '-').replace(/"/g, '""')
      ]);
    }
  }

  // Convert to CSV string
  return csvRows
    .map(row =>
      row
        .map(field =>
          `"${String(field).replace(/"/g, '""')}"`
        )
        .join(',')
    )
    .join('\n');
}

/**
 * Converts seconds to a string in the format "mm:ss.ms".
 * @param {number} seconds - The number of seconds to convert.
 * @returns {string} - The formatted time string.
 */
export function secondsToMinutes(seconds) {
  if (typeof seconds !== 'number' || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  const milliseconds = Math.floor((seconds % 1)*100).toString().padStart(2, '0') ;
  return `${mins}:${secs}.${milliseconds}`;
}
