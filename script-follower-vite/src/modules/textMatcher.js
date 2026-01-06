/**
 * Finds the index of the line in `lines` that most closely matches `spokenText`,
 * searching a window of lines before and after the current active line.
 * If no match is found above threshold, returns -1.
 * @param {string[]} lines - Array of lines from the script.
 * @param {string} spokenText - The recognized speech to match.
 * @param {number} [activeIdx=-1] - The current active line index.
 * @param {number} [preWindow=10] - How many lines before the current line to search.
 * @param {number} [postWindow=40] - How many lines after the current line to search.
 * @param {number} [threshold=0.3] - Minimum similarity (0-1) to consider a match.
 * @returns {number} - Index of the best matching line, or -1 if none above threshold.
 */
export function findClosestLine(
  lines,
  spokenText,
  activeIdx = -1,
  preWindow = 10,
  postWindow = 40,
  threshold = 0.3
) {
  if (!spokenText || !lines || !lines.length) return -1
  const spoken = spokenText.toLowerCase()
  const maxPostWeight=0.5;
  const maxPreWeight= 0;
  const postWeightPerLine = (maxPostWeight) / postWindow;
  const preWeightPerLine = (maxPreWeight) / preWindow;
  let bestIdx = -1
  let bestScore = 0

  let start, end
  if (activeIdx >= 0) {
    start = Math.max(0, activeIdx - preWindow)
    end = Math.min(lines.length, activeIdx + postWindow + 1)
  } else {
    start = 0
    postWindow=lines.length;
    end = postWindow;
  }

  for (let i = start; i < end; i++) {
    const line = lines[i].toLowerCase()
    const lineWords = line.split(/\s+/)
    const spokenWords = spoken.split(/\s+/)
    let maxScore = 0

    // Always try the full spoken phrase against the line
    const scoreFull = phoneticSimilarity(line, spoken)
    if (scoreFull > maxScore) {
      maxScore = scoreFull
    }

    // Try all possible windows of spokenWords of length lineWords.length
    if (spokenWords.length >= lineWords.length) {
      for (let offset = 0; offset <= spokenWords.length - lineWords.length; offset++) {
        const window = spokenWords.slice(offset, offset + lineWords.length).join(' ')
        const score = phoneticSimilarity(line, window)
        if (score > maxScore) {
          maxScore = score
        }
      }
    } else {
      // If spoken is shorter, try matching spoken to the start of the line
      const window = lineWords.slice(0, spokenWords.length).join(' ')
      const score = phoneticSimilarity(window, spoken)
      if (score > maxScore) {
        maxScore = score
      }
    }

    // --- Weighting logic ---
    const maxPostWeight=2;
    const maxPreWeight= 1.5;
    const postWeightPerLine = (maxPostWeight) / postWindow;
    const preWeightPerLine = (maxPreWeight) / preWindow;

    let weight = 1
    if (activeIdx >= 0) {
      const distance = i - activeIdx
      
      if (distance >= 1) {
        weight = 0 + (maxPostWeight-( postWeightPerLine * distance)) // Next line after active line
      } else if (distance < 0) {
        weight = 0 + (maxPreWeight-( preWeightPerLine * Math.abs(distance)) )// Next line after active line
      }
    }
    const weightedScore = maxScore * weight
    // -----------------------
//console.log(`Spoken "${spoken}" Line "${line}" score: ${weightedScore.toFixed(3)} (weight: ${weight.toFixed(3)})`)
    if (weightedScore > bestScore) {
      bestScore = weightedScore
      bestIdx = i
    }
  }
  return bestScore > threshold ? bestIdx : -1
}

