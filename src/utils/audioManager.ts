// Web Audio API manager for Adhan playback
// Provides precise audio scheduling and control

export interface AudioManagerOptions {
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

type AudioManagerState = "idle" | "loading" | "playing" | "paused" | "error";

export class AdhanAudioManager {
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private currentSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private state: AudioManagerState = "idle";
  private options: AudioManagerOptions;

  // Fallback HTMLAudioElement for browsers with limited Web Audio support
  private fallbackAudio: HTMLAudioElement | null = null;
  private useFallback: boolean = false;

  constructor(options: AudioManagerOptions = {}) {
    this.options = options;
  }

  // Initialize the audio context (must be called after user interaction)
  async init(): Promise<boolean> {
    try {
      // Check for Web Audio API support
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      if (!AudioContextClass) {
        console.warn("Web Audio API not supported, using fallback");
        this.useFallback = true;
        return true;
      }

      this.audioContext = new AudioContextClass();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);

      // Resume context if suspended (required for some browsers)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
      this.useFallback = true;
      return true;
    }
  }

  // Preload an audio file
  async preload(url: string, key: string): Promise<boolean> {
    if (this.audioBuffers.has(key)) {
      return true; // Already loaded
    }

    try {
      this.state = "loading";

      if (this.useFallback || !this.audioContext) {
        // For fallback, we just validate the URL works
        return true;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      this.audioBuffers.set(key, audioBuffer);
      this.state = "idle";

      return true;
    } catch (error) {
      console.error(`Failed to preload audio ${key}:`, error);
      this.state = "error";
      this.options.onError?.(error as Error);
      return false;
    }
  }

  // Play audio
  async play(
    urlOrKey: string,
    volume: number = 1.0,
    isPreloaded: boolean = false
  ): Promise<void> {
    // Stop any currently playing audio
    this.stop();

    try {
      if (this.useFallback || !this.audioContext || !this.gainNode) {
        return this.playFallback(urlOrKey, volume);
      }

      let buffer: AudioBuffer | undefined;

      if (isPreloaded) {
        buffer = this.audioBuffers.get(urlOrKey);
      }

      if (!buffer) {
        // Load on demand
        const response = await fetch(urlOrKey);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = await this.audioContext.decodeAudioData(arrayBuffer);
      }

      // Resume context if needed
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Create and configure source
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);

      // Set volume
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));

      // Handle end of playback
      source.onended = () => {
        if (this.state === "playing") {
          this.state = "idle";
          this.currentSource = null;
          this.options.onEnded?.();
        }
      };

      // Start playback
      this.currentSource = source;
      this.startTime = this.audioContext.currentTime;
      this.pauseTime = 0;
      source.start(0);
      this.state = "playing";

      // Start time update interval
      this.startTimeUpdateInterval(buffer.duration);
    } catch (error) {
      console.error("Failed to play audio:", error);
      this.state = "error";
      this.options.onError?.(error as Error);
    }
  }

  // Fallback playback using HTMLAudioElement
  private playFallback(url: string, volume: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.fallbackAudio = new Audio(url);
      this.fallbackAudio.volume = Math.max(0, Math.min(1, volume));

      this.fallbackAudio.onended = () => {
        this.state = "idle";
        this.options.onEnded?.();
        resolve();
      };

      this.fallbackAudio.onerror = () => {
        const error = new Error("Audio playback failed");
        this.state = "error";
        this.options.onError?.(error);
        reject(error);
      };

      this.fallbackAudio.ontimeupdate = () => {
        if (this.fallbackAudio) {
          this.options.onTimeUpdate?.(
            this.fallbackAudio.currentTime,
            this.fallbackAudio.duration
          );
        }
      };

      this.state = "playing";
      this.fallbackAudio.play().catch((error) => {
        this.state = "error";
        this.options.onError?.(error);
        reject(error);
      });
    });
  }

  // Stop playback
  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {
        // Ignore errors from already stopped sources
      }
      this.currentSource = null;
    }

    if (this.fallbackAudio) {
      this.fallbackAudio.pause();
      this.fallbackAudio.currentTime = 0;
      this.fallbackAudio = null;
    }

    this.state = "idle";
    this.pauseTime = 0;
  }

  // Pause playback (not fully supported with Web Audio, stops instead)
  pause(): void {
    if (this.fallbackAudio) {
      this.fallbackAudio.pause();
      this.state = "paused";
    } else {
      // Web Audio doesn't support true pause, so we stop
      this.stop();
    }
  }

  // Resume playback
  resume(): void {
    if (this.fallbackAudio && this.state === "paused") {
      this.fallbackAudio.play();
      this.state = "playing";
    }
  }

  // Set volume (0.0 to 1.0)
  setVolume(volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(1, volume));

    if (this.gainNode) {
      this.gainNode.gain.value = normalizedVolume;
    }

    if (this.fallbackAudio) {
      this.fallbackAudio.volume = normalizedVolume;
    }
  }

  // Get current state
  getState(): AudioManagerState {
    return this.state;
  }

  // Check if playing
  isPlaying(): boolean {
    return this.state === "playing";
  }

  // Get current time
  getCurrentTime(): number {
    if (this.fallbackAudio) {
      return this.fallbackAudio.currentTime;
    }

    if (this.audioContext && this.state === "playing") {
      return this.audioContext.currentTime - this.startTime + this.pauseTime;
    }

    return 0;
  }

  // Time update interval
  private timeUpdateIntervalId: number | null = null;

  private startTimeUpdateInterval(duration: number): void {
    this.stopTimeUpdateInterval();

    this.timeUpdateIntervalId = window.setInterval(() => {
      if (this.state === "playing" && this.options.onTimeUpdate) {
        this.options.onTimeUpdate(this.getCurrentTime(), duration);
      }
    }, 250);
  }

  private stopTimeUpdateInterval(): void {
    if (this.timeUpdateIntervalId !== null) {
      clearInterval(this.timeUpdateIntervalId);
      this.timeUpdateIntervalId = null;
    }
  }

  // Cleanup
  destroy(): void {
    this.stop();
    this.stopTimeUpdateInterval();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.audioBuffers.clear();
    this.gainNode = null;
  }
}

// Default adhan audio URLs (served locally from public folder)
export const DEFAULT_ADHAN_URLS = {
  makkah: "/audio/adhan/makkah.mp3",
  madinah: "/audio/adhan/madinah.mp3",
  alAqsa: "/audio/adhan/alaqsa.mp3",
  egypt: "/audio/adhan/egypt.mp3",
  abdulBaset: "/audio/adhan/abdulbaset.mp3",
  // Fajr-specific adhans (use same files - can be customized later)
  fajrMakkah: "/audio/adhan/makkah.mp3",
  fajrMadinah: "/audio/adhan/madinah.mp3",
};

// Singleton instance for app-wide use
let globalAudioManager: AdhanAudioManager | null = null;

export function getGlobalAudioManager(): AdhanAudioManager {
  if (!globalAudioManager) {
    globalAudioManager = new AdhanAudioManager();
  }
  return globalAudioManager;
}

export function initGlobalAudioManager(
  options?: AudioManagerOptions
): AdhanAudioManager {
  if (globalAudioManager) {
    globalAudioManager.destroy();
  }
  globalAudioManager = new AdhanAudioManager(options);
  return globalAudioManager;
}
