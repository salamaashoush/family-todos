import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  calculatePrayerTimesFromSettings,
  formatCountdown,
  isPrayerTimeNow,
  isWithinReminderWindow,
  getPrayersWithAdhan,
  type PrayerTimesResult,
  type PrayerName,
} from "../utils/prayerCalculations";
import type { PrayerSettings, PrayerAdhanSettings } from "../db/schema/prayer";
import {
  formatMawaqitPrayerTimes,
  type MawaqitPrayerTimesFormatted,
} from "../utils/mawaqit";
import {
  getPrayerSettings,
  getAdhanSettings,
  getMosquePrayerTimes,
  getPublicPrayerSettings,
  getPublicAdhanSettings,
  getPublicMosquePrayerTimes,
} from "../server/prayer";

// Check interval in milliseconds - shorter interval for more reliable detection
const CHECK_INTERVAL = 10000; // 10 seconds for reliable adhan triggering

// Threshold for detecting prayer time (2 minutes window to avoid missing)
const PRAYER_TIME_THRESHOLD_MS = 120000; // 2 minutes

// SessionStorage key for persisting triggered adhans across page refreshes
const TRIGGERED_ADHANS_KEY = "prayer_triggered_adhans";
const TRIGGERED_REMINDERS_KEY = "prayer_triggered_reminders";

// Helper to get triggered items from sessionStorage
function getTriggeredFromStorage(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Set(parsed);
    }
  } catch {
    // Ignore storage errors
  }
  return new Set();
}

// Helper to save triggered items to sessionStorage
function saveTriggeredToStorage(key: string, set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // Ignore storage errors
  }
}

interface PrayerTimesContextValue {
  // Settings
  settings: PrayerSettings | null;
  adhanSettings: PrayerAdhanSettings[];
  isEnabled: boolean;
  isLoading: boolean;

  // Prayer source info
  prayerSource: "calculated" | "mosque";
  mosqueName: string | null;
  mosqueUuid: string | null;

  // Calculated times
  prayerTimes: PrayerTimesResult | null;
  currentPrayer: PrayerName | null;
  nextPrayer: PrayerName | null;
  nextPrayerTime: Date | null;
  timeUntilNextPrayer: string;

  // Mosque-based times (when using Mawaqit)
  mosquePrayerTimes: MawaqitPrayerTimesFormatted | null;

  // Adhan state
  isAdhanPlaying: boolean;
  adhanPrayer: PrayerName | null;
  triggerAdhan: (prayer: PrayerName) => void;
  stopAdhan: () => void;

  // Panel state
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  togglePanel: () => void;

  // Fullscreen adhan
  isFullscreenAdhan: boolean;
  dismissFullscreenAdhan: () => void;

  // Reminder state
  activeReminder: PrayerName | null;
  dismissReminder: () => void;

  // Refresh
  refetchSettings: () => void;

  // Testing - force trigger fullscreen adhan view
  testFullscreenAdhan: (prayer: PrayerName) => void;
}

const PrayerTimesContext = createContext<PrayerTimesContextValue | null>(null);

interface PrayerTimesProviderProps {
  children: ReactNode;
  // Optional public token - if provided, uses public API endpoints
  // If not provided, uses authenticated endpoints
  publicToken?: string;
}

