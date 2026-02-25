import { LineType } from '@/types/core'

export interface LineTypeConfig {
  defaultFilterValue: boolean
  // Add other line type specific configurations here in the future
}

export interface ViewerConfig {
  scrollOffsetPx: number
}

export interface AudioConfig {
  preloadCuesAhead: number
  preloadCuesBehind: number
}

export const AppConfig: {
  lineTypes: Record<LineType, LineTypeConfig>,
  viewers: {
    documentViewer: ViewerConfig,
    sidebar: ViewerConfig
  },
  audio: AudioConfig
} = {
  lineTypes: {
    // ... existing line types
    [LineType.TITLE]: {
      defaultFilterValue: false
    },
    [LineType.SUBTITLE]: {
      defaultFilterValue: false
    },
    [LineType.ACT_HEADING]: {
      defaultFilterValue: true
    },
    [LineType.SCENE_HEADING]: {
      defaultFilterValue: true
    },
    [LineType.CHARACTER_LIST]: {
      defaultFilterValue: false
    },
    [LineType.DIALOGUE]: {
      defaultFilterValue: false
    },
    [LineType.STAGE_DIRECTION]: {
      defaultFilterValue: false
    },
    [LineType.TECH_CUE]: {
      defaultFilterValue: true 
    },
    [LineType.SOUND_CUE]: {
      defaultFilterValue: true
    },
    [LineType.LIGHT_CUE]: {
      defaultFilterValue: true
    },
    [LineType.BLANK]: {
      defaultFilterValue: false
    },
    [LineType.PAGE_NUMBER]: {
      defaultFilterValue: false
    }
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
    preloadCuesBehind: 10
  }
}
