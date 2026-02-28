# Architectural & Performance Optimizations

This document outlines high-impact recommendations for ScriptFollower 3, focusing on scalability, type safety, and production-grade reliability.

## 1. Performance Enhancements

### Virtual Scrolling (Deferred)
*   **Status**: Attempted via absolute positioning but reverted due to conflicts with complex CSS layouts (margins, flexbox, overlapping features).
*   **Recommendation**: Re-evaluate if script performance becomes a bottleneck. Any future implementation should use a "spacer-padding" or "relative windowing" approach to preserve natural document flow.
*   **Impact**: Important for 5000+ line scripts; currently standard rendering handles production scripts efficiently.

### Web Worker Offloading ✅ (Completed)
*   **Implementation**: Entire parsing and enhancement pipeline moved to `DocumentWorker.ts` using `fast-xml-parser`.
*   **Impact**: Keeps the UI 100% responsive during document loading; background processing for all formats.

### Audio Resource Management
*   **Context**: `URL.createObjectURL` is used for sound files but never revoked.
*   **Optimization**: Implement a lifecycle manager for Blob URLs that calls `URL.revokeObjectURL()` whenever a document is unloaded or a project folder is re-scanned.
*   **Impact**: Prevents memory leaks during long-running sessions or frequent document swaps.

---

## 2. Structural Refinements

### Strict Metadata Schemas
*   **Context**: `ScriptLineBase.metadata` is currently an open `Record<string, any>`, leading to frequent use of the `any` cast.
*   **Optimization**: Implement a discriminated union for metadata based on `LineType`.
*   **Impact**: Eliminates runtime errors, improves IDE autocompletion, and makes component logic (like `DialogueLine.vue`) much safer.

### Persistence Layer ✅ (Completed)
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

### SVG Icon Standardization ✅ (Completed)
*   **Implementation**: Project migrated to `lucide-vue-next` library for all UI icons.
*   **Impact**: Provides a professional, consistent aesthetic that matches the high-resolution standards of the PWA and macOS/Windows system UI.

### Configuration Versioning
*   **Context**: `AppConfig.ts` is currently a static file.
*   **Optimization**: Allow for user-defined config overrides that are version-checked against the core schema.
*   **Impact**: Prevents breaking changes in the metadata extraction regex rules when the application is updated.