export function PrayerTimesProvider({
  children,
  publicToken,
}: PrayerTimesProviderProps) {
  // State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);
  const [adhanPrayer, setAdhanPrayer] = useState<PrayerName | null>(null);
  const [isFullscreenAdhan, setIsFullscreenAdhan] = useState(false);
  const [activeReminder, setActiveReminder] = useState<PrayerName | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Refs to track what we've already triggered - initialized from sessionStorage for page refresh resilience
  const triggeredAdhans = useRef<Set<string>>(getTriggeredFromStorage(TRIGGERED_ADHANS_KEY));
  const triggeredReminders = useRef<Set<string>>(getTriggeredFromStorage(TRIGGERED_REMINDERS_KEY));

  // Ref for precise scheduling timeout
  const nextPrayerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine query keys based on mode
  const isPublic = !!publicToken;
  const settingsQueryKey = isPublic
    ? ["public-prayer-settings", publicToken]
    : ["prayer-settings"];
  const adhanSettingsQueryKey = isPublic
    ? ["public-adhan-settings", publicToken]
    : ["adhan-settings"];

  // Fetch prayer settings using React Query
  const {
    data: settings,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: settingsQueryKey,
    queryFn: () =>
      isPublic
        ? getPublicPrayerSettings({ data: { token: publicToken! } })
        : getPrayerSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch adhan settings using React Query
  const { data: adhanSettings = [], isLoading: adhanLoading } = useQuery({
    queryKey: adhanSettingsQueryKey,
    queryFn: () =>
      isPublic
        ? getPublicAdhanSettings({ data: { token: publicToken! } })
        : getAdhanSettings(),
    staleTime: 5 * 60 * 1000,
    enabled: !!settings,
  });

  const isEnabled = settings?.isEnabled ?? false;
  const isLoading = settingsLoading || adhanLoading;
  const prayerSource = (settings?.prayerSource as "calculated" | "mosque") || "calculated";
  const mosqueUuid = settings?.mosqueUuid || null;
  const mosqueName = settings?.mosqueName || null;

  // Fetch mosque prayer times using React Query (when in mosque mode)
  const mosquePrayerTimesQueryKey = isPublic
    ? ["public-mosque-prayer-times", publicToken, mosqueUuid]
    : ["mosque-prayer-times", mosqueUuid];

  const { data: mosquePrayerTimesData } = useQuery({
    queryKey: mosquePrayerTimesQueryKey,
    queryFn: () => {
      if (!mosqueUuid) return null;
      return isPublic
        ? getPublicMosquePrayerTimes({ data: { token: publicToken!, uuid: mosqueUuid } })
        : getMosquePrayerTimes({ data: { uuid: mosqueUuid } });
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours (mosque times don't change often)
    enabled: prayerSource === "mosque" && !!mosqueUuid,
  });

  // Format mosque prayer times
  const mosquePrayerTimes = useMemo(() => {
    if (!mosquePrayerTimesData || prayerSource !== "mosque") return null;
    return formatMawaqitPrayerTimes(mosquePrayerTimesData, settings?.timezone);
  }, [mosquePrayerTimesData, prayerSource, settings?.timezone]);

  // Calculate prayer times - use mosque times if available, otherwise calculate
  const prayerTimes = useMemo(() => {
    if (!settings || !isEnabled) return null;

    // If using mosque mode and we have mosque prayer times, convert them to PrayerTimesResult format
    if (prayerSource === "mosque" && mosquePrayerTimes) {
      // Determine current and next prayer based on mosque times
      const now = currentTime;
      const prayerOrder: PrayerName[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
      let currentPrayer: PrayerName | null = null;
      let nextPrayer: PrayerName | null = null;
      let nextPrayerTime: Date | null = null;

      for (let i = 0; i < prayerOrder.length; i++) {
        const prayer = prayerOrder[i];
        const prayerTime = mosquePrayerTimes[prayer];
        const nextIdx = i + 1;
        const nextPrayerInOrder = nextIdx < prayerOrder.length ? mosquePrayerTimes[prayerOrder[nextIdx]] : null;

        if (prayerTime <= now && (!nextPrayerInOrder || nextPrayerInOrder > now)) {
          currentPrayer = prayer;
        }

        if (prayerTime > now && !nextPrayer) {
          nextPrayer = prayer;
          nextPrayerTime = prayerTime;
        }
      }

      // If no next prayer today, next is fajr tomorrow
      if (!nextPrayer) {
        nextPrayer = "fajr";
        const tomorrow = new Date(mosquePrayerTimes.fajr);
        tomorrow.setDate(tomorrow.getDate() + 1);
        nextPrayerTime = tomorrow;
      }

      const timeUntilNext = nextPrayerTime ? nextPrayerTime.getTime() - now.getTime() : null;

      return {
        fajr: mosquePrayerTimes.fajr,
        sunrise: mosquePrayerTimes.sunrise,
        dhuhr: mosquePrayerTimes.dhuhr,
        asr: mosquePrayerTimes.asr,
        maghrib: mosquePrayerTimes.maghrib,
        isha: mosquePrayerTimes.isha,
        currentPrayer,
        nextPrayer,
        nextPrayerTime,
        timeUntilNextPrayer: timeUntilNext,
      } as PrayerTimesResult;
    }

    // Default: calculate from settings
    return calculatePrayerTimesFromSettings(settings, currentTime);
  }, [settings, isEnabled, currentTime, prayerSource, mosquePrayerTimes]);

  // Format countdown
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

  // Trigger adhan
  const triggerAdhan = useCallback(
    (prayer: PrayerName) => {
      const prayerAdhanSettings = getAdhanSettingsForPrayer(prayer);
      if (!prayerAdhanSettings?.adhanEnabled) return;

      setAdhanPrayer(prayer);
      setIsAdhanPlaying(true);

      // Show fullscreen if enabled
      if (settings?.fullscreenAdhanEnabled) {
        setIsFullscreenAdhan(true);
      }
    },
    [settings?.fullscreenAdhanEnabled, getAdhanSettingsForPrayer]
  );

  // Stop adhan
  const stopAdhan = useCallback(() => {
    setIsAdhanPlaying(false);
    setAdhanPrayer(null);
    setIsFullscreenAdhan(false);
  }, []);

  // Test function - force trigger fullscreen adhan (bypasses settings checks)
  const testFullscreenAdhan = useCallback((prayer: PrayerName) => {
    setAdhanPrayer(prayer);
    setIsAdhanPlaying(true);
    setIsFullscreenAdhan(true);
  }, []);

  // Dismiss fullscreen adhan (but audio may continue)
  const dismissFullscreenAdhan = useCallback(() => {
    setIsFullscreenAdhan(false);
  }, []);

  // Dismiss reminder
  const dismissReminder = useCallback(() => {
    setActiveReminder(null);
  }, []);

  // Toggle panel
  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  // Time update effect with page visibility handling
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, CHECK_INTERVAL);

    // Handle page visibility changes - check immediately when page becomes visible
    // This catches prayers that might have been missed while tab was in background
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setCurrentTime(new Date());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Precise scheduling for next prayer - sets a timeout to trigger exactly at prayer time
  useEffect(() => {
    if (!prayerTimes || !settings || !isEnabled) return;

    // Clear any existing timeout
    if (nextPrayerTimeoutRef.current) {
      clearTimeout(nextPrayerTimeoutRef.current);
      nextPrayerTimeoutRef.current = null;
    }

    const now = new Date();
    const dateKey = now.toISOString().split("T")[0];

    // Find the next upcoming prayer that has adhan enabled and hasn't been triggered
    let nextUpcomingPrayer: { prayer: PrayerName; time: Date } | null = null;

    for (const prayer of getPrayersWithAdhan()) {
      const prayerTime = prayerTimes[prayer];
      const prayerAdhanSettings = getAdhanSettingsForPrayer(prayer);
      const adhanKey = `${dateKey}-${prayer}-adhan`;

      // Skip if already triggered or adhan not enabled
      if (triggeredAdhans.current.has(adhanKey) || !prayerAdhanSettings?.adhanEnabled) {
        continue;
      }

      // Check if this prayer is in the future
      const timeUntil = prayerTime.getTime() - now.getTime();
      if (timeUntil > 0) {
        if (!nextUpcomingPrayer || prayerTime < nextUpcomingPrayer.time) {
          nextUpcomingPrayer = { prayer, time: prayerTime };
        }
      }
    }

    // Schedule precise timeout for the next prayer
    if (nextUpcomingPrayer) {
      const timeUntil = nextUpcomingPrayer.time.getTime() - now.getTime();
      // Only schedule if within 24 hours (avoid very long timeouts)
      if (timeUntil > 0 && timeUntil < 24 * 60 * 60 * 1000) {
        nextPrayerTimeoutRef.current = setTimeout(() => {
          // Trigger immediate check when the scheduled time arrives
          setCurrentTime(new Date());
        }, timeUntil);
      }
    }

    return () => {
      if (nextPrayerTimeoutRef.current) {
        clearTimeout(nextPrayerTimeoutRef.current);
      }
    };
  }, [prayerTimes, settings, isEnabled, getAdhanSettingsForPrayer]);

  // Check for prayer times and reminders
  useEffect(() => {
    if (!prayerTimes || !settings || !isEnabled) return;

    const now = new Date();
    const dateKey = now.toISOString().split("T")[0];

    // Check each prayer with adhan
    for (const prayer of getPrayersWithAdhan()) {
      const prayerTime = prayerTimes[prayer];
      const prayerAdhanSettings = getAdhanSettingsForPrayer(prayer);

      // Check if it's time for adhan (using wider threshold for reliability)
      const adhanKey = `${dateKey}-${prayer}-adhan`;
      if (
        !triggeredAdhans.current.has(adhanKey) &&
        isPrayerTimeNow(prayerTime, now, PRAYER_TIME_THRESHOLD_MS)
      ) {
        triggeredAdhans.current.add(adhanKey);
        saveTriggeredToStorage(TRIGGERED_ADHANS_KEY, triggeredAdhans.current);
        if (prayerAdhanSettings?.adhanEnabled) {
          triggerAdhan(prayer);
        }
      }

      // Check if it's time for reminder
      if (prayerAdhanSettings?.reminderEnabled) {
        const reminderKey = `${dateKey}-${prayer}-reminder`;
        if (
          !triggeredReminders.current.has(reminderKey) &&
          isWithinReminderWindow(
            prayerTime,
            now,
            prayerAdhanSettings.reminderMinutesBefore || 15
          )
        ) {
          triggeredReminders.current.add(reminderKey);
          saveTriggeredToStorage(TRIGGERED_REMINDERS_KEY, triggeredReminders.current);
          setActiveReminder(prayer);
        }
      }
    }

    // Clear old triggered items at midnight
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    const midnightKey = midnight.toISOString().split("T")[0];
    if (dateKey !== midnightKey) {
      triggeredAdhans.current.clear();
      triggeredReminders.current.clear();
      saveTriggeredToStorage(TRIGGERED_ADHANS_KEY, triggeredAdhans.current);
      saveTriggeredToStorage(TRIGGERED_REMINDERS_KEY, triggeredReminders.current);
    }
  }, [
    prayerTimes,
    settings,
    isEnabled,
    currentTime,
    getAdhanSettingsForPrayer,
    triggerAdhan,
  ]);

  const contextValue: PrayerTimesContextValue = {
    settings: settings ?? null,
    adhanSettings,
    isEnabled,
    isLoading,
    // Prayer source info
    prayerSource,
    mosqueName,
    mosqueUuid,
    // Prayer times
    prayerTimes,
    currentPrayer: prayerTimes?.currentPrayer ?? null,
    nextPrayer: prayerTimes?.nextPrayer ?? null,
    nextPrayerTime: prayerTimes?.nextPrayerTime ?? null,
    timeUntilNextPrayer,
    // Mosque prayer times (with iqama)
    mosquePrayerTimes,
    // Adhan state
    isAdhanPlaying,
    adhanPrayer,
    triggerAdhan,
    stopAdhan,
    isPanelOpen,
    setIsPanelOpen,
    togglePanel,
    isFullscreenAdhan,
    dismissFullscreenAdhan,
    activeReminder,
    dismissReminder,
    refetchSettings: () => {
      refetchSettings();
    },
    testFullscreenAdhan,
  };

  return (
    <PrayerTimesContext.Provider value={contextValue}>
      {children}
    </PrayerTimesContext.Provider>
  );
}

export function usePrayerTimesContext() {
  const context = useContext(PrayerTimesContext);
  if (!context) {
    throw new Error(
      "usePrayerTimesContext must be used within a PrayerTimesProvider"
    );
  }
  return context;
}

// Optional hook that doesn't throw if context is missing
export function usePrayerTimesContextOptional() {
  return useContext(PrayerTimesContext);
}
