import { useMemo } from "react";
import { Settings } from "lucide-react";
import { usePrayerTimesStore } from "../../stores/prayerTimesStore";
import { PRAYER_NAMES, getPrayerOrder, formatPrayerTime, calculateFastingTimes, type PrayerName } from "../../utils/prayerCalculations";
import { gregorianToHijri, formatHijriDate, isRamadan, getIslamicEvent } from "../../utils/hijriCalendar";
import { calculateQiblaDirection, getCardinalDirection } from "../../utils/qiblaDirection";
import { FloatingPanel, PanelInfoBar, PanelDateDisplay } from "../shared";

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
  // Use Zustand store with selectors for optimal re-renders
  const isEnabled = usePrayerTimesStore((s) => s.isEnabled);
  const settings = usePrayerTimesStore((s) => s.settings);
  const prayerTimes = usePrayerTimesStore((s) => s.prayerTimes);
  const isPanelOpen = usePrayerTimesStore((s) => s.isPanelOpen);
  const setIsPanelOpen = usePrayerTimesStore((s) => s.setIsPanelOpen);
  const isAdhanPlaying = usePrayerTimesStore((s) => s.isAdhanPlaying);
  const adhanPrayer = usePrayerTimesStore((s) => s.adhanPrayer);
  const testFullscreenAdhan = usePrayerTimesStore((s) => s.testFullscreenAdhan);
  const nextPrayer = usePrayerTimesStore((s) => s.prayerTimes?.nextPrayer ?? null);
  const timeUntilNextPrayer = usePrayerTimesStore((s) => s.timeUntilNextPrayer);
  const prayerSource = usePrayerTimesStore((s) => s.prayerSource);
  const mosqueName = usePrayerTimesStore((s) => s.mosqueName);

  const today = new Date();

  // Build prayer list from context's prayerTimes (which handles both calculated and mosque-based)
  const prayerList = useMemo(() => {
    if (!prayerTimes || !settings) return [];

    const order = getPrayerOrder();
    const now = new Date();

    return order.map((prayer) => {
      const time = prayerTimes[prayer];
      const isPast = time < now;
      const isCurrent = prayerTimes.currentPrayer === prayer;
      const isNext = prayerTimes.nextPrayer === prayer;

      return {
        name: prayer,
        englishName: PRAYER_NAMES[prayer].english,
        arabicName: PRAYER_NAMES[prayer].arabic,
        time,
        formattedTime: formatPrayerTime(time, settings.timezone),
        isPast,
        isCurrent,
        isNext,
      };
    });
  }, [prayerTimes, settings]);

  // Hijri date - must be before early return
  const hijriDate = useMemo(() => gregorianToHijri(today), [today]);

  // Qibla direction - must be before early return
  const qibla = useMemo(
    () => {
      if (!settings) return { direction: 0, distance: 0 };
      return calculateQiblaDirection(parseFloat(settings.latitude), parseFloat(settings.longitude));
    },
    [settings]
  );

  // Fasting times - must be before early return
  const fastingTimes = useMemo(() => {
    if (!prayerTimes) return null;
    return calculateFastingTimes(prayerTimes);
  }, [prayerTimes]);

  if (!isEnabled || !settings || !isPanelOpen) {
    return null;
  }

  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: settings.timezone,
  });

  const hijriDateStr = formatHijriDate(hijriDate, "long");
  const inRamadan = isRamadan(hijriDate);
  const islamicEvent = getIslamicEvent(hijriDate);
  const qiblaCardinal = getCardinalDirection(qibla.direction);

  const subtitle = prayerSource === "mosque" && mosqueName
    ? mosqueName
    : settings.city || "Your Location";

  const headerIcon = (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C11.5 2 11 2.19 10.59 2.59L7.29 5.88C6.5 6.67 6 7.67 6 8.75V21H8V14C8 13.45 8.45 13 9 13H15C15.55 13 16 13.45 16 14V21H18V8.75C18 7.67 17.5 6.67 16.71 5.88L13.41 2.59C13 2.19 12.5 2 12 2M12 4.41L14.59 7H9.41L12 4.41M10 15V21H14V15H10Z" />
    </svg>
  );

  const footer = (
    <div className="space-y-2">
      {/* Test Adhan Button - Only in development */}
      {import.meta.env.DEV && (
        <button
          onClick={() => {
            const prayer = nextPrayer || "fajr";
            testFullscreenAdhan(prayer);
            setIsPanelOpen(false);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg transition-colors font-medium border border-amber-300"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          [DEV] Test Fullscreen Adhan
        </button>
      )}

      {showSettingsLink && onSettingsClick && (
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-theme-primary transition-colors"
        >
          <Settings className="w-4 h-4" />
          Prayer Settings
        </button>
      )}
    </div>
  );

  return (
    <FloatingPanel
      isOpen={isPanelOpen}
      onClose={() => setIsPanelOpen(false)}
      title="Prayer Times"
      subtitle={subtitle}
      headerGradient="from-theme-primary to-theme-secondary"
      headerIcon={headerIcon}
      footer={footer}
      className={className}
    >
      {/* Next Prayer Highlight */}
      {nextPrayer && (
        <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-theme-primary/10 to-theme-secondary/10 rounded-xl border border-theme-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500">Next Prayer</span>
              <div className="font-bold text-lg text-gray-800">{PRAYER_NAMES[nextPrayer].english}</div>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">In</span>
              <div className="font-bold text-2xl text-theme-primary">{timeUntilNextPrayer}</div>
            </div>
          </div>
        </div>
      )}

      {/* Date */}
      <PanelDateDisplay
        gregorianDate={dateStr}
        hijriDate={hijriDateStr}
        event={islamicEvent}
        className="mt-4"
      />

      {/* Qibla & Fasting Info Bar */}
      <PanelInfoBar gradient="from-emerald-50 to-teal-50">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor" style={{ transform: `rotate(${qibla.direction}deg)` }}>
            <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />
          </svg>
          <span className="text-emerald-700">
            Qibla: {qibla.direction.toFixed(0)} {qiblaCardinal}
          </span>
        </div>
        {inRamadan && fastingTimes && (
          <span className="text-emerald-700 font-medium">
            Fast: {fastingTimes.fastDuration}
          </span>
        )}
      </PanelInfoBar>

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
    </FloatingPanel>
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
  const isEnabled = usePrayerTimesStore((s) => s.isEnabled);
  const settings = usePrayerTimesStore((s) => s.settings);
  const nextPrayer = usePrayerTimesStore((s) => s.prayerTimes?.nextPrayer ?? null);
  const timeUntilNextPrayer = usePrayerTimesStore((s) => s.timeUntilNextPrayer);
  const togglePanel = usePrayerTimesStore((s) => s.togglePanel);

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
