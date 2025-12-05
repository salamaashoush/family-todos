// Mawaqit API integration for mosque-based prayer times
// Public API - No authentication required

export interface MawaqitMosque {
  uuid: string;
  id: number;
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  site?: string;
  address?: string;
  city?: string;
  zipcode?: string;
  country?: string;
  latitude: number;
  longitude: number;
  image?: string;
  localisation?: [number, number]; // [lat, lng]
  proximity?: number; // distance in meters from search
  // Today's prayer times from search results
  times?: string[]; // [Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha]
  iqama?: string[]; // Iqama times
}

export interface MawaqitPrayerTimesResponse {
  // Mosque info
  uuid: string;
  id: number;
  name: string;
  slug: string;
  label?: string;
  phone?: string;
  email?: string;
  site?: string;
  address?: string;
  city?: string;
  zipcode?: string;
  country?: string;
  latitude: number;
  longitude: number;

  // Today's prayer times - prayer-times endpoint has 5 elements (no sunrise)
  // Order: [Fajr, Dhuhr, Asr, Maghrib, Isha] in "HH:mm" format
  times: string[];

  // Sunrise/Shuruq is a separate field in prayer-times endpoint
  shuruq?: string;

  // Iqama times - 5 elements matching the 5 prayers
  // Can be absolute times "HH:mm" or relative "+N" (minutes after adhan)
  iqama: string[];

  // Iqama delays (alternative format, used if iqama is not explicit)
  iqamaEnabled?: boolean;
  fixedIqama?: string[];

  // Jumua (Friday prayer) times
  jumua?: string;
  jumua2?: string;
  jumua3?: string;
  jumuaAsDhuhr?: boolean;

  // Full calendar data - each day has 6 elements [Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha]
  calendar?: Record<string, string[][]>; // Monthly calendars: { "1": [["05:30", "06:55", ...], ...], ... }
  iqamaCalendar?: Record<string, string[][]>; // Same structure for iqama

  // Shuruq specific calendar (sunrise)
  shuruqCalendar?: Record<string, string[]>;

  // Additional mosque features
  wpiudu?: boolean;
  parking?: boolean;
  handicapAccess?: boolean;
  women?: boolean;

  // Last updated
  updatedAt?: string;

  // Flash messages (announcements)
  flash?: string;
}

export interface MawaqitSearchResult {
  mosques: MawaqitMosque[];
}

// Cache for Mawaqit data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

// Cache duration constants (in milliseconds)
const SEARCH_CACHE_DURATION = 1000 * 60 * 60; // 1 hour for search results
const PRAYER_TIMES_CACHE_DURATION = 1000 * 60 * 60 * 6; // 6 hours for prayer times
const CALENDAR_CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours for calendar data

function getCacheKey(type: string, ...args: string[]): string {
  return `${type}:${args.join(":")}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

function setCache<T>(key: string, data: T, duration: number): void {
  const now = Date.now();
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + duration,
  });
}

// Clear expired cache entries periodically
export function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}

// API Base URL
const MAWAQIT_API_BASE = "https://mawaqit.net/api/2.0";

/**
 * Search for mosques by query (city name, mosque name, etc.)
 */
export async function searchMosques(query: string): Promise<MawaqitMosque[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const cacheKey = getCacheKey("search", query.toLowerCase().trim());
  const cached = getFromCache<MawaqitMosque[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `${MAWAQIT_API_BASE}/mosque/search?word=${encodeURIComponent(query)}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Mawaqit search failed: ${response.status}`);
    }

    const data = await response.json();

    // The API returns an array directly or an object with mosques
    const mosques: MawaqitMosque[] = Array.isArray(data) ? data : (data.mosques || []);

    setCache(cacheKey, mosques, SEARCH_CACHE_DURATION);
    return mosques;
  } catch (error) {
    console.error("Mawaqit search error:", error);
    throw error;
  }
}

/**
 * Search for mosques by location (latitude/longitude)
 * Returns mosques sorted by proximity (closest first)
 */
export async function searchMosquesByLocation(
  latitude: number,
  longitude: number
): Promise<MawaqitMosque[]> {
  const cacheKey = getCacheKey("search-location", `${latitude.toFixed(4)},${longitude.toFixed(4)}`);
  const cached = getFromCache<MawaqitMosque[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `${MAWAQIT_API_BASE}/mosque/search?lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Mawaqit location search failed: ${response.status}`);
    }

    const data = await response.json();

    // The API returns an array directly or an object with mosques
    const mosques: MawaqitMosque[] = Array.isArray(data) ? data : (data.mosques || []);

    setCache(cacheKey, mosques, SEARCH_CACHE_DURATION);
    return mosques;
  } catch (error) {
    console.error("Mawaqit location search error:", error);
    throw error;
  }
}

/**
 * Get detailed prayer times for a mosque by UUID
 */
export async function getMosquePrayerTimes(uuid: string): Promise<MawaqitPrayerTimesResponse> {
  if (!uuid) {
    throw new Error("Mosque UUID is required");
  }

  const cacheKey = getCacheKey("prayer-times", uuid);
  const cached = getFromCache<MawaqitPrayerTimesResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `${MAWAQIT_API_BASE}/mosque/${uuid}/prayer-times`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Mawaqit prayer times fetch failed: ${response.status}`);
    }

    const data: MawaqitPrayerTimesResponse = await response.json();

    setCache(cacheKey, data, PRAYER_TIMES_CACHE_DURATION);
    return data;
  } catch (error) {
    console.error("Mawaqit prayer times error:", error);
    throw error;
  }
}

