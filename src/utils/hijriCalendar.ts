/**
 * Hijri (Islamic) Calendar Conversion Utilities
 * Based on the Umm al-Qura calendar algorithm
 */

// Islamic month names
export const HIJRI_MONTHS = {
  1: { english: "Muharram", arabic: "محرم" },
  2: { english: "Safar", arabic: "صفر" },
  3: { english: "Rabi' al-Awwal", arabic: "ربيع الأول" },
  4: { english: "Rabi' al-Thani", arabic: "ربيع الثاني" },
  5: { english: "Jumada al-Awwal", arabic: "جمادى الأولى" },
  6: { english: "Jumada al-Thani", arabic: "جمادى الثانية" },
  7: { english: "Rajab", arabic: "رجب" },
  8: { english: "Sha'ban", arabic: "شعبان" },
  9: { english: "Ramadan", arabic: "رمضان" },
  10: { english: "Shawwal", arabic: "شوال" },
  11: { english: "Dhu al-Qi'dah", arabic: "ذو القعدة" },
  12: { english: "Dhu al-Hijjah", arabic: "ذو الحجة" },
} as const;

// Islamic weekday names
export const HIJRI_WEEKDAYS = {
  0: { english: "Al-Ahad", arabic: "الأحد" }, // Sunday
  1: { english: "Al-Ithnayn", arabic: "الاثنين" }, // Monday
  2: { english: "Al-Thulatha", arabic: "الثلاثاء" }, // Tuesday
  3: { english: "Al-Arbi'a", arabic: "الأربعاء" }, // Wednesday
  4: { english: "Al-Khamis", arabic: "الخميس" }, // Thursday
  5: { english: "Al-Jumu'ah", arabic: "الجمعة" }, // Friday
  6: { english: "Al-Sabt", arabic: "السبت" }, // Saturday
} as const;

export interface HijriDate {
  year: number;
  month: number;
  day: number;
  monthName: { english: string; arabic: string };
  weekday: { english: string; arabic: string };
}

/**
 * Convert Gregorian date to Hijri date
 * Uses the Kuwaiti algorithm which is widely accepted
 */
export function gregorianToHijri(date: Date): HijriDate {
  // Julian Day Number calculation
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let jd: number;
  if (month <= 2) {
    jd = Math.floor(365.25 * (year - 1)) + Math.floor(30.6001 * (month + 13)) + day + 1720995;
  } else {
    jd = Math.floor(365.25 * year) + Math.floor(30.6001 * (month + 1)) + day + 1720995;
  }

  // Gregorian calendar correction
  const a = Math.floor(year / 100);
  jd = jd - a + Math.floor(a / 4) + 2;

  // Convert Julian Day to Hijri
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
            Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
             Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hijriMonth = Math.floor((24 * l3) / 709);
  const hijriDay = l3 - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;

  const weekdayIndex = date.getDay() as keyof typeof HIJRI_WEEKDAYS;

  return {
    year: hijriYear,
    month: hijriMonth,
    day: hijriDay,
    monthName: HIJRI_MONTHS[hijriMonth as keyof typeof HIJRI_MONTHS],
    weekday: HIJRI_WEEKDAYS[weekdayIndex],
  };
}

/**
 * Format Hijri date for display
 */
export function formatHijriDate(hijri: HijriDate, format: "short" | "long" | "arabic" = "long"): string {
  switch (format) {
    case "short":
      return `${hijri.day} ${hijri.monthName.english.split(" ")[0]} ${hijri.year} AH`;
    case "arabic":
      return `${hijri.day} ${hijri.monthName.arabic} ${hijri.year} هـ`;
    case "long":
    default:
      return `${hijri.day} ${hijri.monthName.english}, ${hijri.year} AH`;
  }
}

/**
 * Check if a Hijri month is Ramadan
 */
export function isRamadan(hijri: HijriDate): boolean {
  return hijri.month === 9;
}

/**
 * Check if a date is during the last 10 nights of Ramadan
 */
export function isLastTenNights(hijri: HijriDate): boolean {
  return hijri.month === 9 && hijri.day >= 21;
}

/**
 * Check if today is Jumu'ah (Friday)
 */
export function isJumuah(date: Date): boolean {
  return date.getDay() === 5;
}

/**
 * Get special Islamic days/events for a given Hijri date
 */
export function getIslamicEvent(hijri: HijriDate): string | null {
  const { month, day } = hijri;

  // Major Islamic events
  if (month === 1 && day === 1) return "Islamic New Year";
  if (month === 1 && day === 10) return "Day of Ashura";
  if (month === 3 && day === 12) return "Mawlid al-Nabi (Birth of Prophet)";
  if (month === 7 && day === 27) return "Isra and Mi'raj";
  if (month === 8 && day === 15) return "Mid-Sha'ban (Laylat al-Bara'at)";
  if (month === 9 && day === 1) return "First day of Ramadan";
  if (month === 9 && day === 27) return "Laylat al-Qadr (estimated)";
  if (month === 10 && day === 1) return "Eid al-Fitr";
  if (month === 12 && day === 8) return "Day of Tarwiyah";
  if (month === 12 && day === 9) return "Day of Arafah";
  if (month === 12 && day === 10) return "Eid al-Adha";
  if (month === 12 && day >= 11 && day <= 13) return "Days of Tashreeq";

  return null;
}

/**
 * Get days remaining until Ramadan
 */
export function daysUntilRamadan(date: Date): number | null {
  const hijri = gregorianToHijri(date);

  // If currently in Ramadan, return 0
  if (hijri.month === 9) return 0;

  // If past Ramadan this year, calculate for next year
  if (hijri.month > 9) {
    // Approximate days: remaining months * 29.5 average
    const monthsUntilNextRamadan = (12 - hijri.month) + 9;
    const daysRemaining = (30 - hijri.day) + (monthsUntilNextRamadan - 1) * 30;
    return Math.round(daysRemaining);
  }

  // Before Ramadan this year
  const monthsUntilRamadan = 9 - hijri.month;
  const daysRemaining = (30 - hijri.day) + (monthsUntilRamadan - 1) * 30;
  return Math.round(daysRemaining);
}
