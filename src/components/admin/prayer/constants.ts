import { DEFAULT_ADHAN_URLS } from "../../../utils/audioManager";

// Available adhan sounds with display names
export const ADHAN_SOUNDS = [
  { id: "makkah", name: "Makkah", url: DEFAULT_ADHAN_URLS.makkah },
  { id: "madinah", name: "Madinah", url: DEFAULT_ADHAN_URLS.madinah },
  { id: "alAqsa", name: "Al-Aqsa", url: DEFAULT_ADHAN_URLS.alAqsa },
  { id: "egypt", name: "Egypt", url: DEFAULT_ADHAN_URLS.egypt },
  { id: "abdulBaset", name: "Abdul Baset", url: DEFAULT_ADHAN_URLS.abdulBaset },
] as const;

export const FAJR_ADHAN_SOUNDS = [
  { id: "fajrMakkah", name: "Makkah (Fajr)", url: DEFAULT_ADHAN_URLS.fajrMakkah },
  { id: "fajrMadinah", name: "Madinah (Fajr)", url: DEFAULT_ADHAN_URLS.fajrMadinah },
] as const;

export type AdhanSoundId = typeof ADHAN_SOUNDS[number]["id"];
export type FajrAdhanSoundId = typeof FAJR_ADHAN_SOUNDS[number]["id"];
