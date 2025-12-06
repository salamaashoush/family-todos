// Prayer Scheduler - A robust, tested scheduler for prayer time notifications
// Handles adhan and reminder scheduling with deduplication and precise timing

export type PrayerName = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface PrayerEvent {
  prayer: PrayerName;
  type: "adhan" | "reminder";
  time: Date;
}

export interface SchedulerCallbacks {
  onAdhan: (prayer: PrayerName) => void;
  onReminder: (prayer: PrayerName, minutesBefore: number) => void;
}

export interface PrayerConfig {
  prayer: PrayerName;
  time: Date;
  adhanEnabled: boolean;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
}

// Storage keys for persistence across page refreshes
const STORAGE_KEY_ADHANS = "prayer_scheduler_adhans";
const STORAGE_KEY_REMINDERS = "prayer_scheduler_reminders";

/**
 * PrayerScheduler - Manages scheduling of prayer adhans and reminders
 *
 * Features:
 * - Precise setTimeout-based scheduling (no polling during idle)
 * - Fallback interval check for reliability
 * - Deduplication via localStorage (survives page refresh)
 * - Automatic daily reset at midnight
 * - Visibility change handling (catches missed prayers when tab returns to focus)
 */
export class PrayerScheduler {
  private callbacks: SchedulerCallbacks;
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private triggeredAdhans: Set<string>;
  private triggeredReminders: Set<string>;
  private currentDateKey: string;
  private isRunning: boolean = false;
  private lastConfigs: PrayerConfig[] = [];

  // Configuration
  private static readonly CHECK_INTERVAL_MS = 30000; // 30 seconds fallback check
  private static readonly TRIGGER_WINDOW_MS = 60000; // 1 minute window to trigger

  constructor(callbacks: SchedulerCallbacks) {
    this.callbacks = callbacks;
    this.triggeredAdhans = this.loadFromStorage(STORAGE_KEY_ADHANS);
    this.triggeredReminders = this.loadFromStorage(STORAGE_KEY_REMINDERS);
    this.currentDateKey = this.getDateKey(new Date());
  }

