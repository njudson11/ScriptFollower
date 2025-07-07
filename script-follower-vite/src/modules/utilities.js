
import { lineTypeLabel } from './constants.js'

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
  if (!isSoundCue(line)) return null;
  const match = line.match(/\b(\d{4})\b/)
  return match ? match[1] : null
}

export function getTypeByTag(line) {
  switch (line.tag) {
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
    { style: 'Stage_20_Direction',tag: lineTypeLabel.stageDirection },
    { style: 'Title',tag: lineTypeLabel.heading },
    { style: 'Subtitle',tag: lineTypeLabel.heading },
    { style: 'Heading_20_2',tag: lineTypeLabel.heading },
    { style: 'Heading_20_1',tag: lineTypeLabel.heading }
  ]

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
  

