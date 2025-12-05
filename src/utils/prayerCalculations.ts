import {
  Coordinates,
  CalculationMethod,
  PrayerTimes,
  Prayer,
  Madhab,
  HighLatitudeRule,
  CalculationParameters,
} from "adhan";
import type {
  CalculationMethodType,
  MadhabType,
  HighLatitudeRuleType,
  PrayerSettings,
} from "../db/schema/prayer";

// Prayer name mapping for display
export const PRAYER_NAMES = {
  fajr: { english: "Fajr", arabic: "الفجر" },
  sunrise: { english: "Sunrise", arabic: "الشروق" },
  dhuhr: { english: "Dhuhr", arabic: "الظهر" },
  asr: { english: "Asr", arabic: "العصر" },
  maghrib: { english: "Maghrib", arabic: "المغرب" },
  isha: { english: "Isha", arabic: "العشاء" },
} as const;

export type PrayerName = keyof typeof PRAYER_NAMES;

// Calculation method display names
export const CALCULATION_METHOD_NAMES: Record<CalculationMethodType, string> = {
  MuslimWorldLeague: "Muslim World League",
  Egyptian: "Egyptian General Authority",
  Karachi: "University of Islamic Sciences, Karachi",
  UmmAlQura: "Umm al-Qura University, Makkah",
  Dubai: "Dubai",
  MoonsightingCommittee: "Moonsighting Committee",
  NorthAmerica: "Islamic Society of North America (ISNA)",
  Kuwait: "Kuwait",
  Qatar: "Qatar",
  Singapore: "Singapore",
  Turkey: "Turkey (Diyanet)",
  Tehran: "Institute of Geophysics, Tehran",
  Other: "Custom",
};

// Get calculation parameters for a method
function getCalculationParams(method: CalculationMethodType): CalculationParameters {
  switch (method) {
    case "MuslimWorldLeague":
      return CalculationMethod.MuslimWorldLeague();
    case "Egyptian":
      return CalculationMethod.Egyptian();
    case "Karachi":
      return CalculationMethod.Karachi();
    case "UmmAlQura":
      return CalculationMethod.UmmAlQura();
    case "Dubai":
      return CalculationMethod.Dubai();
    case "MoonsightingCommittee":
      return CalculationMethod.MoonsightingCommittee();
    case "NorthAmerica":
      return CalculationMethod.NorthAmerica();
    case "Kuwait":
      return CalculationMethod.Kuwait();
    case "Qatar":
      return CalculationMethod.Qatar();
    case "Singapore":
      return CalculationMethod.Singapore();
    case "Turkey":
      return CalculationMethod.Turkey();
    case "Tehran":
      return CalculationMethod.Tehran();
    case "Other":
    default:
      return CalculationMethod.MuslimWorldLeague();
  }
}

// Get high latitude rule
function getHighLatitudeRule(rule?: HighLatitudeRuleType | null): typeof HighLatitudeRule[keyof typeof HighLatitudeRule] {
  switch (rule) {
    case "MiddleOfTheNight":
      return HighLatitudeRule.MiddleOfTheNight;
    case "SeventhOfTheNight":
      return HighLatitudeRule.SeventhOfTheNight;
    case "TwilightAngle":
      return HighLatitudeRule.TwilightAngle;
    default:
      return HighLatitudeRule.MiddleOfTheNight;
  }
}

export interface PrayerTimesConfig {
  latitude: number;
  longitude: number;
  date: Date;
  method: CalculationMethodType;
  madhab: MadhabType;
  highLatitudeRule?: HighLatitudeRuleType | null;
  adjustments?: {
    fajr?: number;
    sunrise?: number;
    dhuhr?: number;
    asr?: number;
    maghrib?: number;
    isha?: number;
  };
}

export interface CalculatedPrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

export interface PrayerTimesResult extends CalculatedPrayerTimes {
  currentPrayer: PrayerName | null;
  nextPrayer: PrayerName | null;
  nextPrayerTime: Date | null;
  timeUntilNextPrayer: number | null; // milliseconds
}

// Convert adhan Prayer enum to our PrayerName
function prayerToName(prayer: typeof Prayer[keyof typeof Prayer] | null): PrayerName | null {
  if (prayer === null) return null;
  switch (prayer) {
    case Prayer.Fajr:
      return "fajr";
    case Prayer.Sunrise:
      return "sunrise";
    case Prayer.Dhuhr:
      return "dhuhr";
    case Prayer.Asr:
      return "asr";
    case Prayer.Maghrib:
      return "maghrib";
    case Prayer.Isha:
      return "isha";
    default:
      return null;
  }
}

