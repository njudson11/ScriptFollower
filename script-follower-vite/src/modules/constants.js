export const lineTypeLabel = {
  tech: 'TECH',
  sound: 'SOUND',
  light: 'LIGHT',
  curtain: 'CURTAIN',
  dialogue: 'DIALOGUE',
  stageDirection: 'DIRECTION',
  scene: 'SCENE',
  character: 'CHARACTER',
  note: 'NOTE',
  pageNumber: 'PAGE_NUMBER',
  heading: 'HEADING',
}

export const lineTypeDocClassMap = {
  [lineTypeLabel.sound]: 'sound-cue',
  [lineTypeLabel.light]: 'lights-cue',
  [lineTypeLabel.curtain]: 'curtain-cue',
  [lineTypeLabel.stageDirection]: 'Stage-Direction',
  [lineTypeLabel.pageNumber]: 'PageNumber',
  [lineTypeLabel.dialogue]: 'dialogue',
  [lineTypeLabel.character]: 'dialogue',
  [lineTypeLabel.heading]: 'heading'
}

export const lineTypeSidebarClassMap = {
  [lineTypeLabel.sound]: 'sound-cue',
  [lineTypeLabel.light]: 'lights-cue',
  [lineTypeLabel.curtain]: 'curtain-cue',
  [lineTypeLabel.stageDirection]: 'Stage_20_Direction',
  [lineTypeLabel.pageNumber]: 'PageNumber',
  [lineTypeLabel.dialogue]: 'dialogue',
  [lineTypeLabel.heading]: 'heading'
}

export const sidebarTypeMap = {
  [lineTypeLabel.scene]: { label:'Scene', style: 'Act', level: 0 },
  [lineTypeLabel.sound]: { label:'Sound', style: 'sound-cue', level: 1 },
  [lineTypeLabel.light]: { label:'Light',style: 'lights-cue', level: 1 }
}

export const appValues={
  mobileMinWidth: 700,
  sidebarDefaultWidth: 320
}
