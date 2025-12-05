import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Calculator, Monitor, Volume2, Building2 } from "lucide-react";
import {
  getPrayerSettings,
  savePrayerSettings,
  getAdhanSettings,
  getDefaultAdhanAudios,
  getMosquePrayerTimes,
} from "../../server/prayer";
import { useGeolocation, useTimezone } from "../../hooks/usePrayerTimes";
import {
  CALCULATION_METHOD_NAMES,
  getPrayersWithAdhan,
  calculatePrayerTimes,
} from "../../utils/prayerCalculations";
import {
  calculationMethodEnum,
  madhabEnum,
  highLatitudeRuleEnum,
  type CalculationMethodType,
  type MadhabType,
  type HighLatitudeRuleType,
  type PrayerSourceType,
} from "../../db/schema/prayer";
import { Button, Input, Select, Alert, SkeletonCard, ToggleSwitch } from "../shared";
import { MosqueSearch, AdhanPrayerSettings, PrayerTimesPreview, MosquePrayerTimesPreview } from "./prayer";
import type { MawaqitMosque } from "../../utils/mawaqit";

type SectionId = "location" | "calculation" | "display" | "adhan";

const SECTION_TABS: { id: SectionId; label: string; icon: typeof MapPin }[] = [
  { id: "location", label: "Location", icon: MapPin },
  { id: "calculation", label: "Calculation", icon: Calculator },
  { id: "display", label: "Display", icon: Monitor },
  { id: "adhan", label: "Adhan Audio", icon: Volume2 },
];

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

  // Prefetch default audios (may not be used but good to have)
  useQuery({
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

  // Prayer source (calculated or mosque-based)
  const [prayerSource, setPrayerSource] = useState<PrayerSourceType>("calculated");
  const [mosqueUuid, setMosqueUuid] = useState<string | null>(null);
  const [mosqueName, setMosqueName] = useState<string | null>(null);
  const [mosqueAddress, setMosqueAddress] = useState<string | null>(null);

  // Active section
  const [activeSection, setActiveSection] = useState<SectionId>("location");

  // Fetch mosque prayer times when mosque is selected
  const { data: mosquePrayerTimesData } = useQuery({
    queryKey: ["mosque-prayer-times", mosqueUuid],
    queryFn: () => getMosquePrayerTimes({ data: { uuid: mosqueUuid! } }),
    enabled: !!mosqueUuid && prayerSource === "mosque",
  });

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
      setPrayerSource((settings.prayerSource as PrayerSourceType) || "calculated");
      setMosqueUuid(settings.mosqueUuid || null);
      setMosqueName(settings.mosqueName || null);
      setMosqueAddress(settings.mosqueAddress || null);
    } else if (detectedTimezone) {
      setTimezone(detectedTimezone);
    }
  }, [settings, detectedTimezone]);

  // Apply geolocation when received
  useEffect(() => {
    if (location) {
      setLatitude(location.latitude.toFixed(7));
      setLongitude(location.longitude.toFixed(7));
      if (location.city) setCity(location.city);
      if (location.country) setCountry(location.country);
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

  // Handle mosque selection
  const handleSelectMosque = useCallback((mosque: MawaqitMosque) => {
    setMosqueUuid(mosque.uuid);
    setMosqueName(mosque.name);
    setMosqueAddress([mosque.address, mosque.city, mosque.country].filter(Boolean).join(", ") || null);
  }, []);

  const handleClearMosque = useCallback(() => {
    setMosqueUuid(null);
    setMosqueName(null);
    setMosqueAddress(null);
  }, []);

  const handleMosqueLocationUpdate = useCallback((lat: number, lng: number, mosqueCity?: string, mosqueCountry?: string) => {
    setLatitude(lat.toFixed(7));
    setLongitude(lng.toFixed(7));
    if (mosqueCity) setCity(mosqueCity);
    if (mosqueCountry) setCountry(mosqueCountry);
  }, []);

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
        prayerSource,
        mosqueUuid,
        mosqueName,
        mosqueAddress,
      },
    });
  }, [
    latitude, longitude, timezone, city, country,
    calculationMethod, madhab, highLatitudeRule,
    fajrAdjustment, sunriseAdjustment, dhuhrAdjustment,
    asrAdjustment, maghribAdjustment, ishaAdjustment,
    isEnabled, showFloatingButton, fullscreenAdhanEnabled,
    prayerSource, mosqueUuid, mosqueName, mosqueAddress,
    saveMutation,
  ]);

  // Preview prayer times
  const previewTimes = latitude && longitude && !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude))
    ? calculatePrayerTimes({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        date: new Date(),
        method: calculationMethod,
        madhab,
        highLatitudeRule,
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Prayer Times</h2>
          <ToggleSwitch enabled={isEnabled} onChange={setIsEnabled} size="lg" />
        </div>
        <p className="text-sm text-gray-600">
          Configure Islamic prayer times for your family board
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {SECTION_TABS.map((section) => {
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
        <LocationSection
          prayerSource={prayerSource}
          setPrayerSource={setPrayerSource}
          selectedMosque={{ uuid: mosqueUuid, name: mosqueName, address: mosqueAddress }}
          onSelectMosque={handleSelectMosque}
          onClearMosque={handleClearMosque}
          onMosqueLocationUpdate={handleMosqueLocationUpdate}
          latitude={latitude}
          setLatitude={setLatitude}
          longitude={longitude}
          setLongitude={setLongitude}
          city={city}
          setCity={setCity}
          country={country}
          setCountry={setCountry}
          timezone={timezone}
          setTimezone={setTimezone}
          detectedTimezone={detectedTimezone}
          geoSupported={geoSupported}
          locationLoading={locationLoading}
          locationError={locationError}
          requestLocation={requestLocation}
        />
      )}

      {/* Calculation Section */}
      {activeSection === "calculation" && (
        <CalculationSection
          calculationMethod={calculationMethod}
          setCalculationMethod={setCalculationMethod}
          madhab={madhab}
          setMadhab={setMadhab}
          highLatitudeRule={highLatitudeRule}
          setHighLatitudeRule={setHighLatitudeRule}
          adjustments={{
            fajr: fajrAdjustment,
            sunrise: sunriseAdjustment,
            dhuhr: dhuhrAdjustment,
            asr: asrAdjustment,
            maghrib: maghribAdjustment,
            isha: ishaAdjustment,
          }}
          setAdjustments={{
            fajr: setFajrAdjustment,
            sunrise: setSunriseAdjustment,
            dhuhr: setDhuhrAdjustment,
            asr: setAsrAdjustment,
            maghrib: setMaghribAdjustment,
            isha: setIshaAdjustment,
          }}
        />
      )}

      {/* Display Section */}
      {activeSection === "display" && (
        <DisplaySection
          showFloatingButton={showFloatingButton}
          setShowFloatingButton={setShowFloatingButton}
          fullscreenAdhanEnabled={fullscreenAdhanEnabled}
          setFullscreenAdhanEnabled={setFullscreenAdhanEnabled}
        />
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
      {prayerSource === "calculated" && previewTimes && (
        <PrayerTimesPreview times={previewTimes} timezone={timezone} />
      )}
      {prayerSource === "mosque" && mosquePrayerTimesData && (
        <MosquePrayerTimesPreview times={mosquePrayerTimesData} mosqueName={mosqueName} />
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

// Location Section Component
interface LocationSectionProps {
  prayerSource: PrayerSourceType;
  setPrayerSource: (source: PrayerSourceType) => void;
  selectedMosque: { uuid: string | null; name: string | null; address: string | null };
  onSelectMosque: (mosque: MawaqitMosque) => void;
  onClearMosque: () => void;
  onMosqueLocationUpdate: (lat: number, lng: number, city?: string, country?: string) => void;
  latitude: string;
  setLatitude: (val: string) => void;
  longitude: string;
  setLongitude: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  country: string;
  setCountry: (val: string) => void;
  timezone: string;
  setTimezone: (val: string) => void;
  detectedTimezone: string | null;
  geoSupported: boolean;
  locationLoading: boolean;
  locationError: string | null;
  requestLocation: () => void;
}

function LocationSection({
  prayerSource,
  setPrayerSource,
  selectedMosque,
  onSelectMosque,
  onClearMosque,
  onMosqueLocationUpdate,
  latitude,
  setLatitude,
  longitude,
  setLongitude,
  city,
  setCity,
  country,
  setCountry,
  timezone,
  setTimezone,
  detectedTimezone,
  geoSupported,
  locationLoading,
  locationError,
  requestLocation,
}: LocationSectionProps) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-6">
      {/* Prayer Source Toggle */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">Prayer Times Source</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SourceOptionButton
            selected={prayerSource === "calculated"}
            onClick={() => setPrayerSource("calculated")}
            icon={<Calculator className="w-5 h-5" />}
            title="Calculated"
            subtitle="Based on coordinates"
          />
          <SourceOptionButton
            selected={prayerSource === "mosque"}
            onClick={() => setPrayerSource("mosque")}
            icon={<Building2 className="w-5 h-5" />}
            title="Mosque (Mawaqit)"
            subtitle="From local mosque"
          />
        </div>
      </div>

      {/* Mosque Search */}
      {prayerSource === "mosque" && (
        <MosqueSearch
          selectedMosque={selectedMosque}
          onSelectMosque={onSelectMosque}
          onClearMosque={onClearMosque}
          onLocationUpdate={onMosqueLocationUpdate}
        />
      )}

      {/* Location Settings */}
      <div className={prayerSource === "mosque" ? "opacity-75" : ""}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            {prayerSource === "mosque" ? "Mosque Location" : "Location Settings"}
          </h3>
          {geoSupported && prayerSource === "calculated" && (
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
        {prayerSource === "mosque" && (
          <p className="text-sm text-gray-500 mb-4">
            Location is set automatically from the selected mosque.
          </p>
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
  );
}

// Source Option Button
interface SourceOptionButtonProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

function SourceOptionButton({ selected, onClick, icon, title, subtitle }: SourceOptionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? "border-theme-primary bg-theme-primary/5"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          selected ? "bg-theme-primary text-white" : "bg-gray-100"
        }`}>
          {icon}
        </div>
        <div>
          <div className="font-semibold text-gray-800">{title}</div>
          <div className="text-sm text-gray-500">{subtitle}</div>
        </div>
      </div>
    </button>
  );
}

// Calculation Section Component
interface CalculationSectionProps {
  calculationMethod: CalculationMethodType;
  setCalculationMethod: (method: CalculationMethodType) => void;
  madhab: MadhabType;
  setMadhab: (madhab: MadhabType) => void;
  highLatitudeRule: HighLatitudeRuleType;
  setHighLatitudeRule: (rule: HighLatitudeRuleType) => void;
  adjustments: Record<string, number>;
  setAdjustments: Record<string, (val: number) => void>;
}

function CalculationSection({
  calculationMethod,
  setCalculationMethod,
  madhab,
  setMadhab,
  highLatitudeRule,
  setHighLatitudeRule,
  adjustments,
  setAdjustments,
}: CalculationSectionProps) {
  return (
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
          {["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].map((prayer) => (
            <Input
              key={prayer}
              label={prayer.charAt(0).toUpperCase() + prayer.slice(1)}
              type="number"
              value={adjustments[prayer]}
              onChange={(e) => setAdjustments[prayer](parseInt(e.target.value) || 0)}
              min={-60}
              max={60}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Display Section Component
interface DisplaySectionProps {
  showFloatingButton: boolean;
  setShowFloatingButton: (val: boolean) => void;
  fullscreenAdhanEnabled: boolean;
  setFullscreenAdhanEnabled: (val: boolean) => void;
}

function DisplaySection({
  showFloatingButton,
  setShowFloatingButton,
  fullscreenAdhanEnabled,
  setFullscreenAdhanEnabled,
}: DisplaySectionProps) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 space-y-6">
      <h3 className="text-lg font-bold text-gray-800">Display Settings</h3>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-800">Show Floating Button</h4>
          <p className="text-sm text-gray-600">Display prayer countdown button on the family board</p>
        </div>
        <div className="flex-shrink-0 pt-0.5">
          <ToggleSwitch enabled={showFloatingButton} onChange={setShowFloatingButton} size="lg" />
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-800">Fullscreen Adhan</h4>
          <p className="text-sm text-gray-600">Take over the board with fullscreen adhan view at prayer time</p>
        </div>
        <div className="flex-shrink-0 pt-0.5">
          <ToggleSwitch enabled={fullscreenAdhanEnabled} onChange={setFullscreenAdhanEnabled} size="lg" />
        </div>
      </div>

      {/* Test Fullscreen Info */}
      <div className="pt-4 border-t-2 border-gray-100">
        <h4 className="font-semibold text-gray-800 mb-2">Test Fullscreen Adhan</h4>
        <p className="text-sm text-gray-600 mb-3">
          Open the family board and click the test button in the prayer panel to test the fullscreen adhan view.
        </p>
        <Alert
          variant="info"
          title="How to test"
          message="1. Open your family board in another tab. 2. Click on the prayer times floating button. 3. Click 'Test Fullscreen Adhan' in the panel."
        />
      </div>
    </div>
  );
}