// Calculate prayer times
export function calculatePrayerTimes(config: PrayerTimesConfig): PrayerTimesResult {
  const coordinates = new Coordinates(config.latitude, config.longitude);
  const params = getCalculationParams(config.method);

  // Set madhab
  params.madhab = config.madhab === "Hanafi" ? Madhab.Hanafi : Madhab.Shafi;

  // Set high latitude rule
  if (config.highLatitudeRule) {
    params.highLatitudeRule = getHighLatitudeRule(config.highLatitudeRule);
  }

  // Apply manual adjustments
  if (config.adjustments) {
    params.adjustments.fajr = config.adjustments.fajr || 0;
    params.adjustments.sunrise = config.adjustments.sunrise || 0;
    params.adjustments.dhuhr = config.adjustments.dhuhr || 0;
    params.adjustments.asr = config.adjustments.asr || 0;
    params.adjustments.maghrib = config.adjustments.maghrib || 0;
    params.adjustments.isha = config.adjustments.isha || 0;
  }

  const prayerTimes = new PrayerTimes(coordinates, config.date, params);

  const currentPrayer = prayerToName(prayerTimes.currentPrayer());
  const nextPrayer = prayerToName(prayerTimes.nextPrayer());
  const nextPrayerTime = nextPrayer ? prayerTimes.timeForPrayer(prayerTimes.nextPrayer()!) : null;
  const timeUntilNextPrayer = nextPrayerTime
    ? nextPrayerTime.getTime() - config.date.getTime()
    : null;

  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
    currentPrayer,
    nextPrayer,
    nextPrayerTime,
    timeUntilNextPrayer,
  };
}

// Calculate prayer times from settings
export function calculatePrayerTimesFromSettings(
  settings: PrayerSettings,
  date: Date = new Date()
): PrayerTimesResult {
  return calculatePrayerTimes({
    latitude: parseFloat(settings.latitude),
    longitude: parseFloat(settings.longitude),
    date,
    method: settings.calculationMethod as CalculationMethodType,
    madhab: settings.madhab as MadhabType,
    highLatitudeRule: settings.highLatitudeRule as HighLatitudeRuleType | null,
    adjustments: {
      fajr: settings.fajrAdjustment || 0,
      sunrise: settings.sunriseAdjustment || 0,
      dhuhr: settings.dhuhrAdjustment || 0,
      asr: settings.asrAdjustment || 0,
      maghrib: settings.maghribAdjustment || 0,
      isha: settings.ishaAdjustment || 0,
    },
  });
}

// Format time for display (12-hour format)
export function formatPrayerTime(date: Date, timezone?: string): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  if (timezone) {
    options.timeZone = timezone;
  }
  return date.toLocaleTimeString("en-US", options);
}

// Format countdown (e.g., "2h 15m" or "45m" or "5m")
export function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return "Now";

  const totalMinutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Get prayer times for a list of dates (for calendar view)
export function getPrayerTimesForRange(
  settings: PrayerSettings,
  startDate: Date,
  days: number
): Map<string, PrayerTimesResult> {
  const results = new Map<string, PrayerTimesResult>();
  const currentDate = new Date(startDate);

  for (let i = 0; i < days; i++) {
    const dateKey = currentDate.toISOString().split("T")[0];
    results.set(dateKey, calculatePrayerTimesFromSettings(settings, new Date(currentDate)));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return results;
}

// Check if a prayer time is within the threshold (for triggering adhan)
export function isPrayerTimeNow(
  prayerTime: Date,
  currentTime: Date = new Date(),
  thresholdMs: number = 60000 // 1 minute default
): boolean {
  const diff = Math.abs(currentTime.getTime() - prayerTime.getTime());
  return diff < thresholdMs;
}

// Check if we're within reminder window
export function isWithinReminderWindow(
  prayerTime: Date,
  currentTime: Date,
  minutesBefore: number
): boolean {
  const reminderTime = new Date(prayerTime.getTime() - minutesBefore * 60 * 1000);
  const diff = currentTime.getTime() - reminderTime.getTime();
  // Within 1 minute of reminder time
  return diff >= 0 && diff < 60000;
}

// Get the ordered list of prayers for display
export function getPrayerOrder(): PrayerName[] {
  return ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];
}

// Get prayers that have adhan (exclude sunrise)
export function getPrayersWithAdhan(): PrayerName[] {
  return ["fajr", "dhuhr", "asr", "maghrib", "isha"];
}
