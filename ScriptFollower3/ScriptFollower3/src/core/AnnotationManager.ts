import { Annotation } from '@/types/core'

/**
 * Manages the parsing, validation, and serialization of line annotations.
 * Format: {key1=value1, key2=value2}
 */
export class AnnotationManager {
  private registeredAnnotations: Map<string, Map<string, Annotation>> = new Map()

  /**
   * Registers annotation definitions for a specific feature.
   */
  registerFeatureAnnotations(featureId: string, annotations: Annotation[]): void {
    if (!this.registeredAnnotations.has(featureId)) {
      this.registeredAnnotations.set(featureId, new Map())
    }
    const featureMap = this.registeredAnnotations.get(featureId)!
    annotations.forEach(a => featureMap.set(a.name, a))
  }

  /**
   * Parses an annotation string into a raw key-value map.
   * This parser correctly handles values that contain commas, such as bracketed lists.
   */
  parseRaw(annotationStr: string | undefined): Map<string, string> {
    const map = new Map<string, string>();
    if (!annotationStr) return map;

    const contentMatch = annotationStr.match(/\{([^}]+)\}/);
    if (!contentMatch) return map;
    
    const content = contentMatch[1].trim();
    if (!content) return map;

    // A more robust way to split, accounting for values in brackets
    const pairs: string[] = [];
    let currentPair = '';
    let inBrackets = false;
    for (const char of content) {
        if (char === '[') {
            inBrackets = true;
        } else if (char === ']') {
            inBrackets = false;
        }

        if (char === ',' && !inBrackets) {
            pairs.push(currentPair.trim());
            currentPair = '';
        } else {
            currentPair += char;
        }
    }
    if (currentPair) {
        pairs.push(currentPair.trim());
    }

    for (const pair of pairs) {
        const equalIdx = pair.indexOf('=');
        if (equalIdx !== -1) {
            const key = pair.substring(0, equalIdx).trim();
            const value = pair.substring(equalIdx + 1).trim();
            if (key) {
                map.set(key, value);
            }
        }
    }
    
    return map;
  }

  /**
   * Serializes a raw map back into an annotation string.
   */
  serializeRaw(annotations: Map<string, string>): string {
    if (annotations.size === 0) return ''
    const parts: string[] = []
    annotations.forEach((value, key) => {
      parts.push(`${key}=${value}`)
    })
    return `{${parts.join(', ')}}`
  }

  /**
   * Updates an annotation string by merging new values into the braced key-value block.
   * Preserves any text outside of the braces.
   * If a value is null, the key is removed. If the resulting block is empty, the block is removed.
   */
  update(existingStr: string | undefined, updates: Record<string, string | number | boolean | null>): string {
    const fullStr = existingStr || ''
    const annotationRegex = /\{([^}]+)\}/
    const match = fullStr.match(annotationRegex)

    const map = this.parseRaw(existingStr)

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        map.delete(key)
      } else {
        map.set(key, String(value))
      }
    })

    const newAnnotationBlock = this.serializeRaw(map)

    if (match) {
      // If there was an existing annotation block, replace it
      if (newAnnotationBlock) {
        return fullStr.replace(annotationRegex, newAnnotationBlock)
      } else {
        // If the new block is empty, remove the old one and trim whitespace
        return fullStr.replace(annotationRegex, '').trim().replace(/ +/g,' ')
      }
    } else {
      // If no block existed, append the new one
      if (newAnnotationBlock) {
        return `${fullStr} ${newAnnotationBlock}`.trim()
      } else {
        return fullStr // Nothing to add
      }
    }
  }

  /**
   * Merges updates into an existing annotation string.
   * If a value is null, the key is removed.
   * @deprecated Use `update` to preserve surrounding text. This method will be removed.
   */
  merge(existingStr: string | undefined, updates: Record<string, string | number | boolean | null>): string {
    const map = this.parseRaw(existingStr)
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        map.delete(key)
      } else {
        map.set(key, String(value))
      }
    })

    return this.serializeRaw(map)
  }

  /**
   * Gets the parsed and validated value for a specific annotation on a line.
   */
  getValue(annotationStr: string | undefined, key: string): any {
    const rawMap = this.parseRaw(annotationStr)
    const rawValue = rawMap.get(key)
    if (rawValue === undefined) return undefined

    // Find the definition to parse correctly
    for (const featureMap of this.registeredAnnotations.values()) {
      const def = featureMap.get(key)
      if (def) {
        try {
          const parsed = def.parseValue(rawValue)
          return def.validateValue(parsed) ? parsed : def.defaultValue
        } catch {
          return def.defaultValue
        }
      }
    }

    return rawValue
  }
}
