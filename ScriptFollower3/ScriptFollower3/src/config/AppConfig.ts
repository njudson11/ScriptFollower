import { LineType } from '@/types/core'

export interface LineTypeConfig {
  defaultFilterValue: boolean
  // Add other line type specific configurations here in the future
}

export interface ViewerConfig {
  scrollOffsetPx: number
}

export const AppConfig: {
  lineTypes: Record<LineType, LineTypeConfig>,
  viewers: {
    documentViewer: ViewerConfig,
    sidebar: ViewerConfig
  }
} = {
  lineTypes: {
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
      defaultFilterValue: true // Often hidden by default
    },
    [LineType.SOUND_CUE]: {
      defaultFilterValue: true // Often hidden by default
    },
    [LineType.LIGHT_CUE]: {
      defaultFilterValue: true // Often hidden by default
    },
    [LineType.BLANK]: {
      defaultFilterValue: false // Blank lines often hidden by default
    },
    [LineType.PAGE_NUMBER]: {
      defaultFilterValue: false // Page numbers often hidden by default
    }
  },
  viewers: {
    documentViewer: {
      scrollOffsetPx: 300 // Default scroll offset for document viewer
    },
    sidebar: {
      scrollOffsetPx: 300 // Default scroll offset for sidebar
    }
  }
}
