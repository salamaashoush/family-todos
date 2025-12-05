import { PRAYER_NAMES, formatPrayerTime } from "../../../utils/prayerCalculations";
import type { MawaqitPrayerTimesResponse } from "../../../utils/mawaqit";

interface PrayerTimesPreviewProps {
  times: {
    fajr: Date;
    sunrise: Date;
    dhuhr: Date;
    asr: Date;
    maghrib: Date;
    isha: Date;
  };
  timezone: string;
}

const PRAYER_ORDER = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;

export function PrayerTimesPreview({ times, timezone }: PrayerTimesPreviewProps) {
  return (
    <div className="bg-gradient-to-r from-theme-primary/10 to-theme-secondary/10 border-2 border-theme-primary/30 rounded-xl p-4 sm:p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Prayer Times Preview</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {PRAYER_ORDER.map((prayer) => (
          <div key={prayer} className="text-center bg-white rounded-xl p-3 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">
              {PRAYER_NAMES[prayer].english}
            </div>
            <div className="font-bold text-gray-800">
              {formatPrayerTime(times[prayer], timezone)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mosque-based prayer times preview with iqama times
interface MosquePrayerTimesPreviewProps {
  times: MawaqitPrayerTimesResponse;
  mosqueName?: string | null;
}

export function MosquePrayerTimesPreview({ times, mosqueName }: MosquePrayerTimesPreviewProps) {
  const prayers = [
    { name: "Fajr", time: times.times[0], iqama: times.iqama?.fajr },
    { name: "Sunrise", time: times.shuruq, iqama: null },
    { name: "Dhuhr", time: times.times[1], iqama: times.iqama?.dhuhr },
    { name: "Asr", time: times.times[2], iqama: times.iqama?.asr },
    { name: "Maghrib", time: times.times[3], iqama: times.iqama?.maghrib },
    { name: "Isha", time: times.times[4], iqama: times.iqama?.isha },
  ];

  return (
    <div className="bg-gradient-to-r from-theme-primary/10 to-theme-secondary/10 border-2 border-theme-primary/30 rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">Prayer Times Preview</h3>
        {mosqueName && (
          <span className="text-sm text-theme-primary font-medium">
            From: {mosqueName}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {prayers.map((prayer) => (
          <div key={prayer.name} className="text-center bg-white rounded-xl p-3 shadow-sm">
            <div className="text-xs text-gray-500 mb-1">{prayer.name}</div>
            <div className="font-bold text-gray-800">{prayer.time || "-"}</div>
            {prayer.iqama && (
              <div className="text-xs text-theme-primary mt-1">
                Iqama: {prayer.iqama}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
