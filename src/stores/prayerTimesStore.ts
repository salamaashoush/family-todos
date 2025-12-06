/**
 * Prayer Times Zustand Store
 *
 * A robust, well-tested store for managing prayer times state.
 * Uses Zustand for efficient state management with automatic memoization.
 *
 * Features:
 * - Calculated prayer times based on location and method
 * - Mosque-based prayer times via Mawaqit API
 * - Adhan and reminder scheduling via PrayerScheduler
 * - Countdown timer to next prayer
 * - Fullscreen adhan view management
 * - Selective subscriptions to prevent unnecessary re-renders
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  calculatePrayerTimesFromSettings,
  formatCountdown,
  getPrayersWithAdhan,
  type PrayerTimesResult,
  type PrayerName,
} from "../utils/prayerCalculations";
import type { PrayerSettings, PrayerAdhanSettings } from "../db/schema/prayer";
import {
  formatMawaqitPrayerTimes,
  type MawaqitPrayerTimesFormatted,
  type MawaqitPrayerTimesResponse,
} from "../utils/mawaqit";
import { PrayerScheduler, type PrayerConfig } from "../utils/prayerScheduler";

// ============================================================================
// Types
// ============================================================================

export type PrayerSource = "calculated" | "mosque";

export interface PrayerTimesState {
  // Settings (loaded from server)
  settings: PrayerSettings | null;
  adhanSettings: PrayerAdhanSettings[];
  isEnabled: boolean;
  isLoading: boolean;

  // Prayer source info
  prayerSource: PrayerSource;
  mosqueName: string | null;
  mosqueUuid: string | null;

  // Raw mosque data (before formatting)
  mosquePrayerTimesRaw: MawaqitPrayerTimesResponse | null;

  // Calculated/formatted times
  prayerTimes: PrayerTimesResult | null;
  mosquePrayerTimes: MawaqitPrayerTimesFormatted | null;

  // Current time tracking
  currentTime: Date;
  timeUntilNextPrayer: string;

  // Adhan state
  isAdhanPlaying: boolean;
  adhanPrayer: PrayerName | null;

  // Fullscreen adhan
  isFullscreenAdhan: boolean;

  // Reminder state
  activeReminder: PrayerName | null;

  // Panel state
  isPanelOpen: boolean;
}

export interface PrayerTimesActions {
  // Settings management
  setSettings: (settings: PrayerSettings | null) => void;
  setAdhanSettings: (adhanSettings: PrayerAdhanSettings[]) => void;
  setIsLoading: (loading: boolean) => void;
  setMosquePrayerTimesRaw: (data: MawaqitPrayerTimesResponse | null) => void;

  // Adhan controls
  triggerAdhan: (prayer: PrayerName) => void;
  stopAdhan: () => void;

  // Fullscreen adhan
  dismissFullscreenAdhan: () => void;
  testFullscreenAdhan: (prayer: PrayerName) => void;

  // Reminder controls
  triggerReminder: (prayer: PrayerName, minutesBefore: number) => void;
  dismissReminder: () => void;

  // Panel controls
  setIsPanelOpen: (open: boolean) => void;
  togglePanel: () => void;

  // Time updates
  updateCurrentTime: () => void;

  // Scheduler management
  startScheduler: () => void;
  stopScheduler: () => void;

  // Computed getters (for convenience, though selectors are preferred)
  getAdhanSettingsForPrayer: (prayer: PrayerName) => PrayerAdhanSettings | undefined;
}

export type PrayerTimesStore = PrayerTimesState & PrayerTimesActions;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate current and next prayer from mosque times
 */