export function findClosestLine2(
  lines,
  spokenText,
  activeIdx = -1,
  preWindow = 10,
  postWindow = 40,
  threshold = 0.3
) {
  if (!spokenText || !lines || !lines.length || lines.length==0) return -1
  const spoken = spokenText.toLowerCase()
  const maxPostWeight=0.5;
  const maxPreWeight= 0;
  let bestIdx = -1
  let bestScore = 0

  let start, end
  if (activeIdx >= 0) {
    start = Math.max(0, activeIdx - preWindow)
    end = Math.min(lines.length, activeIdx + postWindow + 1)
  } else {
    start = 0
    postWindow=lines.length;
    end = postWindow;
  }

  for (let i = start; i < end; i++) {
    const line = lines[i].cleanText.toLowerCase()
    const lineWords = line.split(/\s+/)
    const spokenWords = spoken.split(/\s+/)
    let maxScore = 0

    // Always try the full spoken phrase against the line
    const scoreFull = phoneticSimilarity(line, spoken)
    if (scoreFull > maxScore) {
      maxScore = scoreFull
    }

    // Try all possible windows of spokenWords of length lineWords.length
    if (spokenWords.length >= lineWords.length) {
      for (let offset = 0; offset <= spokenWords.length - lineWords.length; offset++) {
        const window = spokenWords.slice(offset, offset + lineWords.length).join(' ')
        const score = phoneticSimilarity(line, window)
        if (score > maxScore) {
          maxScore = score
        }
      }
    } else {
      // If spoken is shorter, try matching spoken to the start of the line
      const window = lineWords.slice(0, spokenWords.length).join(' ')
      const score = phoneticSimilarity(window, spoken)
      if (score > maxScore) {
        maxScore = score
      }
    }

    // --- Weighting logic ---
    const maxPostWeight=2;
    const maxPreWeight= 1.5;
    const postWeightPerLine = (maxPostWeight) / postWindow;
    const preWeightPerLine = (maxPreWeight) / preWindow;

    let weight = 1
    if (activeIdx >= 0) {
      const distance = i - activeIdx
      
      if (distance >= 1) {
        weight = 0 + (maxPostWeight-( postWeightPerLine * distance)) // Next line after active line
      } else if (distance < 0) {
        weight = 0 + (maxPreWeight-( preWeightPerLine * Math.abs(distance)) )// Next line after active line
      }
    }
    const weightedScore = maxScore * weight
    // -----------------------
//console.log(`Spoken "${spoken}" Line "${line}" score: ${weightedScore.toFixed(3)} (weight: ${weight.toFixed(3)})`)
    if (weightedScore > bestScore) {
      bestScore = weightedScore
      bestIdx = i
    }
  }
  return bestScore > threshold ? bestIdx : -1
}

/**
 * Finds the index of the line in `lines` that most closely matches `spokenText`,
 * searching a window of lines before and after the current active line.
 * This version uses the `description` property of the line objects.
 * If no match is found above threshold, returns -1.
 * @param {Array<import('./documentProcessor').lineDefinition>} lines - Array of lineDefinition objects from the script.
 * @param {string} spokenText - The recognized speech to match.
 * @param {number} [activeIdx=-1] - The current active line index.
 * @param {number} [preWindow=10] - How many lines before the current line to search.
 * @param {number} [postWindow=40] - How many lines after the current line to search.
 * @param {number} [threshold=0.3] - Minimum similarity (0-1) to consider a match.
 * @returns {number} - Index of the best matching line, or -1 if none above threshold.
 */
