import { IVoiceRecognitionEngine, VoiceRecognitionResult, VoiceEngineStatus } from '@/types/voice';

/**
 * Native Web Speech API implementation of a voice recognition engine.
 * Note: Offline support varies by browser and OS.
 */
export class WebSpeechEngine implements IVoiceRecognitionEngine {
  public readonly id = 'web-speech';
  public readonly name = 'Web Speech API';

  private recognition: any | null = null;
  private _isRunning = false;
  
  private onResultCallback: ((result: VoiceRecognitionResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onStatusChangeCallback: ((status: VoiceEngineStatus) => void) | null = null;

  constructor(private language: string = 'en-GB') {}

  public get isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'speechRecognition' in window;
  }

  public get isRunning(): boolean {
    return this._isRunning;
  }

  public async init(): Promise<void> {
    if (!this.isSupported) {
      throw new Error('Web Speech API is not supported in this browser.');
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).speechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;

    this.recognition.onstart = () => {
      this._isRunning = true;
      this.onStatusChangeCallback?.('listening');
    };

    this.recognition.onend = () => {
      this._isRunning = false;
      this.onStatusChangeCallback?.('idle');
    };

    this.recognition.onerror = (event: any) => {
      this.onErrorCallback?.(new Error(`Speech recognition error: ${event.error}`));
    };

    this.recognition.onresult = (event: any) => {
      if (!this.onResultCallback) return;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        this.onResultCallback({
          transcript: result[0].transcript,
          isFinal: result.isFinal,
          confidence: result[0].confidence
        });
      }
    };
  }

  public async start(): Promise<void> {
    if (!this.recognition) await this.init();
    try {
      this.recognition?.start();
    } catch (err) {
      console.warn('WebSpeechEngine: Already started or error starting', err);
    }
  }

  public async stop(): Promise<void> {
    this.recognition?.stop();
    this._isRunning = false;
  }

  public onResult(callback: (result: VoiceRecognitionResult) => void): void {
    this.onResultCallback = callback;
  }

  public onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  public onStatusChange(callback: (status: VoiceEngineStatus) => void): void {
    this.onStatusChangeCallback = callback;
  }
}
