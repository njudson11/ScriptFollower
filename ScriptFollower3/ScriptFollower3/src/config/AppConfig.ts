import { LineType, MetadataExtractionRule, TextMatcherOptions } from '@/types/core'

/**
 * UI representation and filtering behavior for different script line types.
 */
export interface LineTypeConfig {
  label: string // The display name used in the filter menu and line labels
  defaultFilterValue: boolean // Whether this line type is visible by default in the Document Viewer
}

/**
 * Controls the behavior of the scrolling document views.
 */
export interface ViewerConfig {
  /** 
   * Distance from the top of the viewport to maintain when auto-scrolling to a line.
   * Impact: Higher values keep the 'current' line lower on the screen.
   */
  scrollOffsetPx: number 
}

/**
 * Engine settings for the Audio Feature and Sound Cue management.
 */
export interface AudioConfig {
  preloadCuesAhead: number // Number of upcoming sound cues to buffer in memory
  preloadCuesBehind: number // Number of past sound cues to keep in memory for backtracking
  defaultVolume: number // Global master volume (0.0 to 1.0)
  defaultChannelVolume: number // Initial volume level for newly created virtual channels
  defaultPan: 'left' | 'right' | 'centre' // Initial stereo position
  baseChannelId: string // The default virtual mixer channel (e.g., 'A')
  refreshIntervalMs: number // Polling rate for UI updates (playback progress bars)
  supportedExtensions: string[] // Allowed audio file formats for the Sound Feature
  /** 
   * Regex used to isolate the unique ID of a sound cue from the extracted reference text.
   * Impact: Must match the beginning of your sound filenames (e.g., "0101" from "0101-effect.wav").
   */
  soundRefRegex: RegExp 
  soundRegex?: RegExp
}

/**
 * Fixed layout dimensions for the application's grid system.
 */
export interface LayoutConfig {
  sidebarWidth: string
  rightPanelWidth: string
  collapsedPanelWidth: string
}

/**
 * General UI state preferences.
 */
export interface UIConfig {
  documentInfo: {
    defaultStylesCollapsed: boolean
  }
}

/**
 * Rule for determining a line's Subtype (e.g., Character Name or Sound Channel)
 * based on its text content during the initial parse.
 */
export interface SubtypeRule {
  readonly subtype: string  // The subtype value, or "$1", "$2", etc. for capture groups
  readonly pattern: string  // Regex pattern to match against the line text
}

/**
 * Maps Word/LibreOffice styles to internal LineTypes.
 * 
 * Impact: This is the primary way the app distinguishes between Dialogue and Sound Cues.
 * If a script isn't parsing correctly, check these style names.
 */
export interface StyleMapping {
  readonly lineType: LineType
  readonly lineSubType?: string
  readonly stylePatterns: readonly string[]
  readonly subtypeRules?: readonly SubtypeRule[]
}

/**
 * Configuration for the document ingestion pipeline.
 */
export interface ParsingConfig {
  /** 
   * Rules used by the DocumentPostProcessor to extract data (like page numbers or sound filenames)
   * from raw text strings after the initial parse.
   */
  metadataExtractionRules: MetadataExtractionRule[] 
  styleMappings: StyleMapping[] // Links document styles to the app's internal logic
  fallbackLineType: LineType // Assigned if no style matches are found
}

/**
 * Configuration for the Speech Recognition and "Follow" engine.
 */
export interface VoiceConfig {
  setFocusOnMatch: boolean // If true, successfully matched lines are also selected/focused
  language: string // BCP 47 language tag for the Web Speech API
  /** 
   * How long a line stays visually "highlighted" as a match before fading.
   */
  matchLingerMs: number 
  /**
   * Fuzzy matching parameters for comparing spoken text against script dialogue.
   */
  textMatcher: TextMatcherOptions
}

/**
 * Central application configuration object.
 */
