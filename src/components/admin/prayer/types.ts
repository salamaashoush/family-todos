import type {
  CalculationMethodType,
  MadhabType,
  HighLatitudeRuleType,
  PrayerSourceType,
} from "../../../db/schema/prayer";

export interface PrayerSettingsFormState {
  latitude: string;
  longitude: string;
  timezone: string;
  city: string;
  country: string;
  calculationMethod: CalculationMethodType;
  madhab: MadhabType;
  highLatitudeRule: HighLatitudeRuleType;
  isEnabled: boolean;
  showFloatingButton: boolean;
  fullscreenAdhanEnabled: boolean;
  fajrAdjustment: number;
  sunriseAdjustment: number;
  dhuhrAdjustment: number;
  asrAdjustment: number;
  maghribAdjustment: number;
  ishaAdjustment: number;
  prayerSource: PrayerSourceType;
  mosqueUuid: string | null;
  mosqueName: string | null;
  mosqueAddress: string | null;
}

export interface AdhanPrayerSettingsData {
  id: number;
  adhanEnabled: boolean;
  adhanAudioUrl: string | null;
  adhanAudioName: string | null;
  adhanVolume: string | null;
  useFajrAdhan: boolean | null;
  reminderEnabled: boolean;
  reminderMinutesBefore: number | null;
  reminderSoundEnabled: boolean;
}
