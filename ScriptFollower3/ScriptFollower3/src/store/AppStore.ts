/**
 * Main application state manager
 */

import { reactive } from 'vue'
import { Document, ScriptLineBase, LineType, IVirtualChannel, IAudioOutputDevice } from '@/types/core'
import { EventBus, EVENT_TYPES } from '@/core/EventBus'
import { AppConfig } from '@/config/AppConfig'

export interface AppState {
  currentDocument: Document | null
  isLoading: boolean
  error: string | null
  lineTypeVisibility: Record<LineType, boolean>
  isRightPanelCollapsed: boolean
  virtualChannels: IVirtualChannel[]
  availableOutputDevices: IAudioOutputDevice[]
  isTouchDevice: boolean
  searchQuery: string | null
  searchMatches: string[]
  activeSearchIndex: number | null
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
      { 
        id: AppConfig.audio.baseChannelId, 
        name: `Channel ${AppConfig.audio.baseChannelId}`, 
        volume: AppConfig.audio.defaultChannelVolume, 
        isMuted: false, 
        outputDeviceId: 'default' 
      }
    ],
    availableOutputDevices: [],
    isTouchDevice: false,
    searchQuery: null,
    searchMatches: [],
    activeSearchIndex: null
  })

  private eventBus: EventBus

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  // --- Search Methods ---
  setSearchQuery(query: string | null): void {
    this.state.searchQuery = query;
  }

  setSearchResults(matches: string[], activeIndex: number | null): void {
    this.state.searchMatches = matches;
    this.state.activeSearchIndex = activeIndex;
  }

  setActiveSearchIndex(index: number | null): void {
    this.state.activeSearchIndex = index;
  }

  isLineSearchMatch(lineId: string): boolean {
    return this.state.searchQuery ? this.state.searchMatches.includes(lineId) : false;
  }

  // --- Touch Device ---
  setIsTouchDevice(isTouch: boolean): void {
    this.state.isTouchDevice = isTouch;
  }

  // --- Channel Management ---

  addVirtualChannel(channel: IVirtualChannel): void {
    if (this.state.virtualChannels.some(c => c.id === channel.id)) return;
    this.state.virtualChannels.push(channel);
  }

  removeVirtualChannel(id: string): void {
    if (id === AppConfig.audio.baseChannelId) return;
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

  setLineTypeVisibility(lineType: LineType, visible: boolean): void {
    this.state.lineTypeVisibility[lineType] = visible;
  }

  toggleRightPanel(): void {
    this.state.isRightPanelCollapsed = !this.state.isRightPanelCollapsed;
  }

  loadDocument(document: Document): void {
    this.state.currentDocument = document
    this.state.isLoading = false
    this.state.error = null
    
    this.eventBus.emit({
      type: EVENT_TYPES.DOCUMENT_LOADED,
      payload: { documentId: document.id },
      timestamp: new Date()
    });
  }

  setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading
  }

  setError(error: string | null): void {
    this.state.error = error
  }

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

  updateDocumentVersion(): void {
    if (!this.state.currentDocument) return

    this.state.currentDocument = {
      ...this.state.currentDocument,
      version: this.state.currentDocument.version + 1,
      updatedAt: new Date()
    }
  }

  getState(): AppState {
    return this.state
  }

  getCurrentDocument(): Document | null {
    return this.state.currentDocument
  }

  getLines(): readonly ScriptLineBase[] {
    return this.state.currentDocument?.lines ?? []
  }

  getLineById(lineId: string): ScriptLineBase | undefined {
    return this.state.currentDocument?.lines.find(l => l.id === lineId)
  }

  getLineClasses(line: ScriptLineBase): string[] {
    const classes: string[] = [];
    classes.push(`line-type-${line.lineType.toLowerCase().replace(/_/g, '-')}`);
    if (line.lineSubType) {
      classes.push(`line-subtype-${line.lineSubType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
    }
    return classes;
  }
}
