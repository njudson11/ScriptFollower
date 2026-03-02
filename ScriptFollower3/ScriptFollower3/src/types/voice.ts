/**
 * Result emitted by a voice recognition engine
 */
export interface VoiceRecognitionResult {
  readonly transcript: string;
  readonly isFinal: boolean;
  readonly confidence: number;
}

/**
 * Status types for a voice recognition engine
 */
export type VoiceEngineStatus = 'idle' | 'listening' | 'processing';

/**
 * Common interface for all voice recognition engines
 */
export interface IVoiceRecognitionEngine {
  readonly id: string;
  readonly name: string;
  readonly isSupported: boolean;
  readonly isRunning: boolean;

  init(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Callbacks for orchestration
  onResult(callback: (result: VoiceRecognitionResult) => void): void;
  onError(callback: (error: Error) => void): void;
  onStatusChange(callback: (status: VoiceEngineStatus) => void): void;
}
