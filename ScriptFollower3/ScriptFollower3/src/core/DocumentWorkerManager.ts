/**
 * Document Worker Manager
 * Provides a clean Promise-based API for interacting with the DocumentWorker.
 */

import { Document, MetadataExtractionRule } from '@/types/core'
import { WorkerRequest, WorkerResponse } from '@/workers/DocumentWorker'
import DocumentWorker from '@/workers/DocumentWorker?worker'

export class DocumentWorkerManager {
  /**
   * Parse a document in a background worker
   */
  public static async parseDocument(
    file: File, 
    format: 'ODT' | 'DOCX' | 'PDF' | 'XML',
    config: any,
    extractionRules: MetadataExtractionRule[]
  ): Promise<Document> {
    return new Promise((resolve, reject) => {
      // Use Vite's worker constructor
      const worker = new DocumentWorker()

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const response = e.data
        if (response.type === 'SUCCESS' && response.document) {
          // Worker communication loses Date object type, must restore them
          const doc = {
            ...response.document,
            createdAt: new Date(response.document.createdAt),
            updatedAt: new Date(response.document.updatedAt)
          }
          resolve(doc)
        } else {
          reject(new Error(response.error || 'Unknown worker error'))
        }
        worker.terminate()
      }

      worker.onerror = (e) => {
        console.error('[DocumentWorkerManager] Worker error event:', e);
        reject(new Error(`Worker execution error: ${e.message || 'Check console for details'}`))
        worker.terminate()
      }

      const request: WorkerRequest = {
        type: 'PARSE_DOCUMENT',
        file,
        fileName: file.name,
        format,
        config,
        extractionRules
      }

      worker.postMessage(request)
    })
  }
}
