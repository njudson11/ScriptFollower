# UI Panels Detail

## Panel System Architecture

ScriptFollower 3 uses a modular panel system where each panel is a Vue component that can be registered, shown, hidden, or swapped dynamically.

## Panel Hierarchy

```
App.vue (Main Container)
├── Toolbar (Top fixed panel)
├── Main Content Area (Flex container)
│   ├── Sidebar (Left panel)
│   ├── DocumentViewer (Center panel)
│   └── RightPanel (Right panel)
└── StatusBar (Future: Bottom panel)
```

## Core Panels

### 1. Toolbar Panel

**Location:** Top of application  
**Height:** Fixed 60px  
**Responsibilities:**
- File upload input
- Document controls (load, reload, export)
- Search/filter controls
- Settings access

**Implementation:**
```vue
<template>
  <div class="toolbar">
    <div class="toolbar-section left">
      <button class="btn-icon" @click="openFile" title="Open Document (Ctrl+O)">
        <span class="icon">📁</span>
      </button>
      <input 
        ref="fileInput"
        type="file"
        accept=".odt,.docx,.pdf"
        @change="handleFileUpload"
        hidden
      />
      <span v-if="fileName" class="file-name">{{ fileName }}</span>
    </div>

    <div class="toolbar-section center">
      <input 
        v-model="searchQuery"
        type="text"
        placeholder="Search lines..."
        @input="handleSearch"
        class="search-input"
      />
      <select v-model="filterType" class="filter-select">
        <option value="">All Types</option>
        <option value="DIALOGUE">Dialogue</option>
        <option value="CHARACTER">Character</option>
        <option value="ACTION">Action</option>
      </select>
    </div>

    <div class="toolbar-section right">
      <button class="btn-icon" @click="toggleSettings" title="Settings (Ctrl+,)">
        <span class="icon">⚙️</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 16px;
  background: var(--color-toolbar-bg);
  border-bottom: 1px solid var(--color-border);
  gap: 16px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-section.center {
  flex: 1;
}

.search-input {
  flex: 1;
  max-width: 300px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 13px;
}

.file-name {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-left: 8px;
}
</style>
```

**Props:** `hasDocument`, `isLoading`, `fileName`  
**Events:** `file-upload`, `search`, `filter-change`, `settings-open`

### 2. Sidebar Panel

**Location:** Left side  
**Width:** 240px (resizable)  
**Responsibilities:**
- Display all script lines
- Show line numbers and types
- Highlight current selection
- Quick navigation

**Implementation:**
```vue
<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>Script</h3>
      <span class="line-count">{{ lines.length }} lines</span>
    </div>

    <div class="sidebar-content">
      <div
        v-for="line in lines"
        :key="line.id"
        :class="['line-item', { selected: line.id === selectedLineId }]"
        @click="selectLine(line.id)"
      >
        <span class="line-number">{{ line.index }}</span>
        <span :class="['line-type', `type-${line.lineType}`]">
          {{ formatLineType(line.lineType) }}
        </span>
        <span class="line-text">{{ truncate(line.text, 30) }}</span>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="btn-small" @click="scrollToSelected">
        Jump to Current
      </button>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  width: 240px;
  height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
  background: var(--color-sidebar-bg);
  border-right: 1px solid var(--color-border);
  overflow: hidden;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.line-count {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.line-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border-left: 33 solid transparent;
  transition: all 0.2s;
}

.line-item:hover {
  background: var(--color-hover);
}

.line-item.selected {
  background: var(--color-selected);
  border-left-color: var(--color-accent);
}

.line-number {
  font-size: 11px;
  color: var(--color-text-secondary);
  min-width: 30px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.line-type {
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 2px;
  font-weight: 600;
  min-width: 50px;
}

.line-type.type-CHARACTER {
  background: rgba(59, 130, 246, 0.2);
  color: rgb(59, 130, 246);
}

.line-type.type-DIALOGUE {
  background: rgba(34, 197, 94, 0.2);
  color: rgb(34, 197, 94);
}

.line-type.type-ACTION {
  background: rgba(168, 85, 247, 0.2);
  color: rgb(168, 85, 247);
}

.line-text {
  font-size: 12px;
  color: var(--color-text);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--color-border);
}

.btn-small {
  width: 100%;
  padding: 6px;
  font-size: 12px;
  background: var(--color-button-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-small:hover {
  background: var(--color-button-hover);
}
</style>
```

**Props:** `lines`, `selectedLineId`  
**Events:** `select-line`  
**Injected:** `AppStore`, `LineSelectionManager`

### 3. DocumentViewer Panel

