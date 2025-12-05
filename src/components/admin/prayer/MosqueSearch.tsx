import { useState, useCallback } from "react";
import { MapPin, Building2, Search, X } from "lucide-react";
import { Button, Input, Alert } from "../../shared";
import { searchMosques, searchMosquesByLocation, getMosquePrayerTimes } from "../../../server/prayer";
import type { MawaqitMosque, MawaqitPrayerTimesResponse } from "../../../utils/mawaqit";

interface MosqueSearchProps {
  selectedMosque: {
    uuid: string | null;
    name: string | null;
    address: string | null;
  };
  onSelectMosque: (mosque: MawaqitMosque) => void;
  onClearMosque: () => void;
  onLocationUpdate?: (lat: number, lng: number, city?: string, country?: string) => void;
}

export function MosqueSearch({
  selectedMosque,
  onSelectMosque,
  onClearMosque,
  onLocationUpdate,
}: MosqueSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MawaqitMosque[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mosquePrayerTimes, setMosquePrayerTimes] = useState<MawaqitPrayerTimesResponse | null>(null);

  // Load mosque prayer times when mosque is selected
  const loadMosquePrayerTimes = useCallback(async (uuid: string) => {
    try {
      const times = await getMosquePrayerTimes({ data: { uuid } });
      setMosquePrayerTimes(times);
    } catch (err) {
      console.error("Failed to load mosque prayer times:", err);
    }
  }, []);

  // Handle mosque search by query
  const handleSearch = useCallback(async () => {
    if (!searchQuery || searchQuery.length < 2) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const result = await searchMosques({ data: { query: searchQuery } });
      setSearchResults(result.mosques || []);
    } catch (err) {
      setSearchError("Failed to search mosques. Please try again.");
      console.error("Mosque search error:", err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Find nearby mosques using geolocation
  const handleFindNearby = useCallback(async () => {
    if (!navigator.geolocation) {
      setSearchError("Geolocation is not supported by your browser.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await searchMosquesByLocation({
            data: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          });
          setSearchResults(result.mosques || []);
        } catch (err) {
          setSearchError("Failed to find nearby mosques. Please try again.");
          console.error("Nearby mosque search error:", err);
        } finally {
          setIsSearching(false);
        }
      },
      (error) => {
        setIsSearching(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setSearchError("Location access denied. Please enable location or search by name.");
            break;
          case error.POSITION_UNAVAILABLE:
            setSearchError("Location unavailable. Please search by name.");
            break;
          case error.TIMEOUT:
            setSearchError("Location request timed out. Please try again.");
            break;
          default:
            setSearchError("Failed to get location. Please search by name.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Handle mosque selection
  const handleSelect = useCallback((mosque: MawaqitMosque) => {
    onSelectMosque(mosque);
    setSearchResults([]);
    setSearchQuery("");
    loadMosquePrayerTimes(mosque.uuid);

    // Update location if callback provided
    if (onLocationUpdate && mosque.latitude && mosque.longitude) {
      onLocationUpdate(
        mosque.latitude,
        mosque.longitude,
        mosque.city || undefined,
        mosque.country || undefined
      );
    }
  }, [onSelectMosque, onLocationUpdate, loadMosquePrayerTimes]);

  // Handle clearing mosque selection
  const handleClear = useCallback(() => {
    onClearMosque();
    setMosquePrayerTimes(null);
  }, [onClearMosque]);

  return (
    <div className="border-2 border-theme-primary/20 bg-theme-primary/5 rounded-xl p-4 space-y-4">
      <h4 className="font-semibold text-gray-800">Search for a Mosque</h4>
      <p className="text-sm text-gray-600">
        Search by mosque name, city, or address to get prayer times from Mawaqit.
      </p>

      {/* Selected Mosque Display */}
      {selectedMosque.uuid && selectedMosque.name && (
        <SelectedMosqueCard
          name={selectedMosque.name}
          address={selectedMosque.address}
          prayerTimes={mosquePrayerTimes}
          onClear={handleClear}
        />
      )}

      {/* Search Input */}
      {!selectedMosque.uuid && (
        <>
          <div className="flex flex-col gap-3">
            <Button
              variant="secondary"
              onClick={handleFindNearby}
              isLoading={isSearching}
              leftIcon={<MapPin className="w-4 h-4" />}
              fullWidth
            >
              Find Nearby Mosques
            </Button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or search by name</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search mosques..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching || searchQuery.length < 2}
                leftIcon={<Search className="w-4 h-4" />}
              >
                Search
              </Button>
            </div>
          </div>

          {searchError && <Alert variant="danger" message={searchError} />}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {searchResults.map((mosque) => (
                <MosqueSearchResultItem
                  key={mosque.uuid}
                  mosque={mosque}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !isSearching && (
            <p className="text-sm text-gray-500 text-center py-4">
              No mosques found. Try a different search term.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// Sub-components
interface SelectedMosqueCardProps {
  name: string;
  address: string | null;
  prayerTimes: MawaqitPrayerTimesResponse | null;
  onClear: () => void;
}

function SelectedMosqueCard({ name, address, prayerTimes, onClear }: SelectedMosqueCardProps) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-theme-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-theme-primary" />
          </div>
          <div>
            <div className="font-semibold text-gray-800">{name}</div>
            {address && <div className="text-sm text-gray-500">{address}</div>}
          </div>
        </div>
        <button
          onClick={onClear}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Remove mosque"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Prayer Times Preview */}
      {prayerTimes?.times && (
        <MosquePrayerTimesPreview times={prayerTimes} />
      )}
    </div>
  );
}

interface MosqueSearchResultItemProps {
  mosque: MawaqitMosque;
  onSelect: (mosque: MawaqitMosque) => void;
}

function MosqueSearchResultItem({ mosque, onSelect }: MosqueSearchResultItemProps) {
  return (
    <button
      onClick={() => onSelect(mosque)}
      className="w-full p-3 bg-white rounded-lg border border-gray-200 hover:border-theme-primary hover:bg-theme-primary/5 transition-all text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-gray-800">{mosque.name}</div>
        {mosque.proximity !== undefined && (
          <span className="text-xs bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded-full whitespace-nowrap">
            {mosque.proximity >= 1000
              ? `${(mosque.proximity / 1000).toFixed(1)} km`
              : `${Math.round(mosque.proximity)} m`}
          </span>
        )}
      </div>
      <div className="text-sm text-gray-500">
        {[mosque.address, mosque.city, mosque.country].filter(Boolean).join(", ")}
      </div>
      {mosque.times && mosque.times.length > 0 && (
        <div className="text-xs text-gray-400 mt-1">
          Today: Fajr {mosque.times[0]} | Dhuhr {mosque.times[2]} | Asr {mosque.times[3]} | Maghrib {mosque.times[4]} | Isha {mosque.times[5]}
        </div>
      )}
    </button>
  );
}

interface MosquePrayerTimesPreviewProps {
  times: MawaqitPrayerTimesResponse;
}

function MosquePrayerTimesPreview({ times }: MosquePrayerTimesPreviewProps) {
  const prayers = [
    { name: "Fajr", time: times.times[0], iqama: times.iqama?.[0] },
    { name: "Sunrise", time: times.shuruq, iqama: null },
    { name: "Dhuhr", time: times.times[1], iqama: times.iqama?.[1] },
    { name: "Asr", time: times.times[2], iqama: times.iqama?.[2] },
    { name: "Maghrib", time: times.times[3], iqama: times.iqama?.[3] },
    { name: "Isha", time: times.times[4], iqama: times.iqama?.[4] },
  ];

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="text-xs text-gray-500 mb-2">Today's Prayer Times (from mosque)</div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {prayers.map((prayer) => (
          <div key={prayer.name} className="text-center">
            <div className="text-xs text-gray-500">{prayer.name}</div>
            <div className="font-semibold text-sm">{prayer.time || "-"}</div>
            {prayer.iqama && (
              <div className="text-xs text-theme-primary">Iqama: {prayer.iqama}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