export function findClosestLine2(
  lines,
  spokenText,
  activeIdx = -1,
  preWindow = 10,
  postWindow = 40,
  threshold = 0.3
) {
  if (!spokenText || !lines || !lines.length || lines.length==0) return -1
  const spoken = spokenText.toLowerCase()
  const maxPostWeight=0.5;
  const maxPreWeight= 0;
  let bestIdx = -1
  let bestScore = 0

  let start, end
  if (activeIdx > 0) {
    start = Math.max(0, activeIdx - preWindow)
    end = Math.min(lines.length, activeIdx + postWindow + 1)
  } else {
    start = 0
    postWindow=lines.length;
    end = postWindow;
  }

  for (let i = start; i < end; i++) {
    const line= lines[i]
    const lineCleanText = line.description.toLowerCase()
    const lineWords = lineCleanText.split(/\s+/)
    const spokenWords = spoken.split(/\s+/)
    let maxScore = 0

    // Always try the full spoken phrase against the line
    const scoreFull = phoneticSimilarity(lineCleanText, spoken)
    if (scoreFull > maxScore) {
      maxScore = scoreFull
    }

    // Try all possible windows of spokenWords of length lineWords.length
    if (spokenWords.length >= lineWords.length) {
      for (let offset = 0; offset <= spokenWords.length - lineWords.length; offset++) {
        const window = spokenWords.slice(offset, offset + lineWords.length).join(' ')
        const score = phoneticSimilarity(lineCleanText, window)
        if (score > maxScore) {
          maxScore = score
        }
      }
    } else {
      // If spoken is shorter, try matching spoken to the start of the line
      const window = lineWords.slice(0, spokenWords.length).join(' ')
      const score = phoneticSimilarity(window, spoken)
      if (score > maxScore) {
        maxScore = score
      }
    }

    // --- Weighting logic ---
    const maxPostWeight=2;
    const maxPreWeight= 1.5;
    const postWeightPerLine = (maxPostWeight) / postWindow;
    const preWeightPerLine = (maxPreWeight) / preWindow;

    let weight = 1
    if (activeIdx >= 0) {
      const distance = i - activeIdx
      
      if (distance >= 1) {
        weight = 0 + (maxPostWeight-( postWeightPerLine * distance)) // Next line after active line
      } else if (distance < 0) {
        weight = 0 + (maxPreWeight-( preWeightPerLine * Math.abs(distance)) )// Next line after active line
      }
    }
    const weightedScore = maxScore * weight
    // -----------------------
//console.log(`Spoken "${spoken}" Line "${line}" score: ${weightedScore.toFixed(3)} (weight: ${weight.toFixed(3)})`)
    if (weightedScore > bestScore) {
      bestScore = weightedScore
      bestIdx = i
    }
  }
  return bestScore > threshold ? bestIdx : -1
}

/**
 * Computes a simple similarity score based on word overlap.
 * @param {string} a
 * @param {string} b
 * @returns {number} - 0 (no overlap) to 1 (identical)
 */
function wordOverlapSimilarity(a, b) {
  if (!a || !b) return 0
  const aWords = a.split(/\s+/)
  const bWords = b.split(/\s+/)
  const common = aWords.filter(word => bWords.includes(word))
  return common.length / Math.max(aWords.length, bWords.length)
}

/**
 * Implements the Soundex algorithm to convert a word to a phonetic code.
 * @param {string} word - The word to convert.
 * @returns {string} - The 4-character Soundex code.
 */
function soundex(word) {
  // Simple Soundex implementation
  const s = word.toUpperCase().replace(/[^A-Z]/g, '')
  if (!s) return ''
  const codes = { B:1,F:1,P:1,V:1,C:2,G:2,J:2,K:2,Q:2,S:2,X:2,Z:2,D:3,T:3,L:4,M:5,N:5,R:6 }
  let result = s[0]
  let prev = codes[s[0]] || 0
  for (let i = 1; i < s.length && result.length < 4; i++) {
    const code = codes[s[i]] || 0
    if (code !== prev && code !== 0) result += code
    prev = code
  }
  return (result + '000').slice(0, 4)
}

/**
 * Normalizes a string by converting to lowercase, removing punctuation, and trimming whitespace.
 * @param {string} str - The string to normalize.
 * @returns {string} - The normalized string.
 */
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[\u2019\u2018’‘']/g, '') // remove apostrophes
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"”“[\]\\|<>–—]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Computes a similarity score between two strings based on the phonetic similarity of their words.
 * @param {string} a - The first string.
 * @param {string} b - The second string.
 * @returns {number} - A similarity score between 0 and 1.
 */
function phoneticSimilarity(a, b) {
  if (!a || !b) return 0
  const aWords = Array.from(
    new Set(
      normalize(a)
        .split(/\s+/)
        .map(soundex)
        .filter(Boolean) // <-- filter out empty strings
    )
  )
  const bWords = Array.from(
    new Set(
      normalize(b)
        .split(/\s+/)
        .map(soundex)
        .filter(Boolean)
    )
  )
  const common = aWords.filter(word => bWords.includes(word))
  return common.length / Math.max(aWords.length, bWords.length)
}