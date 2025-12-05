import { useEffect, useRef } from "react";
import { usePrayerTimesContext } from "../../contexts/PrayerTimesContext";
import { usePrayerTimes } from "../../hooks/usePrayerTimes";
import { PRAYER_NAMES, type PrayerName } from "../../utils/prayerCalculations";

interface PrayerTimesPanelProps {
  showSettingsLink?: boolean;
  onSettingsClick?: () => void;
  className?: string;
}

export function PrayerTimesPanel({
  showSettingsLink = false,
  onSettingsClick,
  className = "",
}: PrayerTimesPanelProps) {
  const {
    isEnabled,
    settings,
    adhanSettings,
    isPanelOpen,
    setIsPanelOpen,
    isAdhanPlaying,
    adhanPrayer,
    testFullscreenAdhan,
    nextPrayer: contextNextPrayer,
  } = usePrayerTimesContext();

  const panelRef = useRef<HTMLDivElement>(null);

  const { prayerList, nextPrayer, timeUntilNextPrayer } = usePrayerTimes({
    settings,
    adhanSettings,
    enabled: isEnabled,
  });

  // Close panel on click outside
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPanelOpen, setIsPanelOpen]);

  // Close panel on escape
  useEffect(() => {
    if (!isPanelOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPanelOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isPanelOpen, setIsPanelOpen]);

  if (!isEnabled || !settings || !isPanelOpen) {
    return null;
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: settings.timezone,
  });

  return (
    <div
      ref={panelRef}
      className={`
        fixed z-50
        right-4 bottom-28 sm:right-6 sm:bottom-24
        w-80 max-w-[calc(100vw-2rem)]
        bg-white/95 backdrop-blur-md
        rounded-2xl shadow-2xl
        overflow-hidden
        transform transition-all duration-300
        ${isPanelOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"}
        ${className}
      `}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-theme-primary to-theme-secondary p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Prayer Times</h3>
            <p className="text-sm opacity-90">{settings.city || "Your Location"}</p>
          </div>
          <button
            onClick={() => setIsPanelOpen(false)}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Next Prayer Highlight */}
        {nextPrayer && (
          <div className="mt-3 p-3 bg-white/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs opacity-75">Next Prayer</span>
                <div className="font-bold text-lg">{PRAYER_NAMES[nextPrayer].english}</div>
              </div>
              <div className="text-right">
                <span className="text-xs opacity-75">In</span>
                <div className="font-bold text-2xl">{timeUntilNextPrayer}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
        {dateStr}
      </div>

      {/* Prayer Times List */}
      <div className="divide-y divide-gray-100">
        {prayerList.map((prayer) => (
          <PrayerTimeRow
            key={prayer.name}
            prayer={prayer}
            isAdhanPlaying={isAdhanPlaying && adhanPrayer === prayer.name}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t space-y-2">
        {/* Test Adhan Button */}
        <button
          onClick={() => {
            const prayer = contextNextPrayer || "fajr";
            testFullscreenAdhan(prayer);
            setIsPanelOpen(false);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Test Fullscreen Adhan
        </button>

        {showSettingsLink && onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-theme-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Prayer Settings
          </button>
        )}
      </div>
    </div>
  );
}

interface PrayerTimeRowProps {
  prayer: {
    name: PrayerName;
    englishName: string;
    arabicName: string;
    time: Date;
    formattedTime: string;
    isPast: boolean;
    isCurrent: boolean;
    isNext: boolean;
  };
  isAdhanPlaying: boolean;
}

function PrayerTimeRow({ prayer, isAdhanPlaying }: PrayerTimeRowProps) {
  const isSunrise = prayer.name === "sunrise";

  return (
    <div
      className={`
        flex items-center justify-between px-4 py-3
        transition-colors duration-200
        ${prayer.isNext ? "bg-theme-primary/10" : ""}
        ${prayer.isCurrent ? "bg-green-50" : ""}
        ${prayer.isPast && !prayer.isCurrent ? "opacity-50" : ""}
        ${isAdhanPlaying ? "bg-green-100 animate-pulse" : ""}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Prayer Icon */}
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            ${prayer.isNext ? "bg-theme-primary text-white" : ""}
            ${prayer.isCurrent ? "bg-green-500 text-white" : ""}
            ${!prayer.isNext && !prayer.isCurrent ? "bg-gray-100 text-gray-600" : ""}
            ${isAdhanPlaying ? "bg-green-500 text-white animate-bounce" : ""}
          `}
        >
          {isSunrise ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 12h4a5 5 0 0 1 5-5V3l5.5 5.5L12 14V10a3 3 0 0 0-3 3H3v-1zm14 0a5 5 0 0 1-5 5v4l-5.5-5.5L12 10v4a3 3 0 0 0 3-3h6v1h-4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C11.5 2 11 2.19 10.59 2.59L7.29 5.88C6.5 6.67 6 7.67 6 8.75V21H8V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21H18V8.75C18 7.67 17.5 6.67 16.71 5.88L13.41 2.59C13 2.19 12.5 2 12 2M12 4.41L14.59 7H9.41L12 4.41M10 15V21H14V15H10Z" />
            </svg>
          )}
        </div>

        {/* Prayer Name */}
        <div>
          <div className="font-medium text-gray-800">{prayer.englishName}</div>
          <div className="text-sm text-gray-500 font-arabic">{prayer.arabicName}</div>
        </div>
      </div>

      {/* Time */}
      <div className="text-right">
        <div
          className={`
            font-bold
            ${prayer.isNext ? "text-theme-primary" : ""}
            ${prayer.isCurrent ? "text-green-600" : ""}
            ${!prayer.isNext && !prayer.isCurrent ? "text-gray-700" : ""}
          `}
        >
          {prayer.formattedTime}
        </div>
        {prayer.isNext && (
          <span className="text-xs text-theme-primary font-medium">Next</span>
        )}
        {prayer.isCurrent && (
          <span className="text-xs text-green-600 font-medium">Current</span>
        )}
        {isAdhanPlaying && (
          <span className="text-xs text-green-600 font-medium animate-pulse">
            Adhan Playing
          </span>
        )}
      </div>
    </div>
  );
}

// Compact inline version for header
export function PrayerTimesInline({ className = "" }: { className?: string }) {
  const { isEnabled, settings, nextPrayer, timeUntilNextPrayer, togglePanel } =
    usePrayerTimesContext();

  if (!isEnabled || !settings || !nextPrayer) {
    return null;
  }

  return (
    <button
      onClick={togglePanel}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg
        bg-theme-primary/10 hover:bg-theme-primary/20
        text-theme-primary text-sm font-medium
        transition-colors
        ${className}
      `}
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C11.5 2 11 2.19 10.59 2.59L7.29 5.88C6.5 6.67 6 7.67 6 8.75V21H8V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21H18V8.75C18 7.67 17.5 6.67 16.71 5.88L13.41 2.59C13 2.19 12.5 2 12 2M12 4.41L14.59 7H9.41L12 4.41M10 15V21H14V15H10Z" />
      </svg>
      <span>{PRAYER_NAMES[nextPrayer].english}</span>
      <span className="opacity-75">in</span>
      <span className="font-bold">{timeUntilNextPrayer}</span>
    </button>
  );
}
