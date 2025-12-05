import { useEffect, useRef, useState, useCallback } from "react";
import { usePrayerTimesContext } from "../../contexts/PrayerTimesContext";
import { PRAYER_NAMES, type PrayerName } from "../../utils/prayerCalculations";
import {
  AdhanAudioManager,
  DEFAULT_ADHAN_URLS,
} from "../../utils/audioManager";

interface AdhanFullscreenViewProps {
  className?: string;
}

export function AdhanFullscreenView({ className = "" }: AdhanFullscreenViewProps) {
  const {
    isFullscreenAdhan,
    dismissFullscreenAdhan,
    adhanPrayer,
    adhanSettings,
    stopAdhan,
    settings,
  } = usePrayerTimesContext();

  const audioManagerRef = useRef<AdhanAudioManager | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  // Start with hasInteracted true - the user clicked a button to get here
  const [hasInteracted, setHasInteracted] = useState(true);

  // Get adhan settings for current prayer
  const currentAdhanSettings = adhanPrayer
    ? adhanSettings.find((s) => s.prayerName === adhanPrayer)
    : null;

  // Initialize audio manager
  useEffect(() => {
    const manager = new AdhanAudioManager({
      onEnded: () => {
        setIsPlaying(false);
        // Auto-dismiss after a short delay when adhan ends
        setTimeout(() => {
          stopAdhan();
        }, 2000);
      },
      onError: (error) => {
        console.error("Adhan playback error:", error);
        setIsPlaying(false);
      },
      onTimeUpdate: (currentTime, totalDuration) => {
        setProgress(currentTime);
        setDuration(totalDuration);
      },
    });

    audioManagerRef.current = manager;
    manager.init();

    return () => {
      manager.destroy();
    };
  }, [stopAdhan]);

  // Play adhan when fullscreen opens
  useEffect(() => {
    if (!isFullscreenAdhan || !adhanPrayer || !audioManagerRef.current) {
      return;
    }

    const playAdhan = async () => {
      const manager = audioManagerRef.current;
      if (!manager) return;

      // Determine which audio URL to use
      let audioUrl: string;

      if (currentAdhanSettings?.adhanAudioUrl) {
        // Use custom audio if set
        audioUrl = currentAdhanSettings.adhanAudioUrl;
      } else if (adhanPrayer === "fajr" && currentAdhanSettings?.useFajrAdhan) {
        // Use Fajr-specific adhan
        audioUrl = DEFAULT_ADHAN_URLS.fajrMakkah;
      } else {
        // Use default Makkah adhan
        audioUrl = DEFAULT_ADHAN_URLS.makkah;
      }

      // Get volume
      const volume = currentAdhanSettings?.adhanVolume
        ? parseFloat(currentAdhanSettings.adhanVolume)
        : 1.0;

      try {
        setIsPlaying(true);
        await manager.play(audioUrl, isMuted ? 0 : volume);
      } catch (error) {
        console.error("Failed to play adhan:", error);
        setIsPlaying(false);
      }
    };

    // Only auto-play if user has interacted with the page
    if (hasInteracted) {
      playAdhan();
    }
  }, [isFullscreenAdhan, adhanPrayer, currentAdhanSettings, hasInteracted, isMuted]);

  // Stop audio when dismissed
  const handleDismiss = useCallback(() => {
    audioManagerRef.current?.stop();
    setIsPlaying(false);
    dismissFullscreenAdhan();
  }, [dismissFullscreenAdhan]);

  // Handle skip
  const handleSkip = useCallback(() => {
    audioManagerRef.current?.stop();
    setIsPlaying(false);
    stopAdhan();
  }, [stopAdhan]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (audioManagerRef.current) {
      const volume = currentAdhanSettings?.adhanVolume
        ? parseFloat(currentAdhanSettings.adhanVolume)
        : 1.0;
      audioManagerRef.current.setVolume(newMuted ? 0 : volume);
    }
  }, [isMuted, currentAdhanSettings?.adhanVolume]);

  if (!isFullscreenAdhan || !adhanPrayer) {
    return null;
  }

  const prayerName = PRAYER_NAMES[adhanPrayer];
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div
      className={`
        fixed inset-0 z-[100]
        bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900
        flex flex-col items-center justify-center
        ${className}
      `}
    >
      {/* Islamic Pattern Background */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center text-white px-4 max-w-lg">
        {/* Mosque Icon */}
        <div className="mb-8">
          <svg
            className={`w-24 h-24 mx-auto ${isPlaying ? "animate-pulse" : ""}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C11.5 2 11 2.19 10.59 2.59L7.29 5.88C6.5 6.67 6 7.67 6 8.75V21H8V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21H18V8.75C18 7.67 17.5 6.67 16.71 5.88L13.41 2.59C13 2.19 12.5 2 12 2M12 4.41L14.59 7H9.41L12 4.41M10 15V21H14V15H10Z" />
          </svg>
        </div>

        {/* Prayer Name */}
        <div className="mb-4">
          <h1 className="text-5xl sm:text-6xl font-bold mb-2 font-arabic">
            {prayerName.arabic}
          </h1>
          <h2 className="text-3xl sm:text-4xl font-light opacity-90">
            {prayerName.english}
          </h2>
        </div>

        {/* Status */}
        <p className="text-xl opacity-75 mb-8">
          {isPlaying ? "Adhan is playing..." : "Time for prayer"}
        </p>

        {/* Audio Waveform Animation */}
        {isPlaying && (
          <div className="flex items-end justify-center gap-1 h-12 mb-8">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-white/60 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.05}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Progress Bar */}
        {duration > 0 && (
          <div className="w-full max-w-md mx-auto mb-8">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/60 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
            )}
          </button>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Skip adhan"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </button>

          {/* Minimize Button */}
          <button
            onClick={handleDismiss}
            className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Minimize"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Location Info */}
        {settings?.city && (
          <p className="mt-8 text-sm opacity-50">
            {settings.city}
            {settings.country ? `, ${settings.country}` : ""}
          </p>
        )}
      </div>

      {/* Close hint */}
      <p className="absolute bottom-8 left-0 right-0 text-center text-white/40 text-sm">
        Press ESC or tap minimize to close
      </p>
    </div>
  );
}

// Reminder Toast Component
interface PrayerReminderToastProps {
  prayer: PrayerName;
  minutesBefore: number;
  onDismiss: () => void;
}

export function PrayerReminderToast({
  prayer,
  minutesBefore,
  onDismiss,
}: PrayerReminderToastProps) {
  const prayerName = PRAYER_NAMES[prayer];

  useEffect(() => {
    // Auto-dismiss after 30 seconds
    const timeout = setTimeout(onDismiss, 30000);
    return () => clearTimeout(timeout);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-gradient-to-r from-theme-primary to-theme-secondary text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C11.5 2 11 2.19 10.59 2.59L7.29 5.88C6.5 6.67 6 7.67 6 8.75V21H8V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21H18V8.75C18 7.67 17.5 6.67 16.71 5.88L13.41 2.59C13 2.19 12.5 2 12 2M12 4.41L14.59 7H9.41L12 4.41M10 15V21H14V15H10Z" />
          </svg>
        </div>
        <div>
          <p className="font-bold">{prayerName.english} in {minutesBefore} minutes</p>
          <p className="text-sm opacity-90">Time to prepare for prayer</p>
        </div>
        <button
          onClick={onDismiss}
          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
