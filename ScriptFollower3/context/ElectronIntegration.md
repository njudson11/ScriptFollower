# Electron Integration Plan

## Overview
Converting ScriptFollower 3 into an Electron application will bridge the gap between web-based security restrictions and the needs of a professional production tool. It will allow for direct file system access, enabling features like "Auto-load sounds from script directory" and "Project Persistence."

## Implementation Steps

### 1. Project Configuration
- Install Electron dependencies: `npm install --save-dev electron electron-builder`.
- Configure `package.json` with `main` entry point and build scripts.
- Update `vite.config.ts` to support Electron's renderer process.

### 2. Main Process Setup
- Create `src/electron/main.ts` to manage application windows.
- Implement IPC (Inter-Process Communication) handlers for system-level tasks.
- Add native menus (File > Open Project, File > Save).

### 3. Native File System Access
- Replace the web-based `input type="file"` with Electron's `dialog.showOpenDialog`.
- Implement a "Project Directory" watcher using `chokidar` to update the UI when files are added/removed from the local folder.

### 4. Direct Audio Loading
- Use `protocol.registerFileProtocol` to allow the Vue frontend to stream local audio files without creating hundreds of temporary Object URLs.
- Remove the current limitation of needing to manually select a sound folder.

## Functionality Gains

### 📂 Native File Management
- **Automatic Project Loading:** Opening an `.odt` file can automatically trigger a scan of the parent folder for a `sounds/` sub-directory.
- **Save State:** Persist user settings, volume levels, and custom annotations directly back to the project folder or a sidecar config file.

### 🎧 Enhanced Audio
- **Low-Latency Playback:** Direct access to system audio drivers.
- **Multiple Output Routing:** Route sound cues to specific hardware outputs (e.g., house speakers vs. monitor) which is restricted in standard browsers.

### 🖥️ Desktop Experience
- **System Media Keys:** Use keyboard volume/play/pause buttons even when the app isn't focused.
- **Custom Window Chrome:** A professional, distraction-free interface for use in dark tech booths.
- **Offline Reliability:** Guaranteed performance without browser cache management issues.
