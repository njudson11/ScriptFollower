import { IMatchableLine, TextMatcherOptions, MatchResult } from '@/types/core';

/**
 * TextMatcher handles phonetic matching of spoken text against script lines.
 * It uses a combination of Soundex phonetic encoding, sliding window comparison,
 * and position-based weighting to find the best match.
 */
export class TextMatcher {
  /**
   * Finds the closest matching line in a collection of lines based on spoken text.
   * 
   * @param lines The collection of lines to search
   * @param spokenText The text recognized by the speech engine
   * @param options Configuration options for matching
   * @returns The best match result
   */
  public findClosestLine<T extends IMatchableLine>(
    lines: readonly T[],
    spokenText: string,
    options: TextMatcherOptions
  ): MatchResult {
    const { activeIndex = 0, preWindow, postWindow, threshold, weights } = options;

    const startIdx = Math.max(0, activeIndex - preWindow);
    const endIdx = Math.min(lines.length - 1, activeIndex + postWindow);

    let bestMatch: MatchResult = { index: -1, score: 0, rawScore: 0 };

    for (let i = startIdx; i <= endIdx; i++) {
      const line = lines[i];
      const rawScore = this.calculateBestPhoneticScore(line.text, spokenText);
      
      const distance = i - activeIndex;
      let weight = 1.0;

      if (distance >= 1) {
        // Forward progress decay
        weight = weights.maxPostWeight - ((weights.maxPostWeight / postWindow) * distance);
      } else if (distance < 0) {
        // Backtracking decay
        weight = weights.maxPreWeight - ((weights.maxPreWeight / preWindow) * Math.abs(distance));
      }

      const weightedScore = rawScore * Math.max(0, weight);

      if (weightedScore > bestMatch.score) {
        bestMatch = {
          index: i,
          score: weightedScore,
          rawScore: rawScore
        };
      }
    }

    if (bestMatch.score < threshold) {
      return { index: -1, score: 0, rawScore: 0 };
    }

    return bestMatch;
  }

  /**
   * Calculates the best phonetic similarity score between a line and spoken text
   * using a sliding window approach.
   */
  private calculateBestPhoneticScore(lineText: string, spokenText: string): number {
    const lineNormalized = this.normalise(lineText);
    const spokenNormalized = this.normalise(spokenText);

    if (!lineNormalized || !spokenNormalized) return 0;

    const lineWords = lineNormalized.split(' ');
    const spokenWords = spokenNormalized.split(' ');

    // 1. Compare full phrases
    let maxScore = this.phoneticSimilarity(lineNormalized, spokenNormalized);

    // 2. Sliding window approach
    if (spokenWords.length > lineWords.length) {
      // Spoken text is longer: Slide over spoken text to find the line
      for (let i = 0; i <= spokenWords.length - lineWords.length; i++) {
        const subsequence = spokenWords.slice(i, i + lineWords.length).join(' ');
        const score = this.phoneticSimilarity(lineNormalized, subsequence);
        if (score > maxScore) maxScore = score;
      }
    } else if (spokenWords.length < lineWords.length) {
      // Line is longer: Slide over the line to find the spoken phrase
      // This is crucial for matching dialogue that follows a character name (e.g., "NAME: Dialogue")
      for (let i = 0; i <= lineWords.length - spokenWords.length; i++) {
        const subsequence = lineWords.slice(i, i + spokenWords.length).join(' ');
        const score = this.phoneticSimilarity(subsequence, spokenNormalized);
        if (score > maxScore) maxScore = score;
      }
    }

    return maxScore;
  }

  /**
   * Calculates phonetic similarity between two strings using Soundex codes.
   */
  public phoneticSimilarity(a: string, b: string): number {
    const codesA = this.getUniqueSoundexCodes(a);
    const codesB = this.getUniqueSoundexCodes(b);

    if (codesA.size === 0 || codesB.size === 0) return 0;

    let commonCount = 0;
    codesA.forEach(code => {
      if (codesB.has(code)) commonCount++;
    });

    const maxUnique = Math.max(codesA.size, codesB.size);
    return commonCount / maxUnique;
  }

  /**
   * Normalizes a string for comparison by removing punctuation and smart quotes.
   */
  public normalise(str: string): string {
    return str
      .toLowerCase()
      .replace(/[\u2019\u2018’‘']/g, '') // Remove all types of apostrophes
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"”“[\]\|<>–—]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();
  }

  /**
   * Returns a set of unique Soundex codes for words in the string.
   */
  private getUniqueSoundexCodes(str: string): Set<string> {
    const normalised = this.normalise(str);
    const words = normalised.split(' ');
    const codes = new Set<string>();

    for (const word of words) {
      if (word.length > 0) {
        const code = this.soundex(word);
        if (code) codes.add(code);
      }
    }

    return codes;
  }

  /**
   * Standard Soundex algorithm implementation.
   */
  public soundex(word: string): string {
    if (!word) return '';

    const firstLetter = word[0].toUpperCase();
    const mapping: Record<string, string> = {
      B: '1', F: '1', P: '1', V: '1',
      C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
      D: '3', T: '3',
      L: '4',
      M: '5', N: '5',
      R: '6'
    };

    let result = firstLetter;
    let lastDigit = mapping[firstLetter] || '';

    for (let i = 1; i < word.length && result.length < 4; i++) {
      const letter = word[i].toUpperCase();
      const digit = mapping[letter];

      if (digit) {
        if (digit !== lastDigit) {
          result += digit;
          lastDigit = digit;
        }
      } else {
        lastDigit = ''; // Vowels and other characters reset the adjacency rule
      }
    }

    return result.padEnd(4, '0');
  }
}
