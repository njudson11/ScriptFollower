import { Document, ScriptLineBase, LineType, MetadataExtractionRule } from '@/types/core'

/**
 * Generic Document Post-Processor
 * Handles common enhancements like metadata extraction and page number propagation
 * regardless of the original document format.
 */
export class DocumentPostProcessor {
  /**
   * Process a document to enhance its lines with metadata and page numbers
   */
  public static process(document: Document, extractionRules: MetadataExtractionRule[] = []): Document {
    console.log(`[DocumentPostProcessor] Processing document: ${document.name} with ${extractionRules.length} rules`);
    
    const lines = [...document.lines]
    
    // 1. Apply metadata extraction rules
    if (extractionRules.length > 0) {
      this.applyExtractionRules(lines, extractionRules)
    } else {
      console.warn('[DocumentPostProcessor] No extraction rules provided');
    }

    // 2. Propagate character names for dialogue lines
    this.propagateCharacterNames(lines)

    // 3. Propagate page numbers (reverse propagation as page numbers typically appear at the END of a page in ODT)
    const linesWithPageNumbers = this.propagatePageNumbers(lines)

    console.log(`[DocumentPostProcessor] Completed processing ${linesWithPageNumbers.length} lines`);
    return {
      ...document,
      lines: linesWithPageNumbers
    }
  }

  /**
   * Apply regex-based extraction rules to populate line metadata
   */
  private static applyExtractionRules(lines: ScriptLineBase[], rules: MetadataExtractionRule[]): void {
    let matchCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const applicableRules = rules.filter(r => r.lineType === line.lineType)

      if (applicableRules.length === 0) continue

      // Allow multiple rules to apply to the same line
      const updatedMetadata = { ...line.metadata } as Record<string, any>
      let hasMatches = false

      for (const rule of applicableRules) {
        try {
          const regex = new RegExp(rule.pattern)
          const match = line.text.match(regex)

          if (match) {
            hasMatches = true
            matchCount++;
            
            for (const [key, captureGroupRef] of Object.entries(rule.mappings)) {
              // Extract the group index from strings like "$1", "$2"
              const groupIndexMatch = captureGroupRef.match(/^\$(\d+)$/);
              if (groupIndexMatch) {
                const groupIndex = parseInt(groupIndexMatch[1]);
                if (groupIndex >= 0 && groupIndex < match.length) {
                  const val = (match[groupIndex] || "").trim();
                  updatedMetadata[key] = val;
                }
              } else {
                // If it's not a $ group reference, maybe it's a static value?
                updatedMetadata[key] = captureGroupRef;
              }
            }
          }
        } catch (e) {
          console.warn(`[DocumentPostProcessor] Invalid regex pattern: ${rule.pattern}`, e)
        }
      }

      if (hasMatches) {
        // If we updated characterName, also update lineSubType for consistency
        let updatedSubType = line.lineSubType;
        if (line.lineType === LineType.DIALOGUE && updatedMetadata.characterName) {
          updatedSubType = updatedMetadata.characterName;
        }

        // Since ScriptLineBase properties are readonly, we have to create a new object
        lines[i] = {
          ...line,
          lineSubType: updatedSubType,
          metadata: Object.freeze(updatedMetadata) // Keep it frozen as per core expectations
        }
      }
    }
    
    console.log(`[DocumentPostProcessor] Applied rules to ${matchCount} lines`);
  }

  /**
   * Propagate character names forward for dialogue lines that don't have one
   */
  private static propagateCharacterNames(lines: ScriptLineBase[]): void {
    let lastCharacterName: string | null = null
    let propagationCount = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.lineType === LineType.DIALOGUE) {
        const metadata = line.metadata as any
        const currentName = metadata.characterName

        if (currentName && currentName.trim() !== "") {
          // Update the last known character name
          lastCharacterName = currentName.trim()
          
          // Ensure lineSubType matches the extracted character name even if not propagated
          if (line.lineSubType !== lastCharacterName) {
            lines[i] = {
              ...line,
              lineSubType: lastCharacterName
            }
          }
        } else if (lastCharacterName) {
          // Propagate the last known name if current line is missing it
          const updatedMetadata = { ...line.metadata, characterName: lastCharacterName }
          lines[i] = {
            ...line,
            lineSubType: lastCharacterName, // Update subtype to match the propagated character
            metadata: Object.freeze(updatedMetadata)
          }
          propagationCount++
        }
      }
    }

    if (propagationCount > 0) {
      console.log(`[DocumentPostProcessor] Propagated character names to ${propagationCount} lines`);
    }
  }

  /**
   * Propagate page numbers throughout the document
   * Currently uses reverse propagation (bottom-up) which is common for ODT headers/footers
   */
  private static propagatePageNumbers(lines: ScriptLineBase[]): ScriptLineBase[] {
    const result: ScriptLineBase[] = new Array(lines.length)
    let currentPageNumber: number | null = null

    // Iterate backwards to propagate page numbers up from the markers
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]
      let pageNumForLine = currentPageNumber

      if (line.lineType === LineType.PAGE_NUMBER) {
        // Try to get page number from metadata (populated by extraction rules)
        // or directly from the text if metadata failed
        const metadata = line.metadata as any
        let extractedPage = parseInt(metadata.pageNumber)
        
        if (isNaN(extractedPage)) {
          const textMatch = line.text.match(/(\d+)/);
          if (textMatch) {
            extractedPage = parseInt(textMatch[1]);
          }
        }

        if (!isNaN(extractedPage)) {
          currentPageNumber = extractedPage
          pageNumForLine = currentPageNumber
        }
      }

      result[i] = {
        ...line,
        pageNumber: pageNumForLine
      }
    }

    return result
  }
}
