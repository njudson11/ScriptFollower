/**
 * Main application state manager
 */

import { reactive } from 'vue'
import { Document, ScriptLineBase, LineType, IVirtualChannel, IAudioOutputDevice } from '@/types/core'
import { EventBus } from '@/core/EventBus'
import { AppConfig } from '@/config/AppConfig'

export interface AppState {
  currentDocument: Document | null
  isLoading: boolean
  error: string | null
  lineTypeVisibility: Record<LineType, boolean>
  isRightPanelCollapsed: boolean
  virtualChannels: IVirtualChannel[]
  availableOutputDevices: IAudioOutputDevice[]
}

export class AppStore {
  public state: AppState = reactive({
    currentDocument: null,
    isLoading: false,
    error: null,
    lineTypeVisibility: ((): Record<LineType, boolean> => {
      const visibility: Record<LineType, boolean> = {} as Record<LineType, boolean>
      for (const lineType of Object.values(LineType)) {
        if (AppConfig.lineTypes[lineType]) {
          visibility[lineType] = AppConfig.lineTypes[lineType].defaultFilterValue
        } else {
          visibility[lineType] = true
        }
      }
      return visibility
    })(),
    isRightPanelCollapsed: false,
    virtualChannels: [
      { id: 'default', name: 'Master Out', volume: 1.0, isMuted: false, outputDeviceId: 'default' }
    ],
    availableOutputDevices: []
  })

  private eventBus: EventBus

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  // --- Channel Management ---

  addVirtualChannel(channel: IVirtualChannel): void {
    this.state.virtualChannels.push(channel);
  }

  removeVirtualChannel(id: string): void {
    if (id === 'default') return;
    this.state.virtualChannels = this.state.virtualChannels.filter(c => c.id !== id);
  }

  updateVirtualChannel(id: string, updates: Partial<IVirtualChannel>): void {
    const index = this.state.virtualChannels.findIndex(c => c.id === id);
    if (index !== -1) {
      this.state.virtualChannels[index] = { ...this.state.virtualChannels[index], ...updates };
    }
  }

  setAvailableOutputDevices(devices: IAudioOutputDevice[]): void {
    this.state.availableOutputDevices = devices;
  }

  // --- Existing Methods ---

  /**
   * Set the visibility of a specific line type
   */
  setLineTypeVisibility(lineType: LineType, visible: boolean): void {
    this.state.lineTypeVisibility[lineType] = visible;
  }

  /**
   * Toggle the collapsed state of the right panel
   */
  toggleRightPanel(): void {
    this.state.isRightPanelCollapsed = !this.state.isRightPanelCollapsed;
  }

  /**
   * Load a document into the store
   */
  loadDocument(document: Document): void {
    this.state.currentDocument = document
    this.state.isLoading = false
    this.state.error = null
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading
  }

  /**
   * Set error
   */
  setError(error: string | null): void {
    this.state.error = error
  }

  /**
   * Update a single line in the current document
   */
  updateLine(lineId: string, updates: Partial<ScriptLineBase>): void {
    if (!this.state.currentDocument) return

    const newLines = this.state.currentDocument.lines.map(line => 
      line.id === lineId ? { ...line, ...updates } : line
    );

    this.state.currentDocument = {
      ...this.state.currentDocument,
      lines: newLines,
      updatedAt: new Date()
    }
  }

  /**
   * Update lines in the current document
   */
  updateLines(updatedLines: ScriptLineBase[]): void {
    if (!this.state.currentDocument) return

    const lineMap = new Map(updatedLines.map(line => [line.id, line]));
    const newLines = this.state.currentDocument.lines.map(line => lineMap.get(line.id) || line);

    this.state.currentDocument = {
      ...this.state.currentDocument,
      lines: newLines,
      updatedAt: new Date()
    }
  }

  /**
   * Update document version (increment by 1)
   */
  updateDocumentVersion(): void {
    if (!this.state.currentDocument) return

    this.state.currentDocument = {
      ...this.state.currentDocument,
      version: this.state.currentDocument.version + 1,
      updatedAt: new Date()
    }
  }

  /**
   * Get current state
   */
  getState(): AppState {
    return this.state
  }

  /**
   * Get current document
   */
  getCurrentDocument(): Document | null {
    return this.state.currentDocument
  }

  /**
   * Get lines from current document
   */
  getLines(): readonly ScriptLineBase[] {
    return this.state.currentDocument?.lines ?? []
  }

  /**
   * Get line by ID
   */
  getLineById(lineId: string): ScriptLineBase | undefined {
    return this.state.currentDocument?.lines.find(l => l.id === lineId)
  }

  /**
   * Get the CSS classes for a given ScriptLineBase object.
   * Includes line type class and optionally line subtype class.
   */
  getLineClasses(line: ScriptLineBase): string[] {
    const classes: string[] = [];

    // Add line type class
    classes.push(`line-type-${line.lineType.toLowerCase().replace(/_/g, '-')}`);

    // Add line subtype class if it exists
    if (line.lineSubType) {
      // Assuming lineSubType can be directly converted to a kebab-case class name
      classes.push(`line-subtype-${line.lineSubType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
    }

    return classes;
  }
}
