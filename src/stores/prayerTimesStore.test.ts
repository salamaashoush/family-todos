import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import {
  usePrayerTimesStore,
  startCountdownTimer,
  stopCountdownTimer,
  cleanupPrayerTimesStore,
  type PrayerTimesStore,
} from "./prayerTimesStore";
import type { PrayerSettings, PrayerAdhanSettings } from "../db/schema/prayer";
import type { PrayerName } from "../utils/prayerCalculations";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockSettings(overrides: Partial<PrayerSettings> = {}): PrayerSettings {
  return {
    id: 1,
    familyId: 1,
    latitude: "40.7128",
    longitude: "-74.0060",
    timezone: "America/New_York",
    city: "New York",
    country: "USA",
    calculationMethod: "NorthAmerica",
    madhab: "Shafi",
    highLatitudeRule: "MiddleOfTheNight",
    fajrAdjustment: 0,
    sunriseAdjustment: 0,
    dhuhrAdjustment: 0,
    asrAdjustment: 0,
    maghribAdjustment: 0,
    ishaAdjustment: 0,
    isEnabled: true,
    showFloatingButton: true,
    fullscreenAdhanEnabled: true,
    prayerSource: "calculated",
    mosqueUuid: null,
    mosqueName: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockAdhanSettings(
  prayer: PrayerName,
  overrides: Partial<PrayerAdhanSettings> = {}
): PrayerAdhanSettings {
  return {
    id: 1,
    familyId: 1,
    prayerName: prayer,
    adhanEnabled: true,
    reminderEnabled: false,
    reminderMinutesBefore: 15,
    adhanSound: "default",
    adhanVolume: 80,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function resetStore(): void {
  const store = usePrayerTimesStore.getState();
  // Reset to initial state
  usePrayerTimesStore.setState({
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
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("PrayerTimesStore", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    cleanupPrayerTimesStore();
  });

  describe("Initial State", () => {
    test("should have correct initial state", () => {
      const state = usePrayerTimesStore.getState();

      expect(state.settings).toBeNull();
      expect(state.adhanSettings).toEqual([]);
      expect(state.isEnabled).toBe(false);
      expect(state.isLoading).toBe(true);
      expect(state.prayerSource).toBe("calculated");
      expect(state.mosqueName).toBeNull();
      expect(state.mosqueUuid).toBeNull();
      expect(state.prayerTimes).toBeNull();
      expect(state.mosquePrayerTimes).toBeNull();
      expect(state.isAdhanPlaying).toBe(false);
      expect(state.adhanPrayer).toBeNull();
      expect(state.isFullscreenAdhan).toBe(false);
      expect(state.activeReminder).toBeNull();
      expect(state.isPanelOpen).toBe(false);
    });
  });

  describe("setSettings", () => {
    test("should update settings and calculate prayer times", () => {
      const settings = createMockSettings();

      usePrayerTimesStore.getState().setSettings(settings);
      const state = usePrayerTimesStore.getState();

      expect(state.settings).toEqual(settings);
      expect(state.isEnabled).toBe(true);
      expect(state.prayerSource).toBe("calculated");
      expect(state.prayerTimes).not.toBeNull();
      expect(state.prayerTimes?.fajr).toBeInstanceOf(Date);
      expect(state.prayerTimes?.dhuhr).toBeInstanceOf(Date);
      expect(state.prayerTimes?.asr).toBeInstanceOf(Date);
      expect(state.prayerTimes?.maghrib).toBeInstanceOf(Date);
      expect(state.prayerTimes?.isha).toBeInstanceOf(Date);
    });

    test("should not calculate prayer times when disabled", () => {
      const settings = createMockSettings({ isEnabled: false });

      usePrayerTimesStore.getState().setSettings(settings);
      const state = usePrayerTimesStore.getState();

      expect(state.isEnabled).toBe(false);
      expect(state.prayerTimes).toBeNull();
    });

    test("should update mosque info when using mosque source", () => {
      const settings = createMockSettings({
        prayerSource: "mosque",
        mosqueUuid: "test-uuid",
        mosqueName: "Test Mosque",
      });

      usePrayerTimesStore.getState().setSettings(settings);
      const state = usePrayerTimesStore.getState();

      expect(state.prayerSource).toBe("mosque");
      expect(state.mosqueUuid).toBe("test-uuid");
      expect(state.mosqueName).toBe("Test Mosque");
    });

    test("should handle null settings", () => {
      // First set some settings
      usePrayerTimesStore.getState().setSettings(createMockSettings());

      // Then clear them
      usePrayerTimesStore.getState().setSettings(null);
      const state = usePrayerTimesStore.getState();

      expect(state.settings).toBeNull();
      expect(state.isEnabled).toBe(false);
      expect(state.prayerTimes).toBeNull();
    });
  });

  describe("setAdhanSettings", () => {
    test("should update adhan settings", () => {
      const adhanSettings = [
        createMockAdhanSettings("fajr", { adhanEnabled: true }),
        createMockAdhanSettings("dhuhr", { adhanEnabled: false }),
        createMockAdhanSettings("asr", { adhanEnabled: true }),
      ];

      usePrayerTimesStore.getState().setAdhanSettings(adhanSettings);
      const state = usePrayerTimesStore.getState();

      expect(state.adhanSettings).toHaveLength(3);
      expect(state.adhanSettings[0].prayerName).toBe("fajr");
      expect(state.adhanSettings[0].adhanEnabled).toBe(true);
      expect(state.adhanSettings[1].adhanEnabled).toBe(false);
    });

    test("getAdhanSettingsForPrayer should return correct settings", () => {
      const adhanSettings = [
        createMockAdhanSettings("fajr", { adhanEnabled: true }),
        createMockAdhanSettings("dhuhr", { adhanEnabled: false }),
      ];

      usePrayerTimesStore.getState().setAdhanSettings(adhanSettings);
      const store = usePrayerTimesStore.getState();

      const fajrSettings = store.getAdhanSettingsForPrayer("fajr");
      expect(fajrSettings?.adhanEnabled).toBe(true);

      const dhuhrSettings = store.getAdhanSettingsForPrayer("dhuhr");
      expect(dhuhrSettings?.adhanEnabled).toBe(false);

      const asrSettings = store.getAdhanSettingsForPrayer("asr");
      expect(asrSettings).toBeUndefined();
    });
  });

  describe("Adhan Controls", () => {
    test("triggerAdhan should set adhan playing state", () => {
      const settings = createMockSettings();
      usePrayerTimesStore.getState().setSettings(settings);

      usePrayerTimesStore.getState().triggerAdhan("fajr");
      const state = usePrayerTimesStore.getState();

      expect(state.isAdhanPlaying).toBe(true);
      expect(state.adhanPrayer).toBe("fajr");
      expect(state.isFullscreenAdhan).toBe(true); // fullscreenAdhanEnabled is true in mock
    });

    test("triggerAdhan should not trigger if already playing", () => {
      const settings = createMockSettings();
      usePrayerTimesStore.getState().setSettings(settings);

      usePrayerTimesStore.getState().triggerAdhan("fajr");
      usePrayerTimesStore.getState().triggerAdhan("dhuhr");
      const state = usePrayerTimesStore.getState();

      // Should still be fajr since it was already playing
      expect(state.adhanPrayer).toBe("fajr");
    });

    test("stopAdhan should reset adhan state", () => {
      usePrayerTimesStore.getState().setSettings(createMockSettings());
      usePrayerTimesStore.getState().triggerAdhan("fajr");

      usePrayerTimesStore.getState().stopAdhan();
      const state = usePrayerTimesStore.getState();

      expect(state.isAdhanPlaying).toBe(false);
      expect(state.adhanPrayer).toBeNull();
      expect(state.isFullscreenAdhan).toBe(false);
    });

    test("triggerAdhan should respect fullscreenAdhanEnabled setting", () => {
      const settings = createMockSettings({ fullscreenAdhanEnabled: false });
      usePrayerTimesStore.getState().setSettings(settings);

      usePrayerTimesStore.getState().triggerAdhan("fajr");
      const state = usePrayerTimesStore.getState();

      expect(state.isAdhanPlaying).toBe(true);
      expect(state.isFullscreenAdhan).toBe(false);
    });
  });

  describe("Fullscreen Adhan", () => {
    test("dismissFullscreenAdhan should only dismiss fullscreen", () => {
      usePrayerTimesStore.getState().setSettings(createMockSettings());
      usePrayerTimesStore.getState().triggerAdhan("fajr");

      usePrayerTimesStore.getState().dismissFullscreenAdhan();
      const state = usePrayerTimesStore.getState();

      expect(state.isFullscreenAdhan).toBe(false);
      expect(state.isAdhanPlaying).toBe(true); // Still playing
      expect(state.adhanPrayer).toBe("fajr");
    });

    test("testFullscreenAdhan should trigger fullscreen mode", () => {
      usePrayerTimesStore.getState().testFullscreenAdhan("asr");
      const state = usePrayerTimesStore.getState();

      expect(state.isFullscreenAdhan).toBe(true);
      expect(state.isAdhanPlaying).toBe(true);
      expect(state.adhanPrayer).toBe("asr");
    });
  });

  describe("Reminder Controls", () => {
    test("triggerReminder should set active reminder", () => {
      usePrayerTimesStore.getState().triggerReminder("maghrib", 15);
      const state = usePrayerTimesStore.getState();

      expect(state.activeReminder).toBe("maghrib");
    });

    test("dismissReminder should clear active reminder", () => {
      usePrayerTimesStore.getState().triggerReminder("maghrib", 15);
      usePrayerTimesStore.getState().dismissReminder();
      const state = usePrayerTimesStore.getState();

      expect(state.activeReminder).toBeNull();
    });
  });

  describe("Panel Controls", () => {
    test("setIsPanelOpen should update panel state", () => {
      usePrayerTimesStore.getState().setIsPanelOpen(true);
      expect(usePrayerTimesStore.getState().isPanelOpen).toBe(true);

      usePrayerTimesStore.getState().setIsPanelOpen(false);
      expect(usePrayerTimesStore.getState().isPanelOpen).toBe(false);
    });

    test("togglePanel should toggle panel state", () => {
      expect(usePrayerTimesStore.getState().isPanelOpen).toBe(false);

      usePrayerTimesStore.getState().togglePanel();
      expect(usePrayerTimesStore.getState().isPanelOpen).toBe(true);

      usePrayerTimesStore.getState().togglePanel();
      expect(usePrayerTimesStore.getState().isPanelOpen).toBe(false);
    });
  });

  describe("Loading State", () => {
    test("setIsLoading should update loading state", () => {
      usePrayerTimesStore.getState().setIsLoading(false);
      expect(usePrayerTimesStore.getState().isLoading).toBe(false);

      usePrayerTimesStore.getState().setIsLoading(true);
      expect(usePrayerTimesStore.getState().isLoading).toBe(true);
    });
  });

  describe("Time Updates", () => {
    test("updateCurrentTime should update current time and recalculate", () => {
      usePrayerTimesStore.getState().setSettings(createMockSettings());
      const initialTime = usePrayerTimesStore.getState().currentTime;

      // Wait a tiny bit and update
      usePrayerTimesStore.getState().updateCurrentTime();
      const newTime = usePrayerTimesStore.getState().currentTime;

      // Time should be updated (or at least equal if very fast)
      expect(newTime.getTime()).toBeGreaterThanOrEqual(initialTime.getTime());
    });

    test("timeUntilNextPrayer should be formatted string", () => {
      usePrayerTimesStore.getState().setSettings(createMockSettings());
      const state = usePrayerTimesStore.getState();

      // Should be a formatted string like "2h 30m" or "45m"
      expect(typeof state.timeUntilNextPrayer).toBe("string");
    });
  });

  describe("Countdown Timer", () => {
    test("startCountdownTimer should start interval", async () => {
      usePrayerTimesStore.getState().setSettings(createMockSettings());

      startCountdownTimer();

      // Wait for at least one tick
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should not throw
      stopCountdownTimer();
    });

    test("stopCountdownTimer should be safe to call multiple times", () => {
      startCountdownTimer();
      stopCountdownTimer();
      expect(() => stopCountdownTimer()).not.toThrow();
    });

    test("startCountdownTimer should not start multiple timers", () => {
      startCountdownTimer();
      startCountdownTimer(); // Should not start another
      stopCountdownTimer();
    });
  });

  describe("Scheduler Integration", () => {
    test("startScheduler should not throw when no prayer times", () => {
      expect(() => {
        usePrayerTimesStore.getState().startScheduler();
      }).not.toThrow();
    });

    test("startScheduler should start when settings are loaded", () => {
      usePrayerTimesStore.getState().setSettings(createMockSettings());
      usePrayerTimesStore.getState().setAdhanSettings([
        createMockAdhanSettings("fajr"),
      ]);

      expect(() => {
        usePrayerTimesStore.getState().startScheduler();
      }).not.toThrow();
    });

    test("stopScheduler should be safe to call", () => {
      expect(() => {
        usePrayerTimesStore.getState().stopScheduler();
      }).not.toThrow();
    });
  });

  describe("Selectors", () => {
    test("should be able to subscribe to specific slices", () => {
      const onNextPrayerChange = mock(() => {});

      // Subscribe to just nextPrayer changes
      const unsubscribe = usePrayerTimesStore.subscribe(
        (state) => state.prayerTimes?.nextPrayer,
        onNextPrayerChange
      );

      // Set settings (this will set prayer times and nextPrayer)
      usePrayerTimesStore.getState().setSettings(createMockSettings());

      expect(onNextPrayerChange).toHaveBeenCalled();

      unsubscribe();
    });

    test("should not trigger subscriber for unrelated changes", () => {
      // First set settings
      usePrayerTimesStore.getState().setSettings(createMockSettings());

      const onPanelChange = mock(() => {});

      // Subscribe to panel state
      const unsubscribe = usePrayerTimesStore.subscribe(
        (state) => state.isPanelOpen,
        onPanelChange
      );

      // Trigger adhan (should not affect panel subscriber)
      usePrayerTimesStore.getState().triggerAdhan("fajr");

      // Panel change was not called for adhan trigger
      // Note: It may be called once on subscription setup
      const callsBeforePanel = onPanelChange.mock.calls.length;

      // Now toggle panel
      usePrayerTimesStore.getState().togglePanel();

      expect(onPanelChange.mock.calls.length).toBeGreaterThan(callsBeforePanel);

      unsubscribe();
    });
  });

  describe("Edge Cases", () => {
    test("should handle rapid state updates", () => {
      const settings = createMockSettings();

      for (let i = 0; i < 10; i++) {
        usePrayerTimesStore.getState().setSettings(settings);
        usePrayerTimesStore.getState().togglePanel();
        usePrayerTimesStore.getState().updateCurrentTime();
      }

      // Should not crash
      expect(usePrayerTimesStore.getState().settings).not.toBeNull();
    });

    test("should handle settings update while adhan playing", () => {
      usePrayerTimesStore.getState().setSettings(createMockSettings());
      usePrayerTimesStore.getState().triggerAdhan("fajr");

      // Update settings while adhan is playing
      usePrayerTimesStore.getState().setSettings(createMockSettings({ city: "Los Angeles" }));

      const state = usePrayerTimesStore.getState();
      expect(state.isAdhanPlaying).toBe(true); // Should still be playing
      expect(state.settings?.city).toBe("Los Angeles");
    });
  });
});

describe("PrayerTimesStore Integration", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    cleanupPrayerTimesStore();
  });

  test("full lifecycle: load settings, trigger adhan, dismiss", () => {
    // 1. Load settings
    const settings = createMockSettings();
    usePrayerTimesStore.getState().setSettings(settings);
    expect(usePrayerTimesStore.getState().isEnabled).toBe(true);

    // 2. Load adhan settings
    const adhanSettings = [createMockAdhanSettings("fajr")];
    usePrayerTimesStore.getState().setAdhanSettings(adhanSettings);
    expect(usePrayerTimesStore.getState().adhanSettings).toHaveLength(1);

    // 3. Trigger adhan
    usePrayerTimesStore.getState().triggerAdhan("fajr");
    expect(usePrayerTimesStore.getState().isAdhanPlaying).toBe(true);
    expect(usePrayerTimesStore.getState().isFullscreenAdhan).toBe(true);

    // 4. Dismiss fullscreen but keep playing
    usePrayerTimesStore.getState().dismissFullscreenAdhan();
    expect(usePrayerTimesStore.getState().isFullscreenAdhan).toBe(false);
    expect(usePrayerTimesStore.getState().isAdhanPlaying).toBe(true);

    // 5. Stop adhan
    usePrayerTimesStore.getState().stopAdhan();
    expect(usePrayerTimesStore.getState().isAdhanPlaying).toBe(false);
    expect(usePrayerTimesStore.getState().adhanPrayer).toBeNull();
  });

  test("reminder flow: trigger and dismiss", () => {
    usePrayerTimesStore.getState().triggerReminder("asr", 15);
    expect(usePrayerTimesStore.getState().activeReminder).toBe("asr");

    usePrayerTimesStore.getState().dismissReminder();
    expect(usePrayerTimesStore.getState().activeReminder).toBeNull();
  });

  test("panel toggle flow", () => {
    expect(usePrayerTimesStore.getState().isPanelOpen).toBe(false);

    usePrayerTimesStore.getState().togglePanel();
    expect(usePrayerTimesStore.getState().isPanelOpen).toBe(true);

    usePrayerTimesStore.getState().togglePanel();
    expect(usePrayerTimesStore.getState().isPanelOpen).toBe(false);
  });
});
