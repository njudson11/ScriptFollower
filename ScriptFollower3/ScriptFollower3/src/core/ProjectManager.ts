import { AppStore } from '@/store/AppStore';
import { ActionController } from './ActionController';
import { LineSelectionManager } from './LineSelectionManager';
import { EventBus, EVENT_TYPES } from './EventBus';
import { ACTION_TYPES } from '@/types/actions';
import { parseODT } from '@/parsers/ODTParser';
import { LineType, ScriptLineBase, SoundCue } from '@/types/core';
import { AppConfig } from '@/config/AppConfig';
import { DocumentPostProcessor } from '@/parsers/DocumentPostProcessor';

/**
 * ProjectManager encapsulates the high-level business logic for 
 * loading documents and matching sounds.
 */
export class ProjectManager {
  private appStore: AppStore;
  private actionController: ActionController;
  private selectionManager: LineSelectionManager;
  private eventBus: EventBus;
  private unregisterFunctions: (() => void)[] = [];

  constructor(
    appStore: AppStore, 
    actionController: ActionController, 
    selectionManager: LineSelectionManager,
    eventBus: EventBus
  ) {
    this.appStore = appStore;
    this.actionController = actionController;
    this.selectionManager = selectionManager;
    this.eventBus = eventBus;

    this.init();
  }

  private init() {
    this.unregisterFunctions.push(
      this.actionController.registerHandler(ACTION_TYPES.LOAD_DOCUMENT, this.handleLoadDocument.bind(this)),
      this.actionController.registerHandler(ACTION_TYPES.LOAD_SOUNDS, this.handleLoadSounds.bind(this)),
      this.actionController.registerHandler(ACTION_TYPES.UPDATE_LINE, this.handleUpdateLine.bind(this))
    );
  }

  public destroy() {
    this.unregisterFunctions.forEach(unreg => unreg());
  }

  private async handleLoadDocument(action: any) {
    const { file } = action.payload;
    if (!file) return;

    try {
      this.appStore.setLoading(true);
      this.appStore.setError(null);

      if (file.name.toLowerCase().endsWith('.odt')) {
        let document = await parseODT(file);
        
        // Apply generic post-processing (metadata extraction, page numbering)
        document = DocumentPostProcessor.process(document, AppConfig.parsing.metadataExtractionRules);
        
        this.appStore.loadDocument(document);

        if (document.lines.length > 0) {
          this.selectionManager.selectLine(document.lines[0].id);
        }
      } else {
        this.appStore.setError('Unsupported file format. Please upload an .odt file.');
      }
    } catch (error) {
      this.appStore.setError(error instanceof Error ? error.message : 'Failed to load document');
    } finally {
      this.appStore.setLoading(false);
    }
  }

  private async handleLoadSounds(action: any) {
    const { files } = action.payload;
    if (!files || files.length === 0) return;

    try {
      this.appStore.setLoading(true);
      
      // 1. Check for an ODT file first to load/reload the document
      let odtFile: File | undefined;
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.odt')) {
          odtFile = file;
          break;
        }
      }

      if (odtFile) {
        let document = await parseODT(odtFile);
        // Apply generic post-processing
        document = DocumentPostProcessor.process(document, AppConfig.parsing.metadataExtractionRules);
        this.appStore.loadDocument(document);
        if (document.lines.length > 0) {
          this.selectionManager.selectLine(document.lines[0].id);
        }
      }

      // 2. Process sounds for the current document
      const document = this.appStore.getCurrentDocument();
      if (!document) {
        this.appStore.setError('Please load a document or a folder containing an .odt file.');
        return;
      }

      const audioExtensions = AppConfig.audio.supportedExtensions;
      const fileMap = new Map<string, File>();
      
      for (const file of files) {
        const lowerName = file.name.toLowerCase();
        if (audioExtensions.some(ext => lowerName.endsWith(ext))) {
          const match = file.name.match(AppConfig.audio.soundRegex || AppConfig.audio.soundRefRegex);
          if (match && match[1]) {
            fileMap.set(match[1], file);
          }
        }
      }

      const updatedLines: ScriptLineBase[] = [];
      for (const line of document.lines) {
        if (line.lineType === LineType.SOUND_CUE) {
          const soundRef = line.metadata.soundRef;
          if (soundRef && fileMap.has(soundRef)) {
            const file = fileMap.get(soundRef)!;
            const objectUrl = URL.createObjectURL(file);
            
            const soundCue: SoundCue = {
              id: `cue_${line.id}`,
              name: file.name,
              url: objectUrl,
              volume: AppConfig.audio.defaultVolume * 100,
              pan: AppConfig.audio.defaultPan,
              channelId: line.lineSubType || AppConfig.audio.baseChannelId
            };

            updatedLines.push({
              ...line,
              metadata: { ...line.metadata, sound: soundCue }
            });
          }
        }
      }

      if (updatedLines.length > 0) {
        this.appStore.updateLines(updatedLines);
        this.eventBus.emit({ type: EVENT_TYPES.SOUNDS_LOADED, timestamp: new Date() });
      }
    } catch (error) {
      this.appStore.setError(error instanceof Error ? error.message : 'Failed to process project folder');
    } finally {
      this.appStore.setLoading(false);
    }
  }

  private handleUpdateLine(action: any) {
    const { lineId, updates } = action.payload;
    this.appStore.updateLine(lineId, updates);
  }
}
