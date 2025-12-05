import { usePrayerTimesContext } from "../../contexts/PrayerTimesContext";
import { PRAYER_NAMES } from "../../utils/prayerCalculations";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";

interface PrayerTimesFloatingButtonProps {
  position?: "bottom-right" | "bottom-left";
  className?: string;
}

export function PrayerTimesFloatingButton({
  position = "bottom-right",
  className = "",
}: PrayerTimesFloatingButtonProps) {
  const {
    isEnabled,
    settings,
    adhanSettings,
    isAdhanPlaying,
    togglePanel,
    isPanelOpen,
  } = usePrayerTimesContext();

  const { nextPrayer, timeUntilNextPrayer, timeUntilNextPrayerMs } = usePrayerTimes({
    settings,
    adhanSettings,
    enabled: isEnabled,
  });

  // Don't render if prayer times are disabled or no settings
  if (!isEnabled || !settings?.showFloatingButton) {
    return null;
  }

  // Check if we're approaching prayer time (within 15 minutes)
  const isApproaching =
    timeUntilNextPrayerMs !== null && timeUntilNextPrayerMs < 15 * 60 * 1000;

  // Check if we're very close (within 5 minutes)
  const isImminent =
    timeUntilNextPrayerMs !== null && timeUntilNextPrayerMs < 5 * 60 * 1000;

  const positionClasses = {
    "bottom-right": "right-4 bottom-20 sm:right-6 sm:bottom-6",
    "bottom-left": "left-4 bottom-20 sm:left-6 sm:bottom-6",
  };

  const nextPrayerName = nextPrayer ? PRAYER_NAMES[nextPrayer].english : "";

  return (
    <button
      onClick={togglePanel}
      className={`
        fixed z-50
        ${positionClasses[position]}
        flex items-center gap-2
        px-4 py-3
        rounded-full
        shadow-lg
        transition-all duration-300
        ${
          isAdhanPlaying
            ? "bg-green-500 text-white animate-pulse"
            : isImminent
              ? "bg-amber-500 text-white animate-pulse"
              : isApproaching
                ? "bg-theme-primary text-white"
                : "bg-white/95 backdrop-blur-sm text-gray-800 hover:bg-white"
        }
        ${isPanelOpen ? "scale-95 opacity-80" : "hover:scale-105"}
        ${className}
      `}
      aria-label={`Prayer times - Next: ${nextPrayerName} in ${timeUntilNextPrayer}`}
    >
      {/* Mosque Icon */}
      <svg
        className={`w-5 h-5 ${isAdhanPlaying ? "animate-bounce" : ""}`}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C11.5 2 11 2.19 10.59 2.59L7.29 5.88C6.5 6.67 6 7.67 6 8.75V21H8V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21H18V8.75C18 7.67 17.5 6.67 16.71 5.88L13.41 2.59C13 2.19 12.5 2 12 2M12 4.41L14.59 7H9.41L12 4.41M10 15V21H14V15H10Z" />
      </svg>

      {/* Content */}
      <div className="flex flex-col items-start">
        {isAdhanPlaying ? (
          <>
            <span className="text-xs font-medium opacity-90">Adhan</span>
            <span className="text-sm font-bold">Playing...</span>
          </>
        ) : nextPrayer ? (
          <>
            <span className="text-xs font-medium opacity-75">{nextPrayerName}</span>
            <span className="text-sm font-bold">{timeUntilNextPrayer || "..."}</span>
          </>
        ) : (
          <span className="text-sm font-medium">Prayer Times</span>
        )}
      </div>

      {/* Animated ring for approaching prayer */}
      {isApproaching && !isAdhanPlaying && (
        <span className="absolute inset-0 rounded-full animate-ping bg-current opacity-20" />
      )}
    </button>
  );
}

// Minimal version just showing icon and countdown
export function PrayerTimesMiniFab({
  position = "bottom-right",
  className = "",
}: PrayerTimesFloatingButtonProps) {
  const {
    isEnabled,
    settings,
    adhanSettings,
    isAdhanPlaying,
    togglePanel,
  } = usePrayerTimesContext();

  const { timeUntilNextPrayer } = usePrayerTimes({
    settings,
    adhanSettings,
    enabled: isEnabled,
  });

  if (!isEnabled || !settings?.showFloatingButton) {
    return null;
  }

  const positionClasses = {
    "bottom-right": "right-4 bottom-4",
    "bottom-left": "left-4 bottom-4",
  };

  return (
    <button
      onClick={togglePanel}
      className={`
        fixed z-50
        ${positionClasses[position]}
        w-14 h-14
        rounded-full
        shadow-lg
        flex flex-col items-center justify-center
        transition-all duration-300
        ${
          isAdhanPlaying
            ? "bg-green-500 text-white animate-pulse"
            : "bg-theme-primary text-white hover:scale-110"
        }
        ${className}
      `}
      aria-label="Prayer times"
    >
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C11.5 2 11 2.19 10.59 2.59L7.29 5.88C6.5 6.67 6 7.67 6 8.75V21H8V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21H18V8.75C18 7.67 17.5 6.67 16.71 5.88L13.41 2.59C13 2.19 12.5 2 12 2M12 4.41L14.59 7H9.41L12 4.41M10 15V21H14V15H10Z" />
      </svg>
      {timeUntilNextPrayer && (
        <span className="text-[10px] font-bold mt-0.5">{timeUntilNextPrayer}</span>
      )}
    </button>
  );
}
