import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  calculatePrayerTimesFromSettings,
  formatCountdown,
  formatPrayerTime,
  isPrayerTimeNow,
  isWithinReminderWindow,
  getPrayersWithAdhan,
  getPrayerOrder,
  PRAYER_NAMES,
  type PrayerTimesResult,
  type PrayerName,
} from "../utils/prayerCalculations";
import type { PrayerSettings, PrayerAdhanSettings } from "../db/schema/prayer";

// Refresh interval for countdown updates (1 second for smoother countdown)
const COUNTDOWN_REFRESH_INTERVAL = 1000;
// Check interval for prayer time triggers (30 seconds)
const TRIGGER_CHECK_INTERVAL = 30000;

interface UsePrayerTimesOptions {
  settings: PrayerSettings | null;
  adhanSettings?: PrayerAdhanSettings[];
  enabled?: boolean;
  onAdhanTime?: (prayer: PrayerName) => void;
  onReminderTime?: (prayer: PrayerName, minutesBefore: number) => void;
}

interface UsePrayerTimesReturn {
  // Prayer times
  prayerTimes: PrayerTimesResult | null;
  formattedTimes: Record<PrayerName, string> | null;

  // Current state
  currentPrayer: PrayerName | null;
  nextPrayer: PrayerName | null;
  nextPrayerTime: Date | null;
  timeUntilNextPrayer: string;
  timeUntilNextPrayerMs: number | null;

  // Prayer list for display
  prayerList: Array<{
    name: PrayerName;
    englishName: string;
    arabicName: string;
    time: Date;
    formattedTime: string;
    isPast: boolean;
    isCurrent: boolean;
    isNext: boolean;
  }>;

  // Utility
  isLoading: boolean;
  refresh: () => void;
}

export function usePrayerTimes({
  settings,
  adhanSettings = [],
  enabled = true,
  onAdhanTime,
  onReminderTime,
}: UsePrayerTimesOptions): UsePrayerTimesReturn {
  const [currentTime, setCurrentTime] = useState(new Date());
  const triggeredAdhans = useRef<Set<string>>(new Set());
  const triggeredReminders = useRef<Set<string>>(new Set());

  // Update current time for countdown display
  useEffect(() => {
    if (!enabled || !settings) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, COUNTDOWN_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [enabled, settings]);

  // Calculate prayer times
  const prayerTimes = useMemo(() => {
    if (!settings || !enabled) return null;
    return calculatePrayerTimesFromSettings(settings, currentTime);
  }, [settings, enabled, currentTime]);

  // Format times for display
  const formattedTimes = useMemo(() => {
    if (!prayerTimes || !settings) return null;

    const order = getPrayerOrder();
    const formatted: Record<string, string> = {};

    for (const prayer of order) {
      formatted[prayer] = formatPrayerTime(prayerTimes[prayer], settings.timezone);
    }

    return formatted as Record<PrayerName, string>;
  }, [prayerTimes, settings]);

  // Create prayer list for display
  const prayerList = useMemo(() => {
    if (!prayerTimes || !settings) return [];

    const order = getPrayerOrder();
    const now = currentTime;

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
  }, [prayerTimes, settings, currentTime]);

  // Time until next prayer
  const timeUntilNextPrayer = useMemo(() => {
    if (!prayerTimes?.timeUntilNextPrayer) return "";
    return formatCountdown(prayerTimes.timeUntilNextPrayer);
  }, [prayerTimes?.timeUntilNextPrayer]);

  // Get adhan settings for a prayer
  const getAdhanSettingsForPrayer = useCallback(
    (prayer: PrayerName): PrayerAdhanSettings | undefined => {
      return adhanSettings.find((s) => s.prayerName === prayer);
    },
    [adhanSettings]
  );

  // Check for adhan and reminder triggers
  useEffect(() => {
    if (!prayerTimes || !settings || !enabled) return;

    const checkTriggers = () => {
      const now = new Date();
      const dateKey = now.toISOString().split("T")[0];

      for (const prayer of getPrayersWithAdhan()) {
        const prayerTime = prayerTimes[prayer];
        const prayerAdhanSettings = getAdhanSettingsForPrayer(prayer);

        // Check for adhan time
        const adhanKey = `${dateKey}-${prayer}-adhan`;
        if (!triggeredAdhans.current.has(adhanKey) && isPrayerTimeNow(prayerTime, now)) {
          triggeredAdhans.current.add(adhanKey);
          if (prayerAdhanSettings?.adhanEnabled && onAdhanTime) {
            onAdhanTime(prayer);
          }
        }

        // Check for reminder time
        if (prayerAdhanSettings?.reminderEnabled && onReminderTime) {
          const minutesBefore = prayerAdhanSettings.reminderMinutesBefore || 15;
          const reminderKey = `${dateKey}-${prayer}-reminder-${minutesBefore}`;

          if (
            !triggeredReminders.current.has(reminderKey) &&
            isWithinReminderWindow(prayerTime, now, minutesBefore)
          ) {
            triggeredReminders.current.add(reminderKey);
            onReminderTime(prayer, minutesBefore);
          }
        }
      }
    };

    // Initial check
    checkTriggers();

    // Set up interval for checking
    const interval = setInterval(checkTriggers, TRIGGER_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [prayerTimes, settings, enabled, getAdhanSettingsForPrayer, onAdhanTime, onReminderTime]);

  // Clear triggers at midnight
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      triggeredAdhans.current.clear();
      triggeredReminders.current.clear();
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  // Refresh function
  const refresh = useCallback(() => {
    setCurrentTime(new Date());
  }, []);

  return {
    prayerTimes,
    formattedTimes,
    currentPrayer: prayerTimes?.currentPrayer ?? null,
    nextPrayer: prayerTimes?.nextPrayer ?? null,
    nextPrayerTime: prayerTimes?.nextPrayerTime ?? null,
    timeUntilNextPrayer,
    timeUntilNextPrayerMs: prayerTimes?.timeUntilNextPrayer ?? null,
    prayerList,
    isLoading: false,
    refresh,
  };
}

// Hook for geolocation with reverse geocoding
export function useGeolocation() {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reverse geocode coordinates to get city/country
  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    try {
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
        {
          headers: {
            "User-Agent": "FamilyTodos/1.0",
          },
        }
      );

      if (!response.ok) {
        return { city: undefined, country: undefined };
      }

      const data = await response.json();
      const address = data.address || {};

      // Try to get city from various fields
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        undefined;

      const country = address.country || undefined;

      return { city, country };
    } catch {
      // Silently fail - city/country are optional
      return { city: undefined, country: undefined };
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Get city/country via reverse geocoding
        const { city, country } = await reverseGeocode(latitude, longitude);

        setLocation({
          latitude,
          longitude,
          city,
          country,
        });
        setIsLoading(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location permission denied");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location information unavailable");
            break;
          case err.TIMEOUT:
            setError("Location request timed out");
            break;
          default:
            setError("An unknown error occurred");
        }
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [reverseGeocode]);

  return {
    location,
    error,
    isLoading,
    requestLocation,
    isSupported: typeof navigator !== "undefined" && "geolocation" in navigator,
  };
}

// Hook for timezone detection
export function useTimezone() {
  const [timezone, setTimezone] = useState<string>("");

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(tz);
    } catch {
      setTimezone("UTC");
    }
  }, []);

  return timezone;
}
