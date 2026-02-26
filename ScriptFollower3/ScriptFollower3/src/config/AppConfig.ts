import { LineType } from '@/types/core'

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
  defaultPan: 'left' | 'right' | 'center'
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

export const AppConfig: {
  lineTypes: Record<LineType, LineTypeConfig>
  viewers: {
    documentViewer: ViewerConfig
    sidebar: ViewerConfig
  }
  audio: AudioConfig
  layout: LayoutConfig
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
    defaultPan: 'center',
    baseChannelId: 'A',
    refreshIntervalMs: 100,
    supportedExtensions: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
    soundRefRegex: /^([a-zA-Z0-9_-]+)/
  },
  layout: {
    sidebarWidth: '200px',
    rightPanelWidth: '350px',
    collapsedPanelWidth: '40px'
  }
}
