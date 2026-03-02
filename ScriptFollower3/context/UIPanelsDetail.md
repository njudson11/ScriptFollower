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
- Full-detail rendering of script lines (Dialogue, Cues, Headings).
- **Sticky Scroll**: Automatic alignment of the active line to a consistent vertical position.
- **Interactions**: Direct playback of sound cues and manual selection.

### 4. RightPanel

**Location:** Right side  
**Width:** Fixed (350px via `--right-panel-width`)  
**Collapsible:** Collapses to a 40px icon strip.
**Responsibilities:**
- **Tabbed Interface**: Swaps between `DocumentInfoPanel` and `LineDataPanel`.
- **Mixing Hub**: Host for the `MasterAudioPanel` (when active) for virtual channel management.

### 5. DocumentInfoPanel

**Responsibilities:**
- **Metadata**: Display document name, format, and creation date.
- **Character Management**: Interface for assigning custom colors to character dialogue.
- **UI Customization**: Global color pickers for the Active Line border and Voice Match highlights.
- **Style Tree**: Hierarchical view of document-level styles.

### 6. LineDataPanel

**Responsibilities:**
- **Detail View**: Full metadata dump for the currently selected line.
- **XML Debugger**: Pretty-printed view of raw ODT/XML attributes for the line.
