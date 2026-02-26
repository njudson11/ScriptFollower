/**
 * ODT Parser Configuration
 * Maps ODT style names and display names to internal LineType and LineSubType values
 *
 * The parser checks both the internal style name (e.g., "P1") and the display name/label
 * (e.g., "Dialogue") from the ODT document against the configured patterns.
 */

import { LineType } from '@/types/core'

/**
 * Configuration for mapping ODT styles to LineType
 */
export interface ODTStyleMapping {
  readonly lineType: LineType
  readonly lineSubType?: string
  readonly stylePatterns: readonly string[]
  readonly subtypeRules?: readonly SubtypeRule[]
}

/**
 * Rule for determining subtype based on text content using regex
 *
 * Examples:
 * - Static subtype: { subtype: 'A', pattern: '^SOUND A\t.*' }
 * - Capture group: { subtype: '$1', pattern: '^(.*?):\t.*' } // captures character name
 * - Multiple groups: { subtype: '$1-$2', pattern: '^(.*?)\s*\((.*?)\)' } // "JOHN (whispering)"
 */
export interface SubtypeRule {
  readonly subtype: string  // The subtype value, or "$1", "$2", etc. for capture groups
  readonly pattern: string  // Regex pattern to match against the line text
}

/**
 * Rule for extracting metadata from line text using regex.
 */
export interface MetadataExtractionRule {
  readonly lineType: LineType; // The line type this rule applies to
  readonly pattern: string;    // The regex pattern to match against the line text
  readonly mappings: Readonly<Record<string, string>>; // Mapping of metadata key to capture group (e.g., { characterName: '$1', dialogue: '$2' })
}

/**
 * Complete ODT parser configuration
 */
export interface ODTParserConfig {
  readonly styleMappings: readonly ODTStyleMapping[]
  readonly fallbackLineType: LineType
  readonly metadataExtractionRules?: readonly MetadataExtractionRule[];
}

/**
 * Default configuration for ODT style mappings
 * Uses style hierarchy matching - first match wins
 */
export const defaultODTConfig: ODTParserConfig = {
  styleMappings: [
    {
      lineType: LineType.BODY_TEXT,
      stylePatterns: ['Standard']
    },
    {
      lineType: LineType.TITLE,
      stylePatterns: ['Heading', 'Title']
    },
    {
      lineType: LineType.SUBTITLE,
      stylePatterns: ['Subtitle', 'Heading 2', 'Heading 3']
    },
    {
      lineType: LineType.ACT_HEADING,
      stylePatterns: ['Act']
    },
    {
      lineType: LineType.SCENE_HEADING,
      stylePatterns: ['Scene']
    },
    {
      lineType: LineType.CHARACTER_LIST,
      stylePatterns: ['Character List']
    },
    {
      lineType: LineType.DIALOGUE,
      stylePatterns: ['Dialogue'],
      subtypeRules: [
        { subtype: '$1', pattern: '^(.*?)\t.*' }  // Capture character name
      ]
    },
    {
      lineType: LineType.STAGE_DIRECTION,
      stylePatterns: ['Stage Direction'],
    },
    {
      lineType: LineType.TECH_CUE,
      stylePatterns: ['Tech', 'Effect', 'Curtains']
    },
    {
      lineType: LineType.SOUND_CUE,
      stylePatterns: ['Sound A', 'Sound B', 'Sound'],
      subtypeRules: [
        { subtype: 'A', pattern: '^SOUND A\t.*' },
        { subtype: 'B', pattern: '^SOUND B\t.*' },
        { subtype: 'A', pattern: '^SOUND\t.*' }
      ]
    },
    {
      lineType: LineType.LIGHT_CUE,
      stylePatterns: ['Light']
    },
    {
      lineType: LineType.PAGE_NUMBER,
      stylePatterns: ['Page Number']
    }
  ],
  fallbackLineType: LineType.DIALOGUE,
  metadataExtractionRules: [
    {
      lineType: LineType.DIALOGUE,
      pattern: '^(?:(.*?)\t)?(.*)$', // Assuming "CHARACTER_NAME\tDIALOGUE_TEXT"
      mappings: {
        characterName: '$1',
        dialogue: '$2'
      }
    },
    {
      lineType: LineType.SOUND_CUE,
      pattern: '^.*?\t(.*?)\\s+(.*$)', // Matches "SOUND B\t0101 – Filename.wav – Example sound cue." and extracts "0101"
      mappings: {
        soundRef: '$1',
        soundDescription: '$2' // Captures the description after the sound reference
      }
    },
    {
      lineType: LineType.LIGHT_CUE,
      pattern: '^.*?\t\\s*(.*$)', // Matches "SOUND B\t0101 – Filename.wav – Example sound cue." and extracts "0101"
      mappings: {
        lightDescription: '$1' // Optionally capture the description after the light reference
      }
    },
    {
      lineType: LineType.PAGE_NUMBER,
      pattern: '.*?Page\\s+(\\d+).*', // Matches "Page 123" and extracts the number
      mappings: {
        pageNumber: '$1'
      }
    }
  ]
}
