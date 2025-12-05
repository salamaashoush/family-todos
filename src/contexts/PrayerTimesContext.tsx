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

// Check interval in milliseconds
const CHECK_INTERVAL = 30000; // 30 seconds

interface PrayerTimesContextValue {
  // Settings
  settings: PrayerSettings | null;
  adhanSettings: PrayerAdhanSettings[];
  isEnabled: boolean;
  isLoading: boolean;

  // Calculated times
  prayerTimes: PrayerTimesResult | null;
  currentPrayer: PrayerName | null;
  nextPrayer: PrayerName | null;
  nextPrayerTime: Date | null;
  timeUntilNextPrayer: string;

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
  // Function to fetch settings - allows different implementations for public vs authenticated
  fetchSettings: () => Promise<PrayerSettings | null>;
  fetchAdhanSettings: () => Promise<PrayerAdhanSettings[]>;
  // Query keys for React Query
  settingsQueryKey: string[];
  adhanSettingsQueryKey: string[];
}

export function PrayerTimesProvider({
  children,
  fetchSettings,
  fetchAdhanSettings,
  settingsQueryKey,
  adhanSettingsQueryKey,
}: PrayerTimesProviderProps) {
  // State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);
  const [adhanPrayer, setAdhanPrayer] = useState<PrayerName | null>(null);
  const [isFullscreenAdhan, setIsFullscreenAdhan] = useState(false);
  const [activeReminder, setActiveReminder] = useState<PrayerName | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Refs to track what we've already triggered
  const triggeredAdhans = useRef<Set<string>>(new Set());
  const triggeredReminders = useRef<Set<string>>(new Set());

  // Fetch prayer settings
  const {
    data: settings,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: settingsQueryKey,
    queryFn: fetchSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch adhan settings
  const { data: adhanSettings = [], isLoading: adhanLoading } = useQuery({
    queryKey: adhanSettingsQueryKey,
    queryFn: fetchAdhanSettings,
    staleTime: 5 * 60 * 1000,
    enabled: !!settings,
  });

  const isEnabled = settings?.isEnabled ?? false;
  const isLoading = settingsLoading || adhanLoading;

  // Calculate prayer times
  const prayerTimes = useMemo(() => {
    if (!settings || !isEnabled) return null;
    return calculatePrayerTimesFromSettings(settings, currentTime);
  }, [settings, isEnabled, currentTime]);

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

  // Time update effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Check for prayer times and reminders
  useEffect(() => {
    if (!prayerTimes || !settings || !isEnabled) return;

    const now = new Date();
    const dateKey = now.toISOString().split("T")[0];

    // Check each prayer with adhan
    for (const prayer of getPrayersWithAdhan()) {
      const prayerTime = prayerTimes[prayer];
      const prayerAdhanSettings = getAdhanSettingsForPrayer(prayer);

      // Check if it's time for adhan
      const adhanKey = `${dateKey}-${prayer}-adhan`;
      if (
        !triggeredAdhans.current.has(adhanKey) &&
        isPrayerTimeNow(prayerTime, now)
      ) {
        triggeredAdhans.current.add(adhanKey);
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
    prayerTimes,
    currentPrayer: prayerTimes?.currentPrayer ?? null,
    nextPrayer: prayerTimes?.nextPrayer ?? null,
    nextPrayerTime: prayerTimes?.nextPrayerTime ?? null,
    timeUntilNextPrayer,
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
