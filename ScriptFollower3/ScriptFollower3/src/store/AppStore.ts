/**
 * Main application state manager
 */

import { reactive } from 'vue'
import { Document, ScriptLineBase, LineType, IVirtualChannel, IAudioOutputDevice, SoundCue } from '@/types/core'
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
  characterColours: Record<string, string> // New: store colours for characters
  loadedSounds: Record<string, File> // Store sound files by soundRef for persistence across document loads
  highlightColours: {
    activeLine: string
    voiceMatch: string
    searchMatch: string
  }
  lastVoiceTranscript: string | null
  voiceSettings: {
    setFocusOnMatch: boolean
  }
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
    activeSearchIndex: null,
    characterColours: {},
    loadedSounds: {},
    highlightColours: {
      activeLine: '#ffeb3b', // Default palette-yellow-500
      voiceMatch: '#4caf50', // Default palette-green-500
      searchMatch: '#ffe082'  // Default palette-amber-200 / color-search-found-bg
    },
    lastVoiceTranscript: null,
    voiceSettings: {
      setFocusOnMatch: AppConfig.voice.setFocusOnMatch
    }
  })

  private eventBus: EventBus

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  // --- Character Colour Management ---
  setCharacterColour(character: string, colour: string): void {
    this.state.characterColours[character] = colour;
  }

  getCharacterColour(character: string | undefined): string | undefined {
    if (!character) return undefined;
    return this.state.characterColours[character];
  }

  // --- Sound Cache Management ---
  registerLoadedSounds(sounds: Record<string, File>): void {
    this.state.loadedSounds = { ...this.state.loadedSounds, ...sounds };
  }

  clearLoadedSounds(): void {
    // Revoke object URLs before clearing
    const document = this.state.currentDocument;
    if (document) {
      document.lines.forEach(line => {
        if (line.metadata?.sound?.url?.startsWith('blob:')) {
          URL.revokeObjectURL(line.metadata.sound.url);
        }
      });
    }
    this.state.loadedSounds = {};
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

  // --- Highlight Colour Management ---
  setHighlightColour(key: keyof AppState['highlightColours'], colour: string): void {
    this.state.highlightColours[key] = colour;
    
    // Sync with CSS variables
    if (key === 'activeLine') {
      document.documentElement.style.setProperty('--color-active-line', colour);
    } else if (key === 'voiceMatch') {
      document.documentElement.style.setProperty('--color-voice-matched-border', colour);
      // Also update background with opacity
      const r = parseInt(colour.slice(1, 3), 16);
      const g = parseInt(colour.slice(3, 5), 16);
      const b = parseInt(colour.slice(5, 7), 16);
      document.documentElement.style.setProperty('--color-voice-matched-bg', `rgba(${r}, ${g}, ${b}, 0.15)`);
    } else if (key === 'searchMatch') {
      document.documentElement.style.setProperty('--color-search-found-bg', colour);
      // For border, we can use a slightly darker version or a fixed one. 
      // Let's just update the background for now as requested.
    }
  }

  // --- Voice Management ---
  updateVoiceSettings(updates: Partial<AppState['voiceSettings']>): void {
    this.state.voiceSettings = { ...this.state.voiceSettings, ...updates };
  }

  setLastVoiceTranscript(transcript: string | null): void {
    this.state.lastVoiceTranscript = transcript;
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
    // Before loading, check if we have sounds in cache that should be applied to new lines
    const lines = document.lines.map(line => {
      if (line.lineType === LineType.SOUND_CUE) {
        const soundRef = line.metadata.soundRef;
        if (soundRef && this.state.loadedSounds[soundRef]) {
          const file = this.state.loadedSounds[soundRef];
          const objectUrl = URL.createObjectURL(file);
          
          const soundCue: SoundCue = {
            id: `cue_${line.id}`,
            name: file.name,
            url: objectUrl,
            volume: AppConfig.audio.defaultVolume * 100,
            pan: AppConfig.audio.defaultPan,
            channelId: this.resolveChannelId(line, { getValue: () => undefined })
          };

          return {
            ...line,
            metadata: { ...line.metadata, sound: soundCue }
          };
        }
      }
      return line;
    });

    this.state.currentDocument = { ...document, lines }
    this.state.isLoading = false
    this.state.error = null
    
    this.eventBus.emit({
      type: EVENT_TYPES.DOCUMENT_LOADED,
      payload: { documentId: document.id },
      timestamp: new Date()
    });

    if (Object.keys(this.state.loadedSounds).length > 0) {
      this.eventBus.emit({ type: EVENT_TYPES.SOUNDS_LOADED, timestamp: new Date() });
    }
  }

  clearProject(): void {
    this.state.currentDocument = null;
    this.state.error = null;
    this.state.characterColours = {};
    this.state.searchQuery = null;
    this.state.searchMatches = [];
    this.state.activeSearchIndex = null;
    this.clearLoadedSounds();
    
    // Also reset virtual channels to default
    this.state.virtualChannels = [
      { 
        id: AppConfig.audio.baseChannelId, 
        name: `Channel ${AppConfig.audio.baseChannelId}`, 
        volume: AppConfig.audio.defaultChannelVolume, 
        isMuted: false, 
        outputDeviceId: 'default' 
      }
    ];
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

  getLineIndex(lineId: string): number {
    return this.state.currentDocument?.lines.findIndex(l => l.id === lineId) ?? -1
  }

  /**
   * Unifies channel ID resolution for a line.
   * Priority: Annotation -> lineSubType -> first virtual channel -> baseChannelId
   */
  resolveChannelId(line: ScriptLineBase, annotationManager: any): string {
    const fromAnnotation = annotationManager.getValue(line.annotation, 'chan');
    if (fromAnnotation) return fromAnnotation;

    if (line.lineSubType) return line.lineSubType;

    return this.state.virtualChannels[0]?.id || AppConfig.audio.baseChannelId;
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