**Location:** Center  
**Width:** Flexible (flex: 1)  
**Responsibilities:**
- Display current line with context
- Show formatting and metadata
- Display annotations
- Handle line highlighting

**Implementation:**
```vue
<template>
  <div class="document-viewer">
    <div class="viewer-header">
      <h2>{{ currentDocument?.name || 'No Document' }}</h2>
      <span class="document-info">
        {{ currentLineIndex + 1 }} / {{ lines.length }}
      </span>
    </div>

    <div class="viewer-content">
      <div v-if="!currentDocument" class="empty-state">
        <p>📄 No document loaded</p>
        <p>Open a .odt, .docx, or .pdf file to begin</p>
      </div>

      <template v-else-if="currentLine">
        <!-- Context lines before -->
        <div class="context-lines">
          <div 
            v-for="line in contextBefore"
            :key="line.id"
            class="context-line"
          >
            <span class="line-number">{{ line.index }}</span>
            <span class="line-content">{{ line.text }}</span>
          </div>
        </div>

        <!-- Current line -->
        <div class="current-line">
          <span class="line-number">{{ currentLine.index }}</span>
          <span :class="['line-type', `type-${currentLine.lineType}`]">
            {{ formatLineType(currentLine.lineType) }}
          </span>
          <span class="line-content">{{ currentLine.text }}</span>
        </div>

        <!-- Context lines after -->
        <div class="context-lines">
          <div 
            v-for="line in contextAfter"
            :key="line.id"
            class="context-line"
          >
            <span class="line-number">{{ line.index }}</span>
            <span class="line-content">{{ line.text }}</span>
          </div>
        </div>

        <!-- Annotations section -->
        <div v-if="currentLineAnnotations.length > 0" class="annotations">
          <h4>Annotations</h4>
          <div class="annotation-list">
            <div 
              v-for="anno in currentLineAnnotations"
              :key="anno.id"
              class="annotation-item"
            >
              <span class="anno-feature">{{ anno.featureId }}</span>
              <span class="anno-content">{{ formatAnnotation(anno) }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.document-viewer {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--color-viewer-bg);
  overflow: hidden;
}

.viewer-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.viewer-header h2 {
  margin: 0;
  font-size: 18px;
}

.document-info {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.viewer-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  font-family: var(--font-mono);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-secondary);
}

.empty-state p {
  margin: 8px 0;
}

.context-lines {
  margin: 16px 0;
}

.context-line {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  color: var(--color-text-secondary);
  border-left: 3px solid transparent;
}

.current-line {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--color-highlight);
  border-left: 3px solid var(--color-accent);
  margin: 8px 0;
  border-radius: 4px;
  font-weight: 500;
}

.line-number {
  font-size: 12px;
  color: var(--color-text-secondary);
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.line-type {
  font-size: 10px;
  padding: 4px 6px;
  border-radius: 2px;
  font-weight: 600;
  min-width: 60px;
}

.line-content {
  flex: 1;
  word-wrap: break-word;
}

.annotations {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.annotations h4 {
  margin: 0 0 12px 0;
  font-size: 12px;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.annotation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.annotation-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  background: var(--color-panel-bg);
  border-radius: 4px;
  font-size: 12px;
}

.anno-feature {
  font-weight: 600;
  color: var(--color-accent);
  min-width: 80px;
}

.anno-content {
  flex: 1;
  color: var(--color-text);
}
</style>
```

**Props:** `currentDocument`, `currentLine`, `selectedLineId`  
**Events:** `line-select`, `annotation-click`  
**Injected:** `AppStore`, `LineSelectionManager`

### 4. RightPanel

**Location:** Right side  
**Width:** 300px (hidden by default, shown when feature needs it)  
**Responsibilities:**
- Display feature-specific panels
- Sound controls (for Sound Feature)
- Lights editor (for Lights Feature)
- Effects controls (for Effects Feature)

