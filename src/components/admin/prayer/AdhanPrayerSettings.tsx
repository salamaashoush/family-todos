import { useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Volume2, Play, Square } from "lucide-react";
import { Button, Select, ToggleSwitch } from "../../shared";
import { saveAdhanSettings } from "../../../server/prayer";
import { PRAYER_NAMES, type PrayerName } from "../../../utils/prayerCalculations";
import { DEFAULT_ADHAN_URLS } from "../../../utils/audioManager";
import { ADHAN_SOUNDS, FAJR_ADHAN_SOUNDS } from "./constants";
import type { AdhanPrayerSettingsData } from "./types";
import { ChevronDownIcon } from "../../prayer/icons";

interface AdhanPrayerSettingsProps {
  prayer: PrayerName;
  settings?: AdhanPrayerSettingsData;
}

export function AdhanPrayerSettings({ prayer, settings }: AdhanPrayerSettingsProps) {
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
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            adhanEnabled ? "bg-theme-primary/10 text-theme-primary" : "bg-gray-100 text-gray-400"
          }`}>
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
        <ChevronDownIcon
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 border-t-2 border-gray-100 bg-gray-50 space-y-4">
          {/* Adhan Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Enable Adhan</span>
            <ToggleSwitch
              enabled={adhanEnabled}
              onChange={setAdhanEnabled}
              size="sm"
            />
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

          {/* Volume Slider */}
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

          {/* Test Play Button */}
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
            <ToggleSwitch
              enabled={reminderEnabled}
              onChange={setReminderEnabled}
              size="sm"
            />
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