function calculateMosquePrayerState(
  mosquePrayerTimes: MawaqitPrayerTimesFormatted,
  currentTime: Date
): Pick<PrayerTimesResult, "currentPrayer" | "nextPrayer" | "nextPrayerTime" | "timeUntilNextPrayer"> {
  const prayerOrder: PrayerName[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
  let currentPrayer: PrayerName | null = null;
  let nextPrayer: PrayerName | null = null;
  let nextPrayerTime: Date | null = null;

  for (let i = 0; i < prayerOrder.length; i++) {
    const prayer = prayerOrder[i];
    const prayerTime = mosquePrayerTimes[prayer];
    const nextIdx = i + 1;
    const nextPrayerInOrder = nextIdx < prayerOrder.length
      ? mosquePrayerTimes[prayerOrder[nextIdx]]
      : null;

    if (prayerTime <= currentTime && (!nextPrayerInOrder || nextPrayerInOrder > currentTime)) {
      currentPrayer = prayer;
    }

    if (prayerTime > currentTime && !nextPrayer) {
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

  const timeUntilNextPrayer = nextPrayerTime
    ? nextPrayerTime.getTime() - currentTime.getTime()
    : null;

  return { currentPrayer, nextPrayer, nextPrayerTime, timeUntilNextPrayer };
}

/**
 * Build scheduler configs from prayer times and adhan settings
 */
function buildSchedulerConfigs(
  prayerTimes: PrayerTimesResult,
  adhanSettings: PrayerAdhanSettings[]
): PrayerConfig[] {
  const getAdhanSettingsForPrayer = (prayer: PrayerName): PrayerAdhanSettings | undefined => {
    return adhanSettings.find((s) => s.prayerName === prayer);
  };

  return getPrayersWithAdhan().map((prayer) => {
    const settings = getAdhanSettingsForPrayer(prayer);
    return {
      prayer,
      time: prayerTimes[prayer],
      adhanEnabled: settings?.adhanEnabled ?? false,
      reminderEnabled: settings?.reminderEnabled ?? false,
      reminderMinutesBefore: settings?.reminderMinutesBefore ?? 15,
    };
  });
}

/**
 * Calculate prayer times from settings or mosque data
 */
function calculatePrayerTimes(
  settings: PrayerSettings | null,
  mosquePrayerTimesRaw: MawaqitPrayerTimesResponse | null,
  currentTime: Date
): { prayerTimes: PrayerTimesResult | null; mosquePrayerTimes: MawaqitPrayerTimesFormatted | null } {
  if (!settings || !settings.isEnabled) {
    return { prayerTimes: null, mosquePrayerTimes: null };
  }

  const prayerSource = (settings.prayerSource as PrayerSource) || "calculated";

  // Mosque mode: use mosque times
  if (prayerSource === "mosque" && mosquePrayerTimesRaw) {
    const formatted = formatMawaqitPrayerTimes(mosquePrayerTimesRaw, settings.timezone);
    const { currentPrayer, nextPrayer, nextPrayerTime, timeUntilNextPrayer } =
      calculateMosquePrayerState(formatted, currentTime);

    const prayerTimes: PrayerTimesResult = {
      fajr: formatted.fajr,
      sunrise: formatted.sunrise,
      dhuhr: formatted.dhuhr,
      asr: formatted.asr,
      maghrib: formatted.maghrib,
      isha: formatted.isha,
      currentPrayer,
      nextPrayer,
      nextPrayerTime,
      timeUntilNextPrayer,
    };

    return { prayerTimes, mosquePrayerTimes: formatted };
  }

  // Calculated mode: compute from settings
  return {
    prayerTimes: calculatePrayerTimesFromSettings(settings, currentTime),
    mosquePrayerTimes: null,
  };
}

// ============================================================================
// Scheduler Instance (singleton, managed outside React)
// ============================================================================

let schedulerInstance: PrayerScheduler | null = null;

function getScheduler(callbacks: { onAdhan: (prayer: PrayerName) => void; onReminder: (prayer: PrayerName, minutesBefore: number) => void }): PrayerScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new PrayerScheduler(callbacks);
  }
  return schedulerInstance;
}

// ============================================================================
// Store Creation
// ============================================================================

export const usePrayerTimesStore = create<PrayerTimesStore>()(
  subscribeWithSelector((set, get) => {
    // Scheduler callbacks (access store via get())
    const schedulerCallbacks = {
      onAdhan: (prayer: PrayerName) => {
        const state = get();
        if (state.isAdhanPlaying) {
          console.log(`[PrayerScheduler] Adhan already playing, skipping ${prayer}`);
          return;
        }
        console.log(`[PrayerScheduler] Triggering adhan for ${prayer}`);
        set({
          isAdhanPlaying: true,
          adhanPrayer: prayer,
          isFullscreenAdhan: state.settings?.fullscreenAdhanEnabled ?? false,
        });
      },
      onReminder: (prayer: PrayerName, minutesBefore: number) => {
        console.log(`[PrayerScheduler] Triggering reminder for ${prayer}, ${minutesBefore}min before`);
        set({ activeReminder: prayer });
      },
    };

    return {
      // Initial state
      settings: null,
      adhanSettings: [],
      isEnabled: false,
      isLoading: true,

      prayerSource: "calculated",
      mosqueName: null,
      mosqueUuid: null,

      mosquePrayerTimesRaw: null,

      prayerTimes: null,
      mosquePrayerTimes: null,

      currentTime: new Date(),
      timeUntilNextPrayer: "",

      isAdhanPlaying: false,
      adhanPrayer: null,

      isFullscreenAdhan: false,

      activeReminder: null,

      isPanelOpen: false,

      // Actions
      setSettings: (settings) => {
        const currentTime = get().currentTime;
        const mosquePrayerTimesRaw = get().mosquePrayerTimesRaw;
        const { prayerTimes, mosquePrayerTimes } = calculatePrayerTimes(settings, mosquePrayerTimesRaw, currentTime);

        set({
          settings,
          isEnabled: settings?.isEnabled ?? false,
          prayerSource: (settings?.prayerSource as PrayerSource) || "calculated",
          mosqueName: settings?.mosqueName || null,
          mosqueUuid: settings?.mosqueUuid || null,
          prayerTimes,
          mosquePrayerTimes,
          timeUntilNextPrayer: prayerTimes?.timeUntilNextPrayer
            ? formatCountdown(prayerTimes.timeUntilNextPrayer)
            : "",
        });

        // Restart scheduler with new settings
        get().startScheduler();
      },

      setAdhanSettings: (adhanSettings) => {
        set({ adhanSettings });
        // Restart scheduler with new adhan settings
        get().startScheduler();
      },

      setIsLoading: (loading) => set({ isLoading: loading }),

      setMosquePrayerTimesRaw: (data) => {
        const settings = get().settings;
        const currentTime = get().currentTime;
        const { prayerTimes, mosquePrayerTimes } = calculatePrayerTimes(settings, data, currentTime);

        set({
          mosquePrayerTimesRaw: data,
          prayerTimes,
          mosquePrayerTimes,
          timeUntilNextPrayer: prayerTimes?.timeUntilNextPrayer
            ? formatCountdown(prayerTimes.timeUntilNextPrayer)
            : "",
        });

        // Restart scheduler with new prayer times
        get().startScheduler();
      },

      triggerAdhan: (prayer) => {
        const state = get();
        if (state.isAdhanPlaying) {
          console.log(`[Store] Adhan already playing, skipping ${prayer}`);
          return;
        }
        console.log(`[Store] Triggering adhan for ${prayer}`);
        set({
          isAdhanPlaying: true,
          adhanPrayer: prayer,
          isFullscreenAdhan: state.settings?.fullscreenAdhanEnabled ?? false,
        });
      },

      stopAdhan: () => {
        set({
          isAdhanPlaying: false,
          adhanPrayer: null,
          isFullscreenAdhan: false,
        });
      },

      dismissFullscreenAdhan: () => {
        set({ isFullscreenAdhan: false });
      },

      testFullscreenAdhan: (prayer) => {
        set({
          adhanPrayer: prayer,
          isAdhanPlaying: true,
          isFullscreenAdhan: true,
        });
      },

      triggerReminder: (prayer, _minutesBefore) => {
        console.log(`[Store] Triggering reminder for ${prayer}`);
        set({ activeReminder: prayer });
      },

      dismissReminder: () => {
        set({ activeReminder: null });
      },

      setIsPanelOpen: (open) => set({ isPanelOpen: open }),

      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

      updateCurrentTime: () => {
        const currentTime = new Date();
        const settings = get().settings;
        const mosquePrayerTimesRaw = get().mosquePrayerTimesRaw;
        const { prayerTimes, mosquePrayerTimes } = calculatePrayerTimes(settings, mosquePrayerTimesRaw, currentTime);

        set({
          currentTime,
          prayerTimes,
          mosquePrayerTimes,
          timeUntilNextPrayer: prayerTimes?.timeUntilNextPrayer
            ? formatCountdown(prayerTimes.timeUntilNextPrayer)
            : "",
        });
      },

      startScheduler: () => {
        const state = get();
        if (!state.prayerTimes || !state.settings || !state.isEnabled) {
          schedulerInstance?.stop();
          return;
        }

        const scheduler = getScheduler(schedulerCallbacks);
        const configs = buildSchedulerConfigs(state.prayerTimes, state.adhanSettings);
        scheduler.start(configs);
      },

      stopScheduler: () => {
        schedulerInstance?.stop();
      },

      getAdhanSettingsForPrayer: (prayer) => {
        return get().adhanSettings.find((s) => s.prayerName === prayer);
      },
    };
  })
);

// ============================================================================
// Selectors (for optimized subscriptions)
// ============================================================================

// Settings selectors
export const selectSettings = (state: PrayerTimesStore) => state.settings;
export const selectAdhanSettings = (state: PrayerTimesStore) => state.adhanSettings;
export const selectIsEnabled = (state: PrayerTimesStore) => state.isEnabled;
export const selectIsLoading = (state: PrayerTimesStore) => state.isLoading;

// Prayer source selectors
export const selectPrayerSource = (state: PrayerTimesStore) => state.prayerSource;
export const selectMosqueName = (state: PrayerTimesStore) => state.mosqueName;
export const selectMosqueUuid = (state: PrayerTimesStore) => state.mosqueUuid;

// Prayer times selectors
export const selectPrayerTimes = (state: PrayerTimesStore) => state.prayerTimes;
export const selectMosquePrayerTimes = (state: PrayerTimesStore) => state.mosquePrayerTimes;
export const selectCurrentPrayer = (state: PrayerTimesStore) => state.prayerTimes?.currentPrayer ?? null;
export const selectNextPrayer = (state: PrayerTimesStore) => state.prayerTimes?.nextPrayer ?? null;
export const selectNextPrayerTime = (state: PrayerTimesStore) => state.prayerTimes?.nextPrayerTime ?? null;
export const selectTimeUntilNextPrayer = (state: PrayerTimesStore) => state.timeUntilNextPrayer;

// Adhan selectors
export const selectIsAdhanPlaying = (state: PrayerTimesStore) => state.isAdhanPlaying;
export const selectAdhanPrayer = (state: PrayerTimesStore) => state.adhanPrayer;
export const selectIsFullscreenAdhan = (state: PrayerTimesStore) => state.isFullscreenAdhan;

// Reminder selectors
export const selectActiveReminder = (state: PrayerTimesStore) => state.activeReminder;

// Panel selectors
export const selectIsPanelOpen = (state: PrayerTimesStore) => state.isPanelOpen;

// Action selectors (these are stable, but provided for convenience)
export const selectTriggerAdhan = (state: PrayerTimesStore) => state.triggerAdhan;
export const selectStopAdhan = (state: PrayerTimesStore) => state.stopAdhan;
export const selectTogglePanel = (state: PrayerTimesStore) => state.togglePanel;
export const selectDismissFullscreenAdhan = (state: PrayerTimesStore) => state.dismissFullscreenAdhan;
export const selectDismissReminder = (state: PrayerTimesStore) => state.dismissReminder;
export const selectTestFullscreenAdhan = (state: PrayerTimesStore) => state.testFullscreenAdhan;

// ============================================================================
// Timer Management (for countdown updates)
// ============================================================================

let countdownInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the countdown timer (call once when app mounts)
 */
export function startCountdownTimer(): void {
  if (countdownInterval) return;

  countdownInterval = setInterval(() => {
    usePrayerTimesStore.getState().updateCurrentTime();
  }, 1000);
}

/**
 * Stop the countdown timer (call when app unmounts)
 */
export function stopCountdownTimer(): void {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

/**
 * Clean up all resources (scheduler and timer)
 */
export function cleanupPrayerTimesStore(): void {
  stopCountdownTimer();
  usePrayerTimesStore.getState().stopScheduler();
}
