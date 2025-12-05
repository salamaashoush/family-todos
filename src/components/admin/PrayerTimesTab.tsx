import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Calculator, Monitor, Volume2, Play, Square } from "lucide-react";
import {
  getPrayerSettings,
  savePrayerSettings,
  getAdhanSettings,
  saveAdhanSettings,
  getDefaultAdhanAudios,
} from "../../server/prayer";
import { useGeolocation, useTimezone } from "../../hooks/usePrayerTimes";
import {
  CALCULATION_METHOD_NAMES,
  PRAYER_NAMES,
  getPrayersWithAdhan,
  calculatePrayerTimes,
  formatPrayerTime,
  type PrayerName,
} from "../../utils/prayerCalculations";
import {
  calculationMethodEnum,
  madhabEnum,
  highLatitudeRuleEnum,
  type CalculationMethodType,
  type MadhabType,
  type HighLatitudeRuleType,
} from "../../db/schema/prayer";
import { DEFAULT_ADHAN_URLS } from "../../utils/audioManager";
import { Button, Input, Select, Alert, SkeletonCard } from "../shared";

// Available adhan sounds with display names
const ADHAN_SOUNDS = [
  { id: "makkah", name: "Makkah", url: DEFAULT_ADHAN_URLS.makkah },
  { id: "madinah", name: "Madinah", url: DEFAULT_ADHAN_URLS.madinah },
  { id: "alAqsa", name: "Al-Aqsa", url: DEFAULT_ADHAN_URLS.alAqsa },
  { id: "egypt", name: "Egypt", url: DEFAULT_ADHAN_URLS.egypt },
  { id: "abdulBaset", name: "Abdul Baset", url: DEFAULT_ADHAN_URLS.abdulBaset },
] as const;

const FAJR_ADHAN_SOUNDS = [
  { id: "fajrMakkah", name: "Makkah (Fajr)", url: DEFAULT_ADHAN_URLS.fajrMakkah },
  { id: "fajrMadinah", name: "Madinah (Fajr)", url: DEFAULT_ADHAN_URLS.fajrMadinah },
] as const;