/**
 * Parse time string "HH:mm" to Date object for today
 */
export function parseTimeToDate(timeStr: string, timezone?: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();

  // If timezone provided, create date in that timezone
  if (timezone) {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    const dateStr = new Intl.DateTimeFormat("en-CA", options).format(date);
    const [year, month, day] = dateStr.split("-").map(Number);

    // Create a date in the target timezone
    const tzDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
    return tzDate;
  }

  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Convert Mawaqit times array to our prayer times format
 * Mawaqit order: [Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha]
 */
export interface MawaqitPrayerTimesFormatted {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  // Iqama times (optional)
  iqama?: {
    fajr?: Date;
    dhuhr?: Date;
    asr?: Date;
    maghrib?: Date;
    isha?: Date;
  };
  // Jumua times
  jumua?: Date;
  jumua2?: Date;
  jumua3?: Date;
  // Mosque info
  mosqueName: string;
  mosqueUuid: string;
}

/**
 * Parse iqama time which can be absolute "HH:mm" or relative "+N" (minutes after adhan)
 */
function parseIqamaTime(
  iqamaStr: string,
  adhanTime: Date,
  timezone?: string
): Date {
  if (iqamaStr.startsWith("+")) {
    // Relative format: "+N" means N minutes after adhan
    const minutesAfter = parseInt(iqamaStr.substring(1), 10);
    const iqamaDate = new Date(adhanTime.getTime() + minutesAfter * 60 * 1000);
    return iqamaDate;
  }
  // Absolute format: "HH:mm"
  return parseTimeToDate(iqamaStr, timezone);
}

export function formatMawaqitPrayerTimes(
  data: MawaqitPrayerTimesResponse,
  timezone?: string
): MawaqitPrayerTimesFormatted {
  const times = data.times || [];
  const iqama = data.iqama || [];

  // prayer-times endpoint returns 5 elements in times array:
  // [Fajr, Dhuhr, Asr, Maghrib, Isha]
  // Sunrise/Shuruq is in a separate field: data.shuruq
  const fajrTime = parseTimeToDate(times[0] || "00:00", timezone);
  const sunriseTime = parseTimeToDate(data.shuruq || "00:00", timezone);
  const dhuhrTime = parseTimeToDate(times[1] || "00:00", timezone);
  const asrTime = parseTimeToDate(times[2] || "00:00", timezone);
  const maghribTime = parseTimeToDate(times[3] || "00:00", timezone);
  const ishaTime = parseTimeToDate(times[4] || "00:00", timezone);

  const result: MawaqitPrayerTimesFormatted = {
    fajr: fajrTime,
    sunrise: sunriseTime,
    dhuhr: dhuhrTime,
    asr: asrTime,
    maghrib: maghribTime,
    isha: ishaTime,
    mosqueName: data.name,
    mosqueUuid: data.uuid,
  };

  // Add iqama times if available
  // iqama array has 5 elements matching the 5 prayers (no sunrise):
  // [Fajr iqama, Dhuhr iqama, Asr iqama, Maghrib iqama, Isha iqama]
  // Values can be absolute "HH:mm" or relative "+N" (minutes after adhan)
  if (iqama.length > 0) {
    result.iqama = {};
    if (iqama[0]) result.iqama.fajr = parseIqamaTime(iqama[0], fajrTime, timezone);
    if (iqama[1]) result.iqama.dhuhr = parseIqamaTime(iqama[1], dhuhrTime, timezone);
    if (iqama[2]) result.iqama.asr = parseIqamaTime(iqama[2], asrTime, timezone);
    if (iqama[3]) result.iqama.maghrib = parseIqamaTime(iqama[3], maghribTime, timezone);
    if (iqama[4]) result.iqama.isha = parseIqamaTime(iqama[4], ishaTime, timezone);
  }

  // Add jumua times if available
  if (data.jumua) {
    result.jumua = parseTimeToDate(data.jumua, timezone);
  }
  if (data.jumua2) {
    result.jumua2 = parseTimeToDate(data.jumua2, timezone);
  }
  if (data.jumua3) {
    result.jumua3 = parseTimeToDate(data.jumua3, timezone);
  }

  return result;
}

/**
 * Get prayer times for a specific date from the calendar
 */
export function getPrayerTimesForDate(
  data: MawaqitPrayerTimesResponse,
  date: Date,
  timezone?: string
): { times: string[]; iqama?: string[] } | null {
  if (!data.calendar) {
    return null;
  }

  const month = (date.getMonth() + 1).toString(); // 1-12
  const day = date.getDate() - 1; // 0-indexed

  const monthCalendar = data.calendar[month];
  if (!monthCalendar || !monthCalendar[day]) {
    return null;
  }

  const result: { times: string[]; iqama?: string[] } = {
    times: monthCalendar[day],
  };

  // Get iqama times for the date if available
  if (data.iqamaCalendar) {
    const iqamaMonthCalendar = data.iqamaCalendar[month];
    if (iqamaMonthCalendar && iqamaMonthCalendar[day]) {
      result.iqama = iqamaMonthCalendar[day];
    }
  }

  return result;
}

// Export cache stats for debugging
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: cache.size,
    entries: Array.from(cache.keys()),
  };
}
