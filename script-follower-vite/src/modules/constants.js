export const lineTypeLabel = {
  tech: 'TECH',
  sound: 'SOUND',
  light: 'LIGHT',
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
  [lineTypeLabel.stageDirection]: 'Stage-Direction',
  [lineTypeLabel.pageNumber]: 'PageNumber',
  [lineTypeLabel.dialogue]: 'dialogue',
  [lineTypeLabel.character]: 'dialogue',
  [lineTypeLabel.heading]: 'heading'
}

export const lineTypeSidebarClassMap = {
  [lineTypeLabel.sound]: 'sound-cue',
  [lineTypeLabel.light]: 'lights-cue',
  [lineTypeLabel.stageDirection]: 'Stage_20_Direction',
  [lineTypeLabel.pageNumber]: 'PageNumber',
  [lineTypeLabel.dialogue]: 'dialogue',
  [lineTypeLabel.heading]: 'heading'
}

export const sidebarTypeMap = {
  [lineTypeLabel.scene]: { style: 'Act', level: 0 },
  [lineTypeLabel.sound]: { style: 'sound-cue', level: 1 },
  [lineTypeLabel.light]: { style: 'lights-cue', level: 1 }
}
