import { describe, test, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { PrayerScheduler, type PrayerConfig, type PrayerName } from "./prayerScheduler";

// Helper to create prayer times for today
function createPrayerTime(hours: number, minutes: number): Date {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Helper to create a future prayer time (X minutes from now)
function createFuturePrayerTime(minutesFromNow: number): Date {
  return new Date(Date.now() + minutesFromNow * 60 * 1000);
}

// Helper to create a past prayer time (X minutes ago)
function createPastPrayerTime(minutesAgo: number): Date {
  return new Date(Date.now() - minutesAgo * 60 * 1000);
}

// Helper to create default prayer configs
function createDefaultConfigs(overrides: Partial<Record<PrayerName, Partial<PrayerConfig>>> = {}): PrayerConfig[] {
  const prayers: PrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  const defaultTimes: Record<PrayerName, Date> = {
    fajr: createPrayerTime(5, 30),
    sunrise: createPrayerTime(7, 0),
    dhuhr: createPrayerTime(12, 30),
    asr: createPrayerTime(15, 45),
    maghrib: createPrayerTime(18, 30),
    isha: createPrayerTime(20, 0),
  };

  return prayers.map((prayer) => ({
    prayer,
    time: overrides[prayer]?.time || defaultTimes[prayer],
    adhanEnabled: overrides[prayer]?.adhanEnabled ?? true,
    reminderEnabled: overrides[prayer]?.reminderEnabled ?? false,
    reminderMinutesBefore: overrides[prayer]?.reminderMinutesBefore ?? 15,
  }));
}

describe("PrayerScheduler", () => {
  let scheduler: PrayerScheduler;
  let onAdhanMock: ReturnType<typeof mock>;
  let onReminderMock: ReturnType<typeof mock>;

  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }

    // Reset mocks
    onAdhanMock = mock(() => {});
    onReminderMock = mock(() => {});

    // Create fresh scheduler
    scheduler = new PrayerScheduler({
      onAdhan: onAdhanMock,
      onReminder: onReminderMock,
    });
  });

  afterEach(() => {
    // Always stop scheduler after tests
    scheduler.stop();
    // Clear triggered state for next test
    scheduler.clearTriggered();
  });

  describe("Initialization", () => {
    test("should create scheduler without errors", () => {
      expect(scheduler).toBeDefined();
    });

    test("should not trigger any callbacks on creation", () => {
      expect(onAdhanMock).not.toHaveBeenCalled();
      expect(onReminderMock).not.toHaveBeenCalled();
    });
  });

  describe("Starting and Stopping", () => {
    test("should start without errors", () => {
      const configs = createDefaultConfigs();
      expect(() => scheduler.start(configs)).not.toThrow();
    });

    test("should stop without errors", () => {
      const configs = createDefaultConfigs();
      scheduler.start(configs);
      expect(() => scheduler.stop()).not.toThrow();
    });

    test("should be safe to stop multiple times", () => {
      const configs = createDefaultConfigs();
      scheduler.start(configs);
      scheduler.stop();
      expect(() => scheduler.stop()).not.toThrow();
    });

    test("should be safe to start multiple times (restarts)", () => {
      const configs = createDefaultConfigs();
      scheduler.start(configs);
      expect(() => scheduler.start(configs)).not.toThrow();
    });
  });

  describe("Adhan Triggering", () => {
    test("should trigger adhan when prayer time is now (within window)", async () => {
      // Prayer time was 30 seconds ago (within 1 minute window)
      const configs = createDefaultConfigs({
        fajr: {
          time: createPastPrayerTime(0.5), // 30 seconds ago
          adhanEnabled: true,
        },
      });

      scheduler.start(configs);

      // Wait a bit for the check to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onAdhanMock).toHaveBeenCalledWith("fajr");
      expect(onAdhanMock).toHaveBeenCalledTimes(1);
    });

    test("should NOT trigger adhan when prayer time is too far in past", async () => {
      // Prayer time was 2 minutes ago (outside 1 minute window)
      const configs = createDefaultConfigs({
        fajr: {
          time: createPastPrayerTime(2),
          adhanEnabled: true,
        },
      });

      scheduler.start(configs);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onAdhanMock).not.toHaveBeenCalled();
    });

    test("should NOT trigger adhan when adhanEnabled is false", async () => {
      const configs = createDefaultConfigs({
        fajr: {
          time: createPastPrayerTime(0.5),
          adhanEnabled: false,
        },
      });

      scheduler.start(configs);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onAdhanMock).not.toHaveBeenCalled();
    });

    test("should NOT trigger same adhan twice within same scheduler instance", async () => {
      const configs = createDefaultConfigs({
        fajr: {
          time: createPastPrayerTime(0.5),
          adhanEnabled: true,
        },
      });

      scheduler.start(configs);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const callCount = onAdhanMock.mock.calls.length;

      // Call start again (simulating update)
      scheduler.start(configs);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not have been called again
      expect(onAdhanMock).toHaveBeenCalledTimes(callCount);
    });

    test("should trigger multiple different adhans", async () => {
      const configs = createDefaultConfigs({
        fajr: {
          time: createPastPrayerTime(0.5),
          adhanEnabled: true,
        },
        dhuhr: {
          time: createPastPrayerTime(0.3),
          adhanEnabled: true,
        },
      });

      scheduler.start(configs);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onAdhanMock).toHaveBeenCalledWith("fajr");
      expect(onAdhanMock).toHaveBeenCalledWith("dhuhr");
      expect(onAdhanMock).toHaveBeenCalledTimes(2);
    });

    test("should skip sunrise (no adhan for sunrise)", async () => {
      const configs: PrayerConfig[] = [
        {
          prayer: "sunrise",
          time: createPastPrayerTime(0.5),
          adhanEnabled: true,
          reminderEnabled: false,
          reminderMinutesBefore: 15,
        },
      ];

      scheduler.start(configs);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onAdhanMock).not.toHaveBeenCalled();
    });
  });

  describe("State Management", () => {
    test("hasAdhanTriggered should return correct state", async () => {
      const configs = createDefaultConfigs({
        fajr: {
          time: createPastPrayerTime(0.5),
          adhanEnabled: true,
        },
      });

      expect(scheduler.hasAdhanTriggered("fajr")).toBe(false);

      scheduler.start(configs);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(scheduler.hasAdhanTriggered("fajr")).toBe(true);
      expect(scheduler.hasAdhanTriggered("dhuhr")).toBe(false);
    });

    test("markAdhanTriggered should mark adhan as triggered", () => {
      expect(scheduler.hasAdhanTriggered("fajr")).toBe(false);

      scheduler.markAdhanTriggered("fajr");

      expect(scheduler.hasAdhanTriggered("fajr")).toBe(true);
    });

    test("clearTriggered should clear all triggered items", async () => {
      const configs = createDefaultConfigs({
        fajr: {
          time: createPastPrayerTime(0.5),
          adhanEnabled: true,
        },
      });

      scheduler.start(configs);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(scheduler.hasAdhanTriggered("fajr")).toBe(true);

      scheduler.clearTriggered();

      expect(scheduler.hasAdhanTriggered("fajr")).toBe(false);
    });

    test("markAdhanTriggered prevents callback from being called", async () => {
      // Pre-mark as triggered
      scheduler.markAdhanTriggered("fajr");

      const configs = createDefaultConfigs({
        fajr: {
          time: createPastPrayerTime(0.5),
          adhanEnabled: true,
        },
      });

      scheduler.start(configs);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not have been called because it was pre-marked
      expect(onAdhanMock).not.toHaveBeenCalled();
    });
  });

  describe("Precise Scheduling", () => {
    test("should schedule future prayers with setTimeout", async () => {
      const setTimeoutSpy = spyOn(global, "setTimeout");

      const configs = createDefaultConfigs({
        maghrib: {
          time: createFuturePrayerTime(5), // 5 minutes from now
          adhanEnabled: true,
        },
      });

      scheduler.start(configs);

      // Should have called setTimeout for the future prayer
      expect(setTimeoutSpy).toHaveBeenCalled();

      scheduler.stop();
    });

    test("should clear timeouts when stopped", async () => {
      const clearTimeoutSpy = spyOn(global, "clearTimeout");

      const configs = createDefaultConfigs({
        maghrib: {
          time: createFuturePrayerTime(5),
          adhanEnabled: true,
        },
      });

      scheduler.start(configs);
      scheduler.stop();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe("Update Functionality", () => {
    test("should update configs without losing triggered state", async () => {
      const configs1 = createDefaultConfigs({
        fajr: {
          time: createPastPrayerTime(0.5),
          adhanEnabled: true,
        },
      });

      scheduler.start(configs1);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(scheduler.hasAdhanTriggered("fajr")).toBe(true);

      // Update with new configs
      const configs2 = createDefaultConfigs({
        dhuhr: {
          time: createPastPrayerTime(0.3),
          adhanEnabled: true,
        },
      });

      scheduler.update(configs2);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Fajr should still be triggered
      expect(scheduler.hasAdhanTriggered("fajr")).toBe(true);
      // Dhuhr should now also be triggered
      expect(scheduler.hasAdhanTriggered("dhuhr")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty configs", () => {
      expect(() => scheduler.start([])).not.toThrow();
    });

    test("should handle configs with all prayers disabled", async () => {
      const configs = createDefaultConfigs();
      configs.forEach((c) => {
        c.adhanEnabled = false;
        c.reminderEnabled = false;
      });

      scheduler.start(configs);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onAdhanMock).not.toHaveBeenCalled();
      expect(onReminderMock).not.toHaveBeenCalled();
    });

    test("should handle very far future prayers (>24 hours)", () => {
      const configs = createDefaultConfigs({
        fajr: {
          time: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
          adhanEnabled: true,
        },
      });

      // Should not throw
      expect(() => scheduler.start(configs)).not.toThrow();
    });

    test("should handle negative reminder times gracefully", () => {
      const configs = createDefaultConfigs({
        dhuhr: {
          time: createFuturePrayerTime(10),
          reminderEnabled: true,
          reminderMinutesBefore: -5, // Invalid but should not crash
        },
      });

      expect(() => scheduler.start(configs)).not.toThrow();
    });
  });

  describe("Race Condition Prevention", () => {
    test("should not trigger adhan twice even with rapid starts", async () => {
      const configs = createDefaultConfigs({
        fajr: {
          time: createPastPrayerTime(0.5),
          adhanEnabled: true,
        },
      });

      // Start multiple times rapidly
      scheduler.start(configs);
      scheduler.start(configs);
      scheduler.start(configs);

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should only trigger once
      expect(onAdhanMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("Callback Behavior", () => {
    test("onAdhan receives correct prayer name", async () => {
      const configs = createDefaultConfigs({
        asr: {
          time: createPastPrayerTime(0.5),
          adhanEnabled: true,
        },
      });

      scheduler.start(configs);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onAdhanMock).toHaveBeenCalledWith("asr");
    });

    test("callbacks are not called after stop", async () => {
      const configs = createDefaultConfigs({
        fajr: {
          time: createFuturePrayerTime(0.1), // 6 seconds from now
          adhanEnabled: true,
        },
      });

      scheduler.start(configs);
      scheduler.stop();

      // Wait for the prayer time to pass
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should not have been called because we stopped
      expect(onAdhanMock).not.toHaveBeenCalled();
    });
  });
});

describe("PrayerScheduler Integration", () => {
  test("full day simulation with multiple prayers", async () => {
    const onAdhanMock = mock(() => {});
    const onReminderMock = mock(() => {});

    const scheduler = new PrayerScheduler({
      onAdhan: onAdhanMock,
      onReminder: onReminderMock,
    });

    // All prayers already passed today (within trigger window)
    const configs: PrayerConfig[] = [
      {
        prayer: "fajr",
        time: createPastPrayerTime(0.5),
        adhanEnabled: true,
        reminderEnabled: false,
        reminderMinutesBefore: 15,
      },
      {
        prayer: "dhuhr",
        time: createPastPrayerTime(0.3),
        adhanEnabled: true,
        reminderEnabled: false,
        reminderMinutesBefore: 15,
      },
      {
        prayer: "asr",
        time: createPastPrayerTime(0.2),
        adhanEnabled: true,
        reminderEnabled: false,
        reminderMinutesBefore: 15,
      },
    ];

    scheduler.start(configs);
    await new Promise((resolve) => setTimeout(resolve, 200));

    // All three should trigger
    expect(onAdhanMock).toHaveBeenCalledWith("fajr");
    expect(onAdhanMock).toHaveBeenCalledWith("dhuhr");
    expect(onAdhanMock).toHaveBeenCalledWith("asr");
    expect(onAdhanMock).toHaveBeenCalledTimes(3);

    scheduler.stop();
    scheduler.clearTriggered();
  });

  test("mixed enabled/disabled prayers", async () => {
    const onAdhanMock = mock(() => {});
    const onReminderMock = mock(() => {});

    const scheduler = new PrayerScheduler({
      onAdhan: onAdhanMock,
      onReminder: onReminderMock,
    });

    const configs: PrayerConfig[] = [
      {
        prayer: "fajr",
        time: createPastPrayerTime(0.5),
        adhanEnabled: true,
        reminderEnabled: false,
        reminderMinutesBefore: 15,
      },
      {
        prayer: "dhuhr",
        time: createPastPrayerTime(0.3),
        adhanEnabled: false, // Disabled
        reminderEnabled: false,
        reminderMinutesBefore: 15,
      },
      {
        prayer: "asr",
        time: createPastPrayerTime(0.2),
        adhanEnabled: true,
        reminderEnabled: false,
        reminderMinutesBefore: 15,
      },
    ];

    scheduler.start(configs);
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Only fajr and asr should trigger (dhuhr is disabled)
    expect(onAdhanMock).toHaveBeenCalledWith("fajr");
    expect(onAdhanMock).not.toHaveBeenCalledWith("dhuhr");
    expect(onAdhanMock).toHaveBeenCalledWith("asr");
    expect(onAdhanMock).toHaveBeenCalledTimes(2);

    scheduler.stop();
    scheduler.clearTriggered();
  });
});
