/**
 * Persistence Manager
 * Handles saving and loading application state to IndexedDB
 */

import { watch } from 'vue'
import type { AppStore, AppState } from '@/store/AppStore'
import { Document, IVirtualChannel, LineType } from '@/types/core'

const DB_NAME = 'ScriptFollowerDB'
const DB_VERSION = 1
const STORE_NAME = 'appState'

export class PersistenceManager {
  private db: IDBDatabase | null = null
  private appStore: AppStore

  constructor(appStore: AppStore) {
    this.appStore = appStore
  }

  /**
   * Initialize the database and load saved state
   */
  public async init(): Promise<void> {
    try {
      console.log('[PersistenceManager] Initializing IndexedDB...')
      this.db = await this.openDatabase()
      console.log('[PersistenceManager] Database opened successfully')
      
      await this.loadState()
      this.setupAutoSave()
      console.log('[PersistenceManager] Initialization complete')
    } catch (error) {
      console.error('[PersistenceManager] Initialization failed', error)
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('[PersistenceManager] IndexedDB open error:', request.error)
        reject(request.error)
      }
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        console.log('[PersistenceManager] Upgrading database...')
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
          console.log(`[PersistenceManager] Object store '${STORE_NAME}' created`)
        }
      }
    })
  }

  /**
   * Load state from IndexedDB into the AppStore
   */
  private async loadState(): Promise<void> {
    if (!this.db) return

    try {
      console.log('[PersistenceManager] Querying IndexedDB for saved state...')
      const savedState = await this.getValue('state')
      if (savedState) {
        console.log('[PersistenceManager] Found saved settings, applying...', savedState)
        this.applySavedState(savedState)
      } else {
        console.log('[PersistenceManager] No saved settings found')
      }

      const savedDocument = await this.getValue('currentDocument')
      if (savedDocument) {
        console.log('[PersistenceManager] Found saved document:', savedDocument.name)
        // Ensure dates are correctly restored as Date objects
        const document = {
          ...savedDocument,
          createdAt: new Date(savedDocument.createdAt),
          updatedAt: new Date(savedDocument.updatedAt)
        }
        this.appStore.loadDocument(document)
      } else {
        console.log('[PersistenceManager] No saved document found')
      }
    } catch (error) {
      console.error('[PersistenceManager] Failed to load state', error)
    }
  }

  private applySavedState(saved: any): void {
    const state = this.appStore.state

    if (saved.lineTypeVisibility) {
      console.log('[PersistenceManager] Applying lineTypeVisibility')
      Object.assign(state.lineTypeVisibility, saved.lineTypeVisibility)
    }
    
    if (saved.characterColors) {
      console.log('[PersistenceManager] Applying characterColors')
      Object.assign(state.characterColors, saved.characterColors)
    }

    if (saved.isRightPanelCollapsed !== undefined) {
      console.log('[PersistenceManager] Applying isRightPanelCollapsed:', saved.isRightPanelCollapsed)
      state.isRightPanelCollapsed = saved.isRightPanelCollapsed
    }

    if (saved.virtualChannels) {
      console.log('[PersistenceManager] Applying virtualChannels')
      state.virtualChannels = saved.virtualChannels.map((c: IVirtualChannel) => ({
        ...c
      }))
    }
  }

  /**
   * Setup watchers to automatically save state when it changes
   */
  private setupAutoSave(): void {
    console.log('[PersistenceManager] Setting up auto-save watchers...')
    
    // Watch settings (colors, visibility, etc.)
    watch(
      () => ({
        lineTypeVisibility: { ...this.appStore.state.lineTypeVisibility },
        characterColors: { ...this.appStore.state.characterColors },
        isRightPanelCollapsed: this.appStore.state.isRightPanelCollapsed,
        virtualChannels: [...this.appStore.state.virtualChannels]
      }),
      (newState) => {
        console.log('[PersistenceManager] Settings changed, saving state...')
        this.saveValue('state', newState)
      },
      { deep: true }
    )

    // Watch document changes
    watch(
      () => this.appStore.state.currentDocument,
      (newDoc) => {
        if (newDoc) {
          console.log('[PersistenceManager] Document changed, saving to DB...')
          const docToSave = this.prepareDocumentForStorage(newDoc)
          this.saveValue('currentDocument', docToSave)
        } else {
          console.log('[PersistenceManager] Document cleared, removing from DB...')
          this.deleteValue('currentDocument')
        }
      },
      { deep: true }
    )
  }

  /**
   * Clean up document for storage (strip transient data like blob URLs)
   */
  private prepareDocumentForStorage(doc: Document): any {
    const cleanLines = doc.lines.map(line => {
      if (line.metadata && line.metadata.sound) {
        const { sound, ...restMetadata } = line.metadata
        return { ...line, metadata: restMetadata }
      }
      return line
    })

    return {
      ...doc,
      lines: cleanLines
    }
  }

  private getValue(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve(null)
      try {
        const transaction = this.db.transaction(STORE_NAME, 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(key)
        request.onerror = () => {
          console.error(`[PersistenceManager] Error getting key '${key}':`, request.error)
          reject(request.error)
        }
        request.onsuccess = () => resolve(request.result)
      } catch (e) {
        console.error(`[PersistenceManager] Transaction error for key '${key}':`, e)
        resolve(null)
      }
    })
  }

  private saveValue(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve()
      try {
        // Deep clone to remove any Proxies or non-cloneable reactivity baggage
        // which causes DataCloneError in IndexedDB.
        const cleanValue = JSON.parse(JSON.stringify(value));
        
        const transaction = this.db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(cleanValue, key)
        request.onerror = () => {
          console.error(`[PersistenceManager] Error saving key '${key}':`, request.error)
          reject(request.error)
        }
        request.onsuccess = () => {
          // console.log(`[PersistenceManager] Successfully saved key '${key}'`)
          resolve()
        }
      } catch (e) {
        console.error(`[PersistenceManager] Transaction error while saving key '${key}':`, e)
        resolve()
      }
    })
  }

  private deleteValue(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve()
      try {
        const transaction = this.db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(key)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      } catch (e) {
        console.error(`[PersistenceManager] Transaction error while deleting key '${key}':`, e)
        resolve()
      }
    })
  }
}