  /**
   * Start the scheduler with the given prayer configurations
   */
  start(configs: PrayerConfig[]): void {
    this.stop();
    this.lastConfigs = configs;
    this.isRunning = true;

    // Check if day changed and reset if needed
    const today = this.getDateKey(new Date());
    if (today !== this.currentDateKey) {
      this.resetForNewDay(today);
    }

    // Schedule all prayers
    this.scheduleAll(configs);

    // Start fallback interval check
    this.checkInterval = setInterval(() => {
      this.checkNow(this.lastConfigs);
    }, PrayerScheduler.CHECK_INTERVAL_MS);

    // Handle visibility changes
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  /**
   * Stop the scheduler and clear all pending timeouts
   */
  stop(): void {
    this.isRunning = false;

    // Clear all timeouts
    for (const timeout of this.timeouts.values()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();

    // Clear interval
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Remove visibility listener
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  /**
   * Update prayer configurations (e.g., when settings change)
   */
  update(configs: PrayerConfig[]): void {
    if (this.isRunning) {
      this.start(configs);
    } else {
      this.lastConfigs = configs;
    }
  }

  /**
   * Check if a specific adhan has been triggered today
   */
  hasAdhanTriggered(prayer: PrayerName): boolean {
    const key = this.makeKey(prayer, "adhan");
    return this.triggeredAdhans.has(key);
  }

  /**
   * Check if a specific reminder has been triggered today
   */
  hasReminderTriggered(prayer: PrayerName): boolean {
    const key = this.makeKey(prayer, "reminder");
    return this.triggeredReminders.has(key);
  }

  /**
   * Manually mark an adhan as triggered (useful for testing)
   */
  markAdhanTriggered(prayer: PrayerName): void {
    const key = this.makeKey(prayer, "adhan");
    this.triggeredAdhans.add(key);
    this.saveToStorage(STORAGE_KEY_ADHANS, this.triggeredAdhans);
  }

  /**
   * Clear all triggered events (for testing or manual reset)
   */
  clearTriggered(): void {
    this.triggeredAdhans.clear();
    this.triggeredReminders.clear();
    this.saveToStorage(STORAGE_KEY_ADHANS, this.triggeredAdhans);
    this.saveToStorage(STORAGE_KEY_REMINDERS, this.triggeredReminders);
  }

  // Private methods

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === "visible" && this.isRunning) {
      // Check immediately when page becomes visible
      this.checkNow(this.lastConfigs);
      // Re-schedule to ensure timeouts are accurate
      this.scheduleAll(this.lastConfigs);
    }
  };

  private scheduleAll(configs: PrayerConfig[]): void {
    const now = new Date();

    for (const config of configs) {
      // Skip sunrise (no adhan for sunrise)
      if (config.prayer === "sunrise") continue;

      // Schedule adhan
      if (config.adhanEnabled && !this.hasAdhanTriggered(config.prayer)) {
        this.scheduleEvent(config.prayer, "adhan", config.time, now);
      }

      // Schedule reminder
      if (config.reminderEnabled && !this.hasReminderTriggered(config.prayer)) {
        const reminderTime = new Date(config.time.getTime() - config.reminderMinutesBefore * 60 * 1000);
        this.scheduleEvent(config.prayer, "reminder", reminderTime, now, config.reminderMinutesBefore);
      }
    }
  }

  private scheduleEvent(
    prayer: PrayerName,
    type: "adhan" | "reminder",
    eventTime: Date,
    now: Date,
    minutesBefore?: number
  ): void {
    const key = this.makeKey(prayer, type);
    const timeUntil = eventTime.getTime() - now.getTime();

    // Clear existing timeout for this event
    const existingTimeout = this.timeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // If event is in the past but within trigger window, trigger now
    if (timeUntil < 0 && timeUntil > -PrayerScheduler.TRIGGER_WINDOW_MS) {
      this.triggerEvent(prayer, type, minutesBefore);
      return;
    }

    // If event is in the future, schedule it
    if (timeUntil > 0) {
      // Don't schedule if too far in the future (>24 hours)
      if (timeUntil > 24 * 60 * 60 * 1000) return;

      const timeout = setTimeout(() => {
        this.triggerEvent(prayer, type, minutesBefore);
      }, timeUntil);

      this.timeouts.set(key, timeout);
    }
  }

  private checkNow(configs: PrayerConfig[]): void {
    const now = new Date();

    // Check for day change
    const today = this.getDateKey(now);
    if (today !== this.currentDateKey) {
      this.resetForNewDay(today);
    }

    for (const config of configs) {
      if (config.prayer === "sunrise") continue;

      // Check adhan
      if (config.adhanEnabled && !this.hasAdhanTriggered(config.prayer)) {
        const timeDiff = now.getTime() - config.time.getTime();
        if (timeDiff >= 0 && timeDiff < PrayerScheduler.TRIGGER_WINDOW_MS) {
          this.triggerEvent(config.prayer, "adhan");
        }
      }

      // Check reminder
      if (config.reminderEnabled && !this.hasReminderTriggered(config.prayer)) {
        const reminderTime = new Date(config.time.getTime() - config.reminderMinutesBefore * 60 * 1000);
        const timeDiff = now.getTime() - reminderTime.getTime();
        if (timeDiff >= 0 && timeDiff < PrayerScheduler.TRIGGER_WINDOW_MS) {
          this.triggerEvent(config.prayer, "reminder", config.reminderMinutesBefore);
        }
      }
    }
  }

  private triggerEvent(prayer: PrayerName, type: "adhan" | "reminder", minutesBefore?: number): void {
    const key = this.makeKey(prayer, type);

    // Double-check not already triggered (race condition protection)
    if (type === "adhan") {
      if (this.triggeredAdhans.has(key)) return;
      this.triggeredAdhans.add(key);
      this.saveToStorage(STORAGE_KEY_ADHANS, this.triggeredAdhans);
      this.callbacks.onAdhan(prayer);
    } else {
      if (this.triggeredReminders.has(key)) return;
      this.triggeredReminders.add(key);
      this.saveToStorage(STORAGE_KEY_REMINDERS, this.triggeredReminders);
      this.callbacks.onReminder(prayer, minutesBefore || 15);
    }

    // Clear the timeout for this event
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }

  private resetForNewDay(newDateKey: string): void {
    this.currentDateKey = newDateKey;
    this.triggeredAdhans.clear();
    this.triggeredReminders.clear();
    this.saveToStorage(STORAGE_KEY_ADHANS, this.triggeredAdhans);
    this.saveToStorage(STORAGE_KEY_REMINDERS, this.triggeredReminders);
  }

  private makeKey(prayer: PrayerName, type: "adhan" | "reminder"): string {
    return `${this.currentDateKey}-${prayer}-${type}`;
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  private loadFromStorage(key: string): Set<string> {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filter out old entries (not from today)
        const today = this.getDateKey(new Date());
        const filtered = parsed.filter((k: string) => k.startsWith(today));
        return new Set(filtered);
      }
    } catch {
      // Ignore storage errors
    }
    return new Set();
  }

  private saveToStorage(key: string, set: Set<string>): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Create a singleton scheduler instance
 */
let globalScheduler: PrayerScheduler | null = null;

export function getGlobalScheduler(callbacks?: SchedulerCallbacks): PrayerScheduler {
  if (!globalScheduler && callbacks) {
    globalScheduler = new PrayerScheduler(callbacks);
  }
  if (!globalScheduler) {
    throw new Error("PrayerScheduler not initialized. Call with callbacks first.");
  }
  return globalScheduler;
}

export function destroyGlobalScheduler(): void {
  if (globalScheduler) {
    globalScheduler.stop();
    globalScheduler = null;
  }
}
