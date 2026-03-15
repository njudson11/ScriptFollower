# UI Panels Detail

## Core Panels

### 1. Toolbar

**Location:** Top of application  
**Height:** Fixed (36px via `--toolbar-height`)  
**Responsibilities:**
- File upload for Documents (.odt) and Sound Folders.
- **Search**: Global script text search with match navigation.
- **Voice Controls**: Toggle for voice recognition engine and "Auto-Focus" mode.
- **Navigation**: Editable page number display for current line.
- **Live Feedback**: Real-time transcript display for voice recognition.

### 2. Sidebar

**Location:** Left side  
**Width:** Fixed (200px via `--sidebar-width`)  
**Responsibilities:**
- Vertical list of all visible script lines.
- **Filtering**: Integration with `LineTypeFilter` to show/hide specific types.
- **Active Line Tracking**: Visual highlighting of the current line or the nearest visible neighbor.
- **Overall Progress**: Sidebar progress bar indicating the active position relative to the document.
- **Context Rendering**: Simplified line rendering for narrow column display.

### 3. DocumentViewer

**Location:** Center  
**Width:** Flexible (flex: 1)  
**Responsibilities:**
- Primary script reading interface.
- **Standardized Line Stack**: All line renderers follow a vertical standard:
    1. **Content Row**: The main text (e.g., Dialogue, Stage Direction).
    2. **Control Row**: Contextual buttons (like **Trigger** or Play) and status (remaining time).
    3. **Annotation Row**: Brace-syntax metadata.
- **Sticky Scroll**: Automatic alignment of the active line to a consistent vertical position.
- **Interactions**: Direct playback of sound cues and manual trigger of actions.

### 4. RightPanel

**Location:** Right side  
**Width:** Fixed (350px via `--right-panel-width`)  
**Collapsible:** Collapses to a 40px icon strip.
**Responsibilities:**
- Context-sensitive data managed through a tabbed interface.

#### Tabs:
- **Action (Contextual)**: 
    - The default tab when a line with actions is selected.
    - Displays specialized controls like the `SoundCuePanel` (for audio) or `BaseCuePanel` (for shared stop/end logic).
- **Master Audio**: Detailed virtual channel mixing desk and hardware output routing.
- **Line Data**:
    - **Detail View**: Full metadata dump for the currently selected line.
    - **XML Debugger**: Pretty-printed view of raw ODT/XML attributes for the line.
- **Doc Info**: Global project settings, character colour mapping, and hierarchical style tree.

### 5. TouchControls

**Location:** Screen overlay (bottom-right)  
**Responsibilities:**
- Large navigation buttons (Up / Trigger / Down) for tablet use.
- Automatically toggles visibility based on touch-device detection.
