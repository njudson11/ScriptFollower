import { LineType, MetadataExtractionRule, TextMatcherOptions } from '@/types/core'

export interface LineTypeConfig {
  label: string
  defaultFilterValue: boolean
}

export interface ViewerConfig {
  scrollOffsetPx: number
}

export interface AudioConfig {
  preloadCuesAhead: number
  preloadCuesBehind: number
  defaultVolume: number
  defaultChannelVolume: number // New: default volume for virtual channels
  defaultPan: 'left' | 'right' | 'centre'
  baseChannelId: string
  refreshIntervalMs: number
  supportedExtensions: string[]
  soundRefRegex: RegExp
  soundRegex?: RegExp
}

export interface LayoutConfig {
  sidebarWidth: string
  rightPanelWidth: string
  collapsedPanelWidth: string
}

export interface UIConfig {
  documentInfo: {
    defaultStylesCollapsed: boolean
  }
}

/**
 * Rule for determining subtype based on text content using regex
 */
export interface SubtypeRule {
  readonly subtype: string  // The subtype value, or "$1", "$2", etc. for capture groups
  readonly pattern: string  // Regex pattern to match against the line text
}

/**
 * Configuration for mapping document styles to LineType
 */
export interface StyleMapping {
  readonly lineType: LineType
  readonly lineSubType?: string
  readonly stylePatterns: readonly string[]
  readonly subtypeRules?: readonly SubtypeRule[]
}

export interface ParsingConfig {
  metadataExtractionRules: MetadataExtractionRule[]
  styleMappings: StyleMapping[]
  fallbackLineType: LineType
}

export interface VoiceConfig {
  setFocusOnMatch: boolean
  language: string
  matchLingerMs: number
  textMatcher: TextMatcherOptions
}

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
    soundRefRegex: /^([a-zA-Z0-9_-]+)/
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
        stylePatterns: ['Page Number','PageNumber']
      }
    ],
    metadataExtractionRules: [
      {
        lineType: LineType.DIALOGUE,
        pattern: '^(?:([^:\t]+):?\t)?(.*)$', // Matches "CHARACTER_NAME:\tDIALOGUE_TEXT", excluding the colon from name
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
        pattern: '^.*?\t\\s*(.*$)', // Matches "LIGHT\tDescription"
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
}
