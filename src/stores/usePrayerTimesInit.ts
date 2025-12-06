/**
 * Prayer Times Initialization Hook
 *
 * This hook handles:
 * 1. Fetching prayer settings from the server via React Query
 * 2. Syncing fetched data to the Zustand store
 * 3. Starting/stopping the countdown timer
 * 4. Managing the scheduler lifecycle
 *
 * Use this hook once at the app level (or in a layout component).
 * Components that need prayer data should use the Zustand store directly.
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  usePrayerTimesStore,
  startCountdownTimer,
  stopCountdownTimer,
} from "./prayerTimesStore";
import {
  getPrayerSettings,
  getAdhanSettings,
  getMosquePrayerTimes,
  getPublicPrayerSettings,
  getPublicAdhanSettings,
  getPublicMosquePrayerTimes,
} from "../server/prayer";

// ============================================================================
// Constants
// ============================================================================

/** Cache duration for prayer settings (5 minutes) */
const SETTINGS_STALE_TIME_MS = 5 * 60 * 1000;

/** Cache duration for mosque prayer times (6 hours - they don't change often) */
const MOSQUE_TIMES_STALE_TIME_MS = 6 * 60 * 60 * 1000;

// ============================================================================
// Hook
// ============================================================================

interface UsePrayerTimesInitOptions {
  /** Optional public token - if provided, uses public API endpoints */
  publicToken?: string;
}

/**
 * Initialize prayer times data fetching and sync to Zustand store.
 * Call this once at the app level.
 */
export function usePrayerTimesInit(options: UsePrayerTimesInitOptions = {}) {
  const { publicToken } = options;
  const isPublic = !!publicToken;

  // Get store actions
  const setSettings = usePrayerTimesStore((s) => s.setSettings);
  const setAdhanSettings = usePrayerTimesStore((s) => s.setAdhanSettings);
  const setMosquePrayerTimesRaw = usePrayerTimesStore((s) => s.setMosquePrayerTimesRaw);
  const setIsLoading = usePrayerTimesStore((s) => s.setIsLoading);
  const startScheduler = usePrayerTimesStore((s) => s.startScheduler);
  const stopScheduler = usePrayerTimesStore((s) => s.stopScheduler);

  // Get state for conditional queries
  const settings = usePrayerTimesStore((s) => s.settings);
  const prayerSource = settings?.prayerSource;
  const mosqueUuid = settings?.mosqueUuid;

  // -------------------------------------------------------------------------
  // Query: Prayer Settings
  // -------------------------------------------------------------------------
  const {
    data: settingsData,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: isPublic ? ["public-prayer-settings", publicToken] : ["prayer-settings"],
    queryFn: () =>
      isPublic
        ? getPublicPrayerSettings({ data: { token: publicToken! } })
        : getPrayerSettings(),
    staleTime: SETTINGS_STALE_TIME_MS,
  });

  // -------------------------------------------------------------------------
  // Query: Adhan Settings
  // -------------------------------------------------------------------------
  const { data: adhanSettingsData, isLoading: adhanLoading } = useQuery({
    queryKey: isPublic ? ["public-adhan-settings", publicToken] : ["adhan-settings"],
    queryFn: () =>
      isPublic
        ? getPublicAdhanSettings({ data: { token: publicToken! } })
        : getAdhanSettings(),
    staleTime: SETTINGS_STALE_TIME_MS,
    enabled: !!settingsData,
  });

  // -------------------------------------------------------------------------
  // Query: Mosque Prayer Times (when using Mawaqit)
  // -------------------------------------------------------------------------
  const { data: mosquePrayerTimesData } = useQuery({
    queryKey: isPublic
      ? ["public-mosque-prayer-times", publicToken, mosqueUuid]
      : ["mosque-prayer-times", mosqueUuid],
    queryFn: () => {
      if (!mosqueUuid) return null;
      return isPublic
        ? getPublicMosquePrayerTimes({ data: { token: publicToken!, uuid: mosqueUuid } })
        : getMosquePrayerTimes({ data: { uuid: mosqueUuid } });
    },
    staleTime: MOSQUE_TIMES_STALE_TIME_MS,
    enabled: prayerSource === "mosque" && !!mosqueUuid,
  });

  // -------------------------------------------------------------------------
  // Sync to Store
  // -------------------------------------------------------------------------

  // Sync settings to store
  useEffect(() => {
    if (settingsData !== undefined) {
      setSettings(settingsData);
    }
  }, [settingsData, setSettings]);

  // Sync adhan settings to store
  useEffect(() => {
    if (adhanSettingsData) {
      setAdhanSettings(adhanSettingsData);
    }
  }, [adhanSettingsData, setAdhanSettings]);

  // Sync mosque prayer times to store
  useEffect(() => {
    if (mosquePrayerTimesData !== undefined) {
      setMosquePrayerTimesRaw(mosquePrayerTimesData);
    }
  }, [mosquePrayerTimesData, setMosquePrayerTimesRaw]);

  // Sync loading state
  useEffect(() => {
    setIsLoading(settingsLoading || adhanLoading);
  }, [settingsLoading, adhanLoading, setIsLoading]);

  // -------------------------------------------------------------------------
  // Timer & Scheduler Lifecycle
  // -------------------------------------------------------------------------

  // Start countdown timer on mount, stop on unmount
  useEffect(() => {
    startCountdownTimer();

    return () => {
      stopCountdownTimer();
      stopScheduler();
    };
  }, [stopScheduler]);

  // Start scheduler when settings are loaded
  useEffect(() => {
    if (settingsData && adhanSettingsData) {
      startScheduler();
    }
  }, [settingsData, adhanSettingsData, startScheduler]);

  // -------------------------------------------------------------------------
  // Return refetch function for manual refresh
  // -------------------------------------------------------------------------

  return {
    refetchSettings,
  };
}

/**
 * Legacy compatibility hook - provides same interface as old context
 * Use this for gradual migration, prefer direct store access for new code.
 */
export function usePrayerTimes() {
  const store = usePrayerTimesStore();

  return {
    // Settings
    settings: store.settings,
    adhanSettings: store.adhanSettings,
    isEnabled: store.isEnabled,
    isLoading: store.isLoading,

    // Prayer source
    prayerSource: store.prayerSource,
    mosqueName: store.mosqueName,
    mosqueUuid: store.mosqueUuid,

    // Prayer times
    prayerTimes: store.prayerTimes,
    currentPrayer: store.prayerTimes?.currentPrayer ?? null,
    nextPrayer: store.prayerTimes?.nextPrayer ?? null,
    nextPrayerTime: store.prayerTimes?.nextPrayerTime ?? null,
    timeUntilNextPrayer: store.timeUntilNextPrayer,

    // Mosque times
    mosquePrayerTimes: store.mosquePrayerTimes,

    // Adhan state
    isAdhanPlaying: store.isAdhanPlaying,
    adhanPrayer: store.adhanPrayer,
    triggerAdhan: store.triggerAdhan,
    stopAdhan: store.stopAdhan,

    // Panel state
    isPanelOpen: store.isPanelOpen,
    setIsPanelOpen: store.setIsPanelOpen,
    togglePanel: store.togglePanel,

    // Fullscreen adhan
    isFullscreenAdhan: store.isFullscreenAdhan,
    dismissFullscreenAdhan: store.dismissFullscreenAdhan,

    // Reminder
    activeReminder: store.activeReminder,
    dismissReminder: store.dismissReminder,

    // Actions
    testFullscreenAdhan: store.testFullscreenAdhan,
  };
}