**Implementation:**
```vue
<template>
  <div class="right-panel" :class="{ open: isOpen }">
    <div class="panel-header">
      <h3>{{ activeFeature?.name || 'Features' }}</h3>
      <button class="close-btn" @click="closePanel">×</button>
    </div>

    <div class="panel-content">
      <component 
        v-if="activeFeaturePanel"
        :is="activeFeaturePanel"
        v-bind="featurePanelProps"
      />
      
      <div v-else class="feature-list">
        <div 
          v-for="feature in availableFeatures"
          :key="feature.id"
          class="feature-item"
          @click="openFeature(feature.id)"
        >
          <span class="feature-name">{{ feature.name }}</span>
          <span class="feature-icon">→</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.right-panel {
  width: 0;
  overflow: hidden;
  background: var(--color-panel-bg);
  border-left: 1px solid var(--color-border);
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
}

.right-panel.open {
  width: 300px;
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--color-text);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-button-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.feature-item:hover {
  background: var(--color-button-hover);
  border-color: var(--color-accent);
}

.feature-name {
  font-size: 13px;
  font-weight: 500;
}

.feature-icon {
  color: var(--color-text-secondary);
}
</style>

<script setup>
import { computed, ref } from 'vue'
import { inject } from 'vue'

const appStore = inject('appStore')
const featureManager = inject('featureManager')

const isOpen = ref(false)
const activeFeatureId = ref(null)

const activeFeature = computed(() => {
  if (!activeFeatureId.value) return null
  return featureManager.getFeature(activeFeatureId.value)
})

const availableFeatures = computed(() => {
  return featureManager.getAllFeatures()
})

const activeFeaturePanel = computed(() => {
  if (!activeFeature.value?.panelComponent) return null
  return activeFeature.value.panelComponent
})

const featurePanelProps = computed(() => {
  return {
    currentLine: appStore.state.currentLine,
    document: appStore.state.currentDocument
  }
})

const openFeature = (featureId) => {
  activeFeatureId.value = featureId
  isOpen.value = true
}

const closePanel = () => {
  isOpen.value = false
  activeFeatureId.value = null
}
</script>
```

**Props:** None  
**Events:** `feature-open`, `feature-close`  
**Injected:** `AppStore`, `FeatureManager`

## Panel Resizing

```typescript
// Panel divider drag logic
interface DragState {
  isDragging: boolean
  startX: number
  startWidth: number
}

function handleDividerMouseDown(e: MouseEvent) {
  const dragState: DragState = {
    isDragging: true,
    startX: e.clientX,
    startWidth: sidebarElement.offsetWidth
  }

  document.addEventListener('mousemove', (e) => {
    if (!dragState.isDragging) return
    
    const delta = e.clientX - dragState.startX
    const newWidth = Math.max(120, Math.min(400, dragState.startWidth + delta))
    sidebarElement.style.width = `${newWidth}px`
  })

  document.addEventListener('mouseup', () => {
    dragState.isDragging = false
    saveUserPreference('sidebarWidth', sidebarElement.offsetWidth)
  })
}
```

## Theme Variables

```css
:root {
  /* Colors */
  --color-toolbar-bg: #ffffff;
  --color-sidebar-bg: #f5f5f5;
  --color-viewer-bg: #ffffff;
  --color-panel-bg: #f5f5f5;
  --color-border: #e0e0e0;
  --color-text: #000000;
  --color-text-secondary: #666666;
  --color-hover: #f0f0f0;
  --color-selected: #e3f2fd;
  --color-highlight: #fffacd;
  --color-accent: #2196f3;
  --color-button-bg: #f5f5f5;
  --color-button-hover: #eeeeee;

  /* Fonts */
  --font-mono: 'Courier New', monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Dark theme */
@media (prefers-color-scheme: dark) {
  :root {
    --color-toolbar-bg: #1e1e1e;
    --color-sidebar-bg: #252526;
    --color-viewer-bg: #1e1e1e;
    --color-panel-bg: #252526;
    --color-border: #3e3e42;
    --color-text: #e0e0e0;
    --color-text-secondary: #858585;
    --color-hover: #2d2d30;
    --color-selected: #094771;
    --color-highlight: #332b0f;
    --color-accent: #569cd6;
    --color-button-bg: #3e3e42;
    --color-button-hover: #464647;
  }
}
```

## Accessibility

Each panel follows WCAG 2.1 AA standards:

- **Keyboard Navigation:** Tab order maintained, arrow keys for lists
- **Screen Readers:** ARIA labels on all interactive elements
- **Color Contrast:** Minimum 4.5:1 for text
- **Focus Indicators:** Visible focus rings on all focusable elements

```vue
<!-- Accessible sidebar item -->
<div
  role="button"
  :aria-pressed="selected"
  :aria-label="`Line ${line.index}: ${line.text}`"
  :tabindex="0"
  @click="selectLine"
  @keydown.enter="selectLine"
  @keydown.space="selectLine"
>
  {{ line.text }}
</div>
```

## Future Panels

### Bottom Panel (StatusBar)
- Show document statistics
- Display errors/warnings
- Show feature status indicators

### Command Palette
- Quick access to all commands
- Fuzzy search by name/keybinding
- Show feature commands

### Problems Panel
- List all errors and warnings
- Quick navigation to problem location
- Suggested fixes