export function PrayerTimesTab() {
  const queryClient = useQueryClient();
  const detectedTimezone = useTimezone();
  const { location, error: locationError, isLoading: locationLoading, requestLocation, isSupported: geoSupported } = useGeolocation();

  // Fetch current settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["prayer-settings"],
    queryFn: () => getPrayerSettings(),
  });

  const { data: adhanSettings = [] } = useQuery({
    queryKey: ["adhan-settings"],
    queryFn: () => getAdhanSettings(),
    enabled: !!settings,
  });

  const { data: _defaultAudios = [] } = useQuery({
    queryKey: ["default-adhan-audios"],
    queryFn: () => getDefaultAdhanAudios(),
  });

  // Form state
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [timezone, setTimezone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethodType>("MuslimWorldLeague");
  const [madhab, setMadhab] = useState<MadhabType>("Shafi");
  const [highLatitudeRule, setHighLatitudeRule] = useState<HighLatitudeRuleType>("MiddleOfTheNight");
  const [isEnabled, setIsEnabled] = useState(true);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [fullscreenAdhanEnabled, setFullscreenAdhanEnabled] = useState(true);

  // Adjustments
  const [fajrAdjustment, setFajrAdjustment] = useState(0);
  const [sunriseAdjustment, setSunriseAdjustment] = useState(0);
  const [dhuhrAdjustment, setDhuhrAdjustment] = useState(0);
  const [asrAdjustment, setAsrAdjustment] = useState(0);
  const [maghribAdjustment, setMaghribAdjustment] = useState(0);
  const [ishaAdjustment, setIshaAdjustment] = useState(0);

  // Active section
  const [activeSection, setActiveSection] = useState<"location" | "calculation" | "display" | "adhan">("location");

  // Initialize form from settings
  useEffect(() => {
    if (settings) {
      setLatitude(settings.latitude);
      setLongitude(settings.longitude);
      setTimezone(settings.timezone);
      setCity(settings.city || "");
      setCountry(settings.country || "");
      setCalculationMethod(settings.calculationMethod as CalculationMethodType);
      setMadhab(settings.madhab as MadhabType);
      setHighLatitudeRule((settings.highLatitudeRule as HighLatitudeRuleType) || "MiddleOfTheNight");
      setIsEnabled(settings.isEnabled);
      setShowFloatingButton(settings.showFloatingButton);
      setFullscreenAdhanEnabled(settings.fullscreenAdhanEnabled);
      setFajrAdjustment(settings.fajrAdjustment || 0);
      setSunriseAdjustment(settings.sunriseAdjustment || 0);
      setDhuhrAdjustment(settings.dhuhrAdjustment || 0);
      setAsrAdjustment(settings.asrAdjustment || 0);
      setMaghribAdjustment(settings.maghribAdjustment || 0);
      setIshaAdjustment(settings.ishaAdjustment || 0);
    } else if (detectedTimezone) {
      setTimezone(detectedTimezone);
    }
  }, [settings, detectedTimezone]);

  // Apply geolocation when received
  useEffect(() => {
    if (location) {
      setLatitude(location.latitude.toFixed(7));
      setLongitude(location.longitude.toFixed(7));
      // Also set city and country if available from reverse geocoding
      if (location.city) {
        setCity(location.city);
      }
      if (location.country) {
        setCountry(location.country);
      }
    }
  }, [location]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: savePrayerSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prayer-settings"] });
      queryClient.invalidateQueries({ queryKey: ["adhan-settings"] });
    },
  });

  // Save handler
  const handleSave = useCallback(() => {
    saveMutation.mutate({
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timezone,
        city: city || undefined,
        country: country || undefined,
        calculationMethod,
        madhab,
        highLatitudeRule,
        fajrAdjustment,
        sunriseAdjustment,
        dhuhrAdjustment,
        asrAdjustment,
        maghribAdjustment,
        ishaAdjustment,
        isEnabled,
        showFloatingButton,
        fullscreenAdhanEnabled,
      },
    });
  }, [
    latitude, longitude, timezone, city, country,
    calculationMethod, madhab, highLatitudeRule,
    fajrAdjustment, sunriseAdjustment, dhuhrAdjustment,
    asrAdjustment, maghribAdjustment, ishaAdjustment,
    isEnabled, showFloatingButton, fullscreenAdhanEnabled,
    saveMutation,
  ]);

  // Preview prayer times - calculate directly from form values (works without saved settings)
  const previewTimes = latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))
    ? calculatePrayerTimes({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        date: new Date(),
        method: calculationMethod,
        madhab: madhab,
        highLatitudeRule: highLatitudeRule,
        adjustments: {
          fajr: fajrAdjustment,
          sunrise: sunriseAdjustment,
          dhuhr: dhuhrAdjustment,
          asr: asrAdjustment,
          maghrib: maghribAdjustment,
          isha: ishaAdjustment,
        },
      })
    : null;

  if (settingsLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={2} />
      </div>
    );
  }

  const sectionTabs = [
    { id: "location" as const, label: "Location", icon: MapPin },
    { id: "calculation" as const, label: "Calculation", icon: Calculator },
    { id: "display" as const, label: "Display", icon: Monitor },
    { id: "adhan" as const, label: "Adhan Audio", icon: Volume2 },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Prayer Times</h2>
          {/* Enable Toggle */}
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              isEnabled ? "bg-theme-primary" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                isEnabled ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Configure Islamic prayer times for your family board
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sectionTabs.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm whitespace-nowrap transition-all min-h-[44px] ${
                activeSection === section.id
                  ? "bg-theme-primary text-white shadow-lg"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Location Section */}
      {activeSection === "location" && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">Location Settings</h3>
            {geoSupported && (
              <Button
                variant="outline"
                size="sm"
                onClick={requestLocation}
                isLoading={locationLoading}
                leftIcon={<MapPin className="w-4 h-4" />}
              >
                Use My Location
              </Button>
            )}
          </div>

          {locationError && (
            <Alert variant="danger" title="Location Error" message={locationError} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Latitude"
              type="number"
              step="0.0000001"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g., 21.4225"
            />
            <Input
              label="Longitude"
              type="number"
              step="0.0000001"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g., 39.8262"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="City (Optional)"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Makkah"
            />
            <Input
              label="Country (Optional)"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g., Saudi Arabia"
            />
          </div>

          <div>
            <Input
              label="Timezone"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g., Asia/Riyadh"
            />
            <p className="mt-2 text-xs text-gray-500">
              Detected timezone: {detectedTimezone}
            </p>
          </div>
        </div>
      )}

      {/* Calculation Section */}
      {activeSection === "calculation" && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-6">
          <h3 className="text-lg font-bold text-gray-800">Calculation Settings</h3>

          <Select
            label="Calculation Method"
            value={calculationMethod}
            onChange={(e) => setCalculationMethod(e.target.value as CalculationMethodType)}
            fullWidth
          >
            {calculationMethodEnum.map((method) => (
              <option key={method} value={method}>
                {CALCULATION_METHOD_NAMES[method]}
              </option>
            ))}
          </Select>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Madhab (for Asr calculation)
            </label>
            <div className="flex gap-4">
              {madhabEnum.map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="madhab"
                    value={m}
                    checked={madhab === m}
                    onChange={() => setMadhab(m)}
                    className="w-5 h-5 text-theme-primary focus:ring-theme-primary"
                  />
                  <span className="text-sm font-medium text-gray-700">{m}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Shafi: Shadow equals object length. Hanafi: Shadow equals twice the length.
            </p>
          </div>

          <Select
            label="High Latitude Rule"
            value={highLatitudeRule}
            onChange={(e) => setHighLatitudeRule(e.target.value as HighLatitudeRuleType)}
            fullWidth
          >
            {highLatitudeRuleEnum.map((rule) => (
              <option key={rule} value={rule}>
                {rule.replace(/([A-Z])/g, " $1").trim()}
              </option>
            ))}
          </Select>
          <p className="-mt-4 text-xs text-gray-500">
            For locations above 48 latitude where twilight may not occur.
          </p>

          {/* Manual Adjustments */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Manual Adjustments (minutes)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Fajr", value: fajrAdjustment, setter: setFajrAdjustment },
                { label: "Sunrise", value: sunriseAdjustment, setter: setSunriseAdjustment },
                { label: "Dhuhr", value: dhuhrAdjustment, setter: setDhuhrAdjustment },
                { label: "Asr", value: asrAdjustment, setter: setAsrAdjustment },
                { label: "Maghrib", value: maghribAdjustment, setter: setMaghribAdjustment },
                { label: "Isha", value: ishaAdjustment, setter: setIshaAdjustment },
              ].map((adj) => (
                <Input
                  key={adj.label}
                  label={adj.label}
                  type="number"
                  value={adj.value}
                  onChange={(e) => adj.setter(parseInt(e.target.value) || 0)}
                  min={-60}
                  max={60}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Display Section */}
      {activeSection === "display" && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-6">
          <h3 className="text-lg font-bold text-gray-800">Display Settings</h3>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-800">Show Floating Button</h4>
              <p className="text-sm text-gray-600">Display prayer countdown button on the family board</p>
            </div>
            <button
              onClick={() => setShowFloatingButton(!showFloatingButton)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                showFloatingButton ? "bg-theme-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  showFloatingButton ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-800">Fullscreen Adhan</h4>
              <p className="text-sm text-gray-600">Take over the board with fullscreen adhan view at prayer time</p>
            </div>
            <button
              onClick={() => setFullscreenAdhanEnabled(!fullscreenAdhanEnabled)}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                fullscreenAdhanEnabled ? "bg-theme-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  fullscreenAdhanEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Test Fullscreen Button */}
          <div className="pt-4 border-t-2 border-gray-100">
            <h4 className="font-semibold text-gray-800 mb-2">Test Fullscreen Adhan</h4>
            <p className="text-sm text-gray-600 mb-3">
              Open the family board and click this button to test the fullscreen adhan view.
            </p>
            <Alert
              variant="info"
              title="How to test"
              message="1. Open your family board in another tab. 2. Come back here and click 'Test Now'. 3. The fullscreen adhan will appear on the family board."
            />
          </div>
        </div>
      )}

      {/* Adhan Audio Section */}
      {activeSection === "adhan" && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-6">
          <h3 className="text-lg font-bold text-gray-800">Adhan Audio Settings</h3>
          <p className="text-sm text-gray-600">
            Configure adhan audio for each prayer. Settings are saved automatically.
          </p>

          <div className="space-y-4">
            {getPrayersWithAdhan().map((prayer) => (
              <AdhanPrayerSettings
                key={prayer}
                prayer={prayer}
                settings={adhanSettings.find((s) => s.prayerName === prayer)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Prayer Times Preview */}
      {latitude && longitude && (
        <div className="bg-gradient-to-r from-theme-primary/10 to-theme-secondary/10 border-2 border-theme-primary/30 rounded-xl p-4 sm:p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Prayer Times Preview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {previewTimes &&
              (["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const).map((prayer) => (
                <div key={prayer} className="text-center bg-white rounded-xl p-3 shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">{PRAYER_NAMES[prayer].english}</div>
                  <div className="font-bold text-gray-800">
                    {formatPrayerTime(previewTimes[prayer], timezone)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleSave}
          disabled={!latitude || !longitude || !timezone}
          isLoading={saveMutation.isPending}
        >
          Save Settings
        </Button>
      </div>

      {saveMutation.isSuccess && (
        <Alert variant="success" title="Settings Saved" message="Prayer settings saved successfully!" />
      )}

      {saveMutation.isError && (
        <Alert variant="danger" title="Error" message="Failed to save settings. Please try again." />
      )}
    </div>
  );
}

// Individual prayer adhan settings component
interface AdhanPrayerSettingsProps {
  prayer: PrayerName;
  settings?: {
    id: number;
    adhanEnabled: boolean;
    adhanAudioUrl: string | null;
    adhanAudioName: string | null;
    adhanVolume: string | null;
    useFajrAdhan: boolean | null;
    reminderEnabled: boolean;
    reminderMinutesBefore: number | null;
    reminderSoundEnabled: boolean;
  };
}

function AdhanPrayerSettings({ prayer, settings }: AdhanPrayerSettingsProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [adhanEnabled, setAdhanEnabled] = useState(settings?.adhanEnabled ?? true);
  const [reminderEnabled, setReminderEnabled] = useState(settings?.reminderEnabled ?? false);
  const [reminderMinutes, setReminderMinutes] = useState(settings?.reminderMinutesBefore ?? 15);
  const [volume, setVolume] = useState(parseFloat(settings?.adhanVolume || "1"));
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Get sound ID from stored URL or default
  const getDefaultSoundId = () => {
    if (prayer === "fajr") {
      const match = FAJR_ADHAN_SOUNDS.find(s => s.url === settings?.adhanAudioUrl);
      return match?.id ?? "fajrMakkah";
    }
    const match = ADHAN_SOUNDS.find(s => s.url === settings?.adhanAudioUrl);
    return match?.id ?? "makkah";
  };

  const [selectedSound, setSelectedSound] = useState<string>(getDefaultSoundId());

  // Compute URL and name based on selected sound
  const selectedSoundUrl = useMemo(() => {
    if (prayer === "fajr") {
      const fajrSound = FAJR_ADHAN_SOUNDS.find(s => s.id === selectedSound);
      if (fajrSound) return fajrSound.url;
    }
    const sound = ADHAN_SOUNDS.find(s => s.id === selectedSound);
    return sound?.url ?? DEFAULT_ADHAN_URLS.makkah;
  }, [prayer, selectedSound]);

  const selectedSoundName = useMemo(() => {
    if (prayer === "fajr") {
      const fajrSound = FAJR_ADHAN_SOUNDS.find(s => s.id === selectedSound);
      if (fajrSound) return fajrSound.name;
    }
    const sound = ADHAN_SOUNDS.find(s => s.id === selectedSound);
    return sound?.name ?? "Makkah";
  }, [prayer, selectedSound]);

  const saveMutation = useMutation({
    mutationFn: saveAdhanSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adhan-settings"] });
    },
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate({
      data: {
        prayerName: prayer,
        adhanEnabled,
        adhanAudioUrl: selectedSoundUrl,
        adhanAudioName: selectedSoundName,
        adhanVolume: volume,
        useFajrAdhan: prayer === "fajr",
        reminderEnabled,
        reminderMinutesBefore: reminderMinutes,
        reminderSoundEnabled: true,
      },
    });
  }, [prayer, adhanEnabled, selectedSoundUrl, selectedSoundName, volume, reminderEnabled, reminderMinutes, saveMutation]);

  // Play/Stop test audio
  const handleTestPlay = useCallback(() => {
    if (isPlaying && audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
      setAudioElement(null);
      return;
    }

    const audio = new Audio(selectedSoundUrl);
    audio.volume = volume;
    audio.play().catch(console.error);
    setIsPlaying(true);
    setAudioElement(audio);

    // Stop after 10 seconds
    const timeout = setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setAudioElement(null);
    }, 10000);

    audio.onended = () => {
      clearTimeout(timeout);
      setIsPlaying(false);
      setAudioElement(null);
    };
  }, [selectedSoundUrl, volume, isPlaying, audioElement]);

  const prayerName = PRAYER_NAMES[prayer];

  return (
    <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${adhanEnabled ? "bg-theme-primary/10 text-theme-primary" : "bg-gray-100 text-gray-400"}`}>
            <Volume2 className="w-6 h-6" />
          </div>
          <div className="text-left">
            <div className="font-bold text-gray-800">{prayerName.english}</div>
            <div className="text-sm text-gray-500">
              {adhanEnabled ? "Adhan enabled" : "Adhan disabled"}
              {reminderEnabled && ` - Reminder ${reminderMinutes}m before`}
            </div>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 border-t-2 border-gray-100 bg-gray-50 space-y-4">
          {/* Adhan Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Enable Adhan</span>
            <button
              onClick={() => setAdhanEnabled(!adhanEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                adhanEnabled ? "bg-theme-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  adhanEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Adhan Sound Selection */}
          <Select
            label="Adhan Sound"
            value={selectedSound}
            onChange={(e) => setSelectedSound(e.target.value)}
            fullWidth
          >
            {prayer === "fajr" ? (
              <>
                {FAJR_ADHAN_SOUNDS.map((sound) => (
                  <option key={sound.id} value={sound.id}>
                    {sound.name}
                  </option>
                ))}
                <optgroup label="Regular Adhan">
                  {ADHAN_SOUNDS.map((sound) => (
                    <option key={sound.id} value={sound.id}>
                      {sound.name}
                    </option>
                  ))}
                </optgroup>
              </>
            ) : (
              ADHAN_SOUNDS.map((sound) => (
                <option key={sound.id} value={sound.id}>
                  {sound.name}
                </option>
              ))
            )}
          </Select>

          {/* Volume */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Volume: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-theme-primary"
            />
          </div>

          {/* Test Play */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTestPlay}
            leftIcon={isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          >
            {isPlaying ? "Stop" : "Test Play (10 sec)"}
          </Button>

          {/* Reminder Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Enable Reminder</span>
            <button
              onClick={() => setReminderEnabled(!reminderEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                reminderEnabled ? "bg-theme-primary" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  reminderEnabled ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {reminderEnabled && (
            <Select
              label="Remind before"
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(parseInt(e.target.value))}
              fullWidth
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </Select>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            isLoading={saveMutation.isPending}
            fullWidth
          >
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
