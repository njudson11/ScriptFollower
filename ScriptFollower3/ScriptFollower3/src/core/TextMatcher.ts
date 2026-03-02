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

    // 3. Length Penalty
    // Matches where the lengths are significantly different should be penalised.
    // A 1-word transcript matching a 10-word line is much less reliable than 8-words matching a 10-word line.
    const lengthRatio = Math.min(lineWords.length, spokenWords.length) / Math.max(lineWords.length, spokenWords.length);
    // Apply a non-linear penalty (square root) so short matches are heavily penalised but near-matches are not.
    const lengthFactor = Math.sqrt(lengthRatio);
    
    return maxScore * lengthFactor;
  }

  /**
   * Calculates phonetic similarity between two strings using Soundex codes.
   * Uses a fuzzy word overlap algorithm that rewards correct sequence.
   */
  public phoneticSimilarity(a: string, b: string): number {
    const codesA = this.getSoundexCodeSequence(a);
    const codesB = this.getSoundexCodeSequence(b);

    if (codesA.length === 0 || codesB.length === 0) return 0;

    // 1. Calculate basic Jaccard similarity (Bag of Words)
    const setA = new Set(codesA);
    const setB = new Set(codesB);
    let intersection = 0;
    setA.forEach(code => {
      if (setB.has(code)) intersection++;
    });
    const jaccard = intersection / Math.max(setA.size, setB.size);

    // 2. Calculate Longest Common Subsequence (LCS) to reward order
    // This is more flexible than bigrams for speech.
    const lcs = this.calculateLCS(codesA, codesB);
    const lcsScore = lcs / Math.max(codesA.length, codesB.length);

    // Combine: Jaccard gives us the "what", LCS gives us the "order"
    return (jaccard * 0.4) + (lcsScore * 0.6);
  }

  /**
   * Calculates the length of the Longest Common Subsequence of words.
   */
  private calculateLCS(a: string[], b: string[]): number {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp[m][n];
  }
  /**
   * Normalises a string for comparison by removing punctuation and smart quotes.
   */
  public normalise(str: string): string {
    return str
      .toLowerCase()
      .replace(/[\u2019\u2018’‘']/g, '') // Remove all types of apostrophes
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"”“[\]\\|<>–—]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Collapse spaces
      .trim();
  }

  /**
   * Returns an array of Soundex codes for words in the string (preserving order).
   */
  private getSoundexCodeSequence(str: string): string[] {
    const normalised = this.normalise(str);
    const words = normalised.split(' ');
    return words
      .filter(w => w.length > 0)
      .map(w => this.soundex(w))
      .filter(c => c !== '');
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
