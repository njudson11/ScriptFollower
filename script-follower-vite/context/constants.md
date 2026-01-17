# constants.js

## Purpose

The `constants.js` file serves as a centralized repository for constant values used throughout the ScriptFollower application. This approach helps in avoiding magic strings and numbers, making the code more readable, maintainable, and less prone to errors.

## Functionality

This module exports several constant objects that define mappings and configuration values for different parts of the application.

### `lineTypeLabel`

An object that maps various line types found in a script to consistent, uppercase string labels. This is used to identify the type of each line during processing and rendering.

- **`tech`**: 'TECH'
- **`sound`**: 'SOUND'
- **`light`**: 'LIGHT'
- **`curtain`**: 'CURTAIN'
- **`dialogue`**: 'DIALOGUE'
- **`stageDirection`**: 'DIRECTION'
- **`scene`**: 'SCENE'
- **`character`**: 'CHARACTER'
- **`note`**: 'NOTE'
- **`pageNumber`**: 'PAGE_NUMBER'
- **`heading`**: 'HEADING'

### `lineTypeDocClassMap`

An object that maps `lineTypeLabel` values to the corresponding CSS class names to be used in the `DocumentViewer` component. This allows for specific styling of different line types.

- `[lineTypeLabel.sound]`: 'sound-cue'
- `[lineTypeLabel.light]`: 'lights-cue'
- `[lineTypeLabel.curtain]`: 'curtain-cue'
- `[lineTypeLabel.stageDirection]`: 'Stage-Direction'
- `[lineTypeLabel.pageNumber]`: 'PageNumber'
- `[lineTypeLabel.dialogue]`: 'dialogue'
- `[lineTypeLabel.character]`: 'dialogue'
- `[lineTypeLabel.heading]`: 'heading'

### `lineTypeSidebarClassMap`

Similar to `lineTypeDocClassMap`, this object maps `lineTypeLabel` values to CSS class names specifically for use in the `Sidebar` component.

- `[lineTypeLabel.sound]`: 'sound-cue'
- `[lineTypeLabel.light]`: 'lights-cue'
- `[lineTypeLabel.curtain]`: 'curtain-cue'
- `[lineTypeLabel.stageDirection]`: 'Stage_20_Direction'
- `[lineTypeLabel.pageNumber]`: 'PageNumber'
- `[lineTypeLabel.dialogue]`: 'dialogue'
- `[lineTypeLabel.heading]`: 'heading'

### `sidebarTypeMap`

An object that defines the properties for items that are displayed in the `Sidebar`. It maps a `lineTypeLabel` to an object containing its display `label`, CSS `style`, and indentation `level`. This is used to configure the filter options and rendering of items in the sidebar.

- `[lineTypeLabel.scene]`: `{ label:'Scene', style: 'Act', level: 0 }`
- `[lineTypeLabel.sound]`: `{ label:'Sound', style: 'sound-cue', level: 1 }`
- `[lineTypeLabel.light]`: `{ label:'Light',style: 'lights-cue', level: 1 }`

### `appValues`

An object containing general application-wide configuration values.

- **`mobileMinWidth`**: `700` - The minimum width in pixels to be considered a non-mobile display.
- **`sidebarDefaultWidth`**: `320` - The default width of the sidebar in pixels.