export const AppConfig: {
  lineTypes: Record<LineType, LineTypeConfig>
  viewers: {
    documentViewer: ViewerConfig
    sidebar: ViewerConfig
  }
  audio: AudioConfig
  layout: LayoutConfig
  ui: UIConfig
  parsing: ParsingConfig
  voice: VoiceConfig
} = {
  lineTypes: {
    [LineType.TITLE]: { label: 'Title', defaultFilterValue: false },
    [LineType.SUBTITLE]: { label: 'Subtitle', defaultFilterValue: false },
    [LineType.ACT_HEADING]: { label: 'Act Heading', defaultFilterValue: true },
    [LineType.SCENE_HEADING]: { label: 'Scene Heading', defaultFilterValue: true },
    [LineType.CHARACTER_LIST]: { label: 'Character List', defaultFilterValue: false },
    [LineType.DIALOGUE]: { label: 'Dialogue', defaultFilterValue: false },
    [LineType.STAGE_DIRECTION]: { label: 'Stage Direction', defaultFilterValue: false },
    [LineType.TECH_CUE]: { label: 'Tech Cue', defaultFilterValue: true },
    [LineType.SOUND_CUE]: { label: 'Sound Cue', defaultFilterValue: true },
    [LineType.LIGHT_CUE]: { label: 'Light Cue', defaultFilterValue: true },
    [LineType.BLANK]: { label: 'Blank Line', defaultFilterValue: false },
    [LineType.PAGE_NUMBER]: { label: 'Page Number', defaultFilterValue: false },
    [LineType.BODY_TEXT]: { label: 'Body Text', defaultFilterValue: false }
  },
  viewers: {
    documentViewer: {
      scrollOffsetPx: 300 
    },
    sidebar: {
      scrollOffsetPx: 300
    }
  },
  audio: {
    preloadCuesAhead: 20,
    preloadCuesBehind: 10,
    defaultVolume: 1.0,
    defaultChannelVolume: 1.0,
    defaultPan: 'centre',
    baseChannelId: 'A',
    refreshIntervalMs: 100,
    supportedExtensions: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
    soundRefRegex: /^([a-zA-Z0-9_]+)/
  },
  layout: {
    sidebarWidth: '200px',
    rightPanelWidth: '350px',
    collapsedPanelWidth: '40px'
  },
  ui: {
    documentInfo: {
      defaultStylesCollapsed: true
    }
  },
  voice: {
    setFocusOnMatch: false,
    language: 'en-GB',
    matchLingerMs: 3000,
    textMatcher: {
      preWindow: 5,
      postWindow: 15,
      threshold: 0.3,
      weights: {
        maxPreWeight: 1.5,
        maxPostWeight: 2.0
      }
    }
  },
  parsing: {
    /**
     * If the parser cannot find a matching style in styleMappings, 
     * it defaults to this type. Dialogue is the safest bet for technical theater.
     */
    fallbackLineType: LineType.DIALOGUE,
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
        /**
         * Subtype rules allow us to extract the Character Name during the initial scan.
         * Pattern: Capture everything before a colon or tab.
         */
        subtypeRules: [
          { subtype: '$1', pattern: '^([^:\\t]+):?\\t.*' }  // Capture character name, excluding trailing colon
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
        /**
         * Matches multiple variations of sound styles often found in different template versions.
         * Subtype rules here map the prefix (e.g., "SOUND A") to a specific virtual channel
         * in the audio engine.
         */
        stylePatterns: ['Sound A', 'Sound B', 'Sound','Sound_20_A','Sound_20_B'],
        subtypeRules: [
          // More robust rules for Sound A/B, matching the visible text prefix.
          // These patterns are case-insensitive and allow any characters after the channel identifier,
          // making them highly resilient to variations in whitespace or other characters.
          { subtype: 'A', pattern: '^[sS][oO][uU][nN][dD]\\s+[aA].*' },
          { subtype: 'B', pattern: '^[sS][oO][uU][nN][dD]\\s+[bB].*' },
          // Generic "SOUND" cue, defaults to channel A if no specific channel (A/B) is found.
          // This also uses a flexible pattern to match "Sound" followed by any characters.
          { subtype: 'A', pattern: '^[sS][oO][uU][nN][dD].*' }
        ]
      },
      {
        lineType: LineType.LIGHT_CUE,
        stylePatterns: ['Light']
      },
      {
        lineType: LineType.PAGE_NUMBER,
        stylePatterns: ['Page Number','PageNumber']
      }
    ],
    metadataExtractionRules: [
      {
        /**
         * Separates the character's name from what they are actually saying.
         * Example: "HAMLET: To be or not to be" -> { characterName: "HAMLET", dialogue: "To be or not to be" }
         */
        lineType: LineType.DIALOGUE,
        pattern: '^(?:([^:\t]+):?\t)?(.*)$', // Matches "CHARACTER_NAME:\tDIALOGUE_TEXT", excluding the colon from name
        mappings: {
          characterName: '$1',
          dialogue: '$2'
        }
      },
      {
        /**
         * Extracts the sound ID and description. 
         * The regex is designed to be robust against different types of dashes (hyphen, en-dash, em-dash).
         * Example: "SOUND B 0101 – Explosion" -> { soundRef: "0101", soundDescription: "Explosion" }
         */
        lineType: LineType.SOUND_CUE,
        pattern: '^.*?\t(.*?)(?:\\s|–|—|-)+(.*$)', // Matches "SOUND B\t0101 – Filename.wav – Example sound cue." and extracts "0101"
        mappings: {
          soundRef: '$1',
          soundDescription: '$2' // Captures the description after the sound reference
        }
      },
      {
        /**
         * Extracts the description for light cues after the leading tab.
         */
        lineType: LineType.LIGHT_CUE,
        pattern: '^.*?\t\\s*(.*$)', // Matches "LIGHT\tDescription"
        mappings: {
          lightDescription: '$1' // Optionally capture the description after the light reference
        }
      },
      {
        /**
         * Locates the page number within a line. 
         * Used for the reverse page number propagation feature.
         */
        lineType: LineType.PAGE_NUMBER,
        pattern: '.*?Page\\s+(\\d+).*', // Matches "Page 123" and extracts the number
        mappings: {
          pageNumber: '$1'
        }
      }
    ]
  }
}
