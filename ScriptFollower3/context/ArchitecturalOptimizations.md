# Architectural & Performance Optimizations

This document outlines high-impact recommendations for ScriptFollower 3, focusing on scalability, type safety, and production-grade reliability.

## 1. Performance Enhancements

### Virtual Scrolling ✅ (Completed)
*   **Context**: Prevents browser slowdowns for large scripts (>500 lines).
*   **Implementation**: `useVirtualScroll` composable manages dynamic line heights and only renders visible elements.
*   **Impact**: drastically reduces DOM node count, improves scroll smoothness, and decreases memory usage.

### Web Worker Offloading
*   **Context**: `ODTParser` and `DocumentPostProcessor` perform heavy XML parsing and regex operations on the main thread.
*   **Optimization**: Move the entire parsing pipeline (including ZIP extraction) into a dedicated Web Worker.
*   **Impact**: Keeps the UI responsive during document loading; prevents "Application not responding" warnings on large files.

### Audio Resource Management
*   **Context**: `URL.createObjectURL` is used for sound files but never revoked.
*   **Optimization**: Implement a lifecycle manager for Blob URLs that calls `URL.revokeObjectURL()` whenever a document is unloaded or a project folder is re-scanned.
*   **Impact**: Prevents memory leaks during long-running sessions or frequent document swaps.

---

## 2. Structural Refinements

### Strict Metadata Schemas
*   **Context**: `ScriptLineBase.metadata` is currently an open `Record<string, any>`, leading to frequent use of the `any` cast.
*   **Optimization**: Implement a discriminated union for metadata based on `LineType`.
    ```typescript
    interface DialogueMetadata { characterName: string; dialogue: string; }
    interface SoundCueMetadata { soundRef: string; soundDescription: string; sound?: SoundCue; }
    type LineMetadata = DialogueMetadata | SoundCueMetadata | ...;
    ```
*   **Impact**: Eliminates runtime errors, improves IDE autocompletion, and makes component logic (like `DialogueLine.vue`) much safer.

### Persistence Layer ✅ (Completed)
*   **Context**: Application state was lost on refresh.
*   **Implementation**: `PersistenceManager` using `IndexedDB` automatically saves/loads `AppStore` state and the current document.
*   **Impact**: Essential for production reliability; allows users to pick up exactly where they left off.

### Dynamic Sound Resolver
*   **Context**: Sound matching happens once at load time.
*   **Optimization**: Move sound-to-line matching logic into a standalone manager that maintains a "Live Inventory" of available files.
*   **Impact**: Allows users to drop new sound files into the browser while the script is open and see them link instantly to the relevant lines.

---

## 3. UI/UX & Quality of Life

### Command-Based Undo/Redo
*   **Context**: `ActionController` handles one-way logic flows.
*   **Optimization**: Wrap actions in a Command pattern that includes an `undo()` method.
*   **Impact**: Allows users to safely experiment with character colors, channel routing, and line updates without fear of permanent mistakes.

### SVG Icon Standardization
*   **Context**: The application uses a mix of Unicode Emoji and CSS-drawn icons.
*   **Optimization**: Migrate to a standard SVG-based library (e.g., Lucide or Heroicons).
*   **Impact**: Provides a professional, consistent aesthetic that matches the high-resolution standards of the PWA and macOS/Windows system UI.

### Configuration Versioning
*   **Context**: `AppConfig.ts` is currently a static file.
*   **Optimization**: Allow for user-defined config overrides that are version-checked against the core schema.
*   **Impact**: Prevents breaking changes in the metadata extraction regex rules when the application is updated.
