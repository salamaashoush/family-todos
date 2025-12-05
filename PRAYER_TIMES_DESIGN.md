# Islamic Prayer Times Feature - Design Plan

## Overview

This document outlines the implementation plan for adding Islamic prayer times functionality to the Family Board application. The feature will provide accurate prayer time calculations, audio adhan playback via Web Audio API, full-screen adhan view during prayer times, configurable reminders, and comprehensive admin settings.

## Research Summary

### Prayer Time Calculation Libraries

**Recommended: [adhan-js](https://github.com/batoulapps/adhan-js)** (MIT License)
- High precision astronomical calculations from "Astronomical Algorithms" by Jean Meeus
- Recommended by US Naval Observatory and NOAA
- Works in both browser and Node.js
- NPM package: `adhan`
- Supports all major calculation methods and madhabs

**Calculation Methods Available:**
1. Muslim World League (MWL) - Fajr 18deg, Isha 17deg
2. Egyptian General Authority of Survey - Fajr 19.5deg, Isha 17.5deg
3. University of Islamic Sciences, Karachi - Fajr 18deg, Isha 18deg
4. Umm al-Qura University, Makkah - Fajr 18.5deg, Isha 90min after Maghrib
5. Islamic Society of North America (ISNA) - Fajr 15deg, Isha 15deg
6. MoonsightingCommittee
7. Dubai
8. Qatar
9. Kuwait
10. Singapore
11. Turkey
12. Tehran (Shia)
13. Custom method support

**Madhab Options:**
- Shafi (default) - shadow equals length
- Hanafi - shadow equals twice the length

**High Latitude Rules:**
- MiddleOfTheNight
- SeventhOfTheNight
- TwilightAngle (recommended for 48deg+ latitudes)

### Audio Playback Strategy

**Web Audio API Approach:**
- Use `AudioContext` for precise timing
- Pre-load audio buffers for instant playback
- Schedule playback with `source.start(audioContext.currentTime + offset)`
- Fall back to `HTMLAudioElement` for simpler cases

**Audio Sources:**
- [AlAdhan.com](https://aladhan.com/download-adhans) - Official adhan MP3 downloads
- [Internet Archive](https://archive.org/details/azan-sounds) - Free adhan sounds
- Allow custom audio file uploads

### Notification Strategy

**Client-Side Scheduling:**
- Use `setInterval` to check prayer times every 30 seconds
- Compare current time against next prayer time
- Trigger adhan/reminder when threshold reached
- Service Worker for background notifications (when supported)

**Server-Side Support:**
- Store prayer settings per family
- Calculate prayer times server-side for consistency
- Optional: Push notifications via web-push (future enhancement)

---

## Database Schema

### New Tables

```sql
-- Prayer settings per family
CREATE TABLE prayer_settings (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  -- Location settings
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  timezone VARCHAR(50) NOT NULL, -- e.g., "America/New_York"
  city VARCHAR(255),
  country VARCHAR(100),

  -- Calculation settings
  calculation_method VARCHAR(50) NOT NULL DEFAULT 'MuslimWorldLeague',
  madhab VARCHAR(20) NOT NULL DEFAULT 'Shafi', -- Shafi or Hanafi
  high_latitude_rule VARCHAR(30) DEFAULT 'MiddleOfTheNight',

  -- Manual adjustments (minutes)
  fajr_adjustment INTEGER DEFAULT 0,
  sunrise_adjustment INTEGER DEFAULT 0,
  dhuhr_adjustment INTEGER DEFAULT 0,
  asr_adjustment INTEGER DEFAULT 0,
  maghrib_adjustment INTEGER DEFAULT 0,
  isha_adjustment INTEGER DEFAULT 0,

  -- Feature toggles
  is_enabled BOOLEAN DEFAULT true,
  show_floating_button BOOLEAN DEFAULT true,
  fullscreen_adhan_enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(family_id)
);

-- Adhan audio settings per prayer per family
CREATE TABLE prayer_adhan_settings (
  id SERIAL PRIMARY KEY,
  family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  prayer_name VARCHAR(20) NOT NULL, -- fajr, dhuhr, asr, maghrib, isha

  -- Audio settings
  adhan_enabled BOOLEAN DEFAULT true,
  adhan_audio_url TEXT, -- URL to audio file (null = use default)
  adhan_volume DECIMAL(3, 2) DEFAULT 1.0, -- 0.0 to 1.0
  use_fajr_adhan BOOLEAN DEFAULT false, -- Fajr has different adhan

  -- Reminder settings
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_minutes_before INTEGER DEFAULT 15,
  reminder_sound_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

  UNIQUE(family_id, prayer_name)
);

-- Default adhan audio files (global, managed by super admin)
CREATE TABLE default_adhan_audio (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  is_fajr_adhan BOOLEAN DEFAULT false, -- Special Fajr adhan
  is_default BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX idx_prayer_settings_family ON prayer_settings(family_id);
CREATE INDEX idx_prayer_adhan_settings_family ON prayer_adhan_settings(family_id);
```

---

## Component Architecture

### New Components

```
src/
  components/
    prayer/
      PrayerTimesFloatingButton.tsx    -- FAB showing next prayer countdown
      PrayerTimesPanel.tsx             -- Expandable panel with all times
      PrayerTimeCard.tsx               -- Individual prayer time display
      AdhanFullscreenView.tsx          -- Full-screen adhan overlay
      AdhanAudioPlayer.tsx             -- Web Audio API wrapper
      PrayerSettingsForm.tsx           -- Location/method configuration
      AdhanSettingsForm.tsx            -- Per-prayer audio settings
      PrayerTimesContext.tsx           -- React context for prayer state

    admin/
      PrayerTimesTab.tsx               -- Admin tab for prayer settings

  hooks/
    usePrayerTimes.ts                  -- Calculate prayer times
    useAdhanScheduler.ts               -- Schedule adhan playback
    usePrayerReminders.ts              -- Handle reminder notifications
    useGeolocation.ts                  -- Get user location

  server/
    prayer.ts                          -- Server functions for prayer settings

  db/schema/
    prayer.ts                          -- Drizzle schema definitions

  utils/
    prayerCalculations.ts              -- Wrapper around adhan-js
    audioManager.ts                    -- Web Audio API utilities
```

---

## Feature Implementation Details

### 1. Prayer Times Calculation

```typescript
// src/utils/prayerCalculations.ts
import { Coordinates, CalculationMethod, PrayerTimes, Prayer, Madhab } from 'adhan';

interface PrayerTimesConfig {
  latitude: number;
  longitude: number;
  date: Date;
  method: string;
  madhab: 'Shafi' | 'Hanafi';
  adjustments?: {
    fajr?: number;
    sunrise?: number;
    dhuhr?: number;
    asr?: number;
    maghrib?: number;
    isha?: number;
  };
}

export function calculatePrayerTimes(config: PrayerTimesConfig) {
  const coordinates = new Coordinates(config.latitude, config.longitude);
  const params = getCalculationParams(config.method);
  params.madhab = config.madhab === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;

  // Apply manual adjustments
  if (config.adjustments) {
    params.adjustments.fajr = config.adjustments.fajr || 0;
    // ... etc
  }

  const prayerTimes = new PrayerTimes(coordinates, config.date, params);

  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
    currentPrayer: prayerTimes.currentPrayer(),
    nextPrayer: prayerTimes.nextPrayer(),
    timeForPrayer: (prayer: Prayer) => prayerTimes.timeForPrayer(prayer),
  };
}
```

### 2. Floating Button Component

```typescript
// src/components/prayer/PrayerTimesFloatingButton.tsx
// Shows:
// - Next prayer name
// - Countdown timer to next prayer
// - Click to expand full prayer panel
// - Animated pulse when prayer time is near (< 15 min)
// - Green indicator when adhan is playing
```

### 3. Prayer Times Panel

```typescript
// src/components/prayer/PrayerTimesPanel.tsx
// Expandable panel showing:
// - All 5 prayer times for today
// - Current prayer highlighted
// - Next prayer countdown
// - Hijri date (optional)
// - Qibla direction (optional, future)
// - Settings shortcut (for admins)
```

### 4. Fullscreen Adhan View

```typescript
// src/components/prayer/AdhanFullscreenView.tsx
// Full-screen overlay that:
// - Takes over the entire family board
// - Shows prayer name in Arabic and English
// - Displays beautiful Islamic pattern/image background
// - Shows animated waveform during audio playback
// - Auto-dismisses after adhan completes (or manual dismiss)
// - Includes mute/skip controls
```

### 5. Web Audio API Implementation

```typescript
// src/utils/audioManager.ts
class AdhanAudioManager {
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private currentSource: AudioBufferSourceNode | null = null;

  async init() {
    this.audioContext = new AudioContext();
  }

  async preloadAudio(url: string, key: string) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    this.audioBuffers.set(key, audioBuffer);
  }

  play(key: string, volume: number = 1.0): Promise<void> {
    return new Promise((resolve) => {
      const buffer = this.audioBuffers.get(key);
      if (!buffer || !this.audioContext) return resolve();

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.onended = () => resolve();
      source.start(0);

      this.currentSource = source;
    });
  }

  stop() {
    this.currentSource?.stop();
    this.currentSource = null;
  }
}
```

### 6. Prayer Scheduler Hook

```typescript
// src/hooks/useAdhanScheduler.ts
export function useAdhanScheduler(prayerSettings: PrayerSettings) {
  const [isAdhanPlaying, setIsAdhanPlaying] = useState(false);
  const [currentPrayer, setCurrentPrayer] = useState<string | null>(null);
  const audioManager = useRef<AdhanAudioManager>(null);

  useEffect(() => {
    // Check every 30 seconds
    const interval = setInterval(() => {
      const now = new Date();
      const times = calculatePrayerTimes(prayerSettings);

      // Check if current time matches any prayer time (within 1 minute)
      for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
        const prayerTime = times[prayer];
        const diff = Math.abs(now.getTime() - prayerTime.getTime());

        if (diff < 60000 && !isAdhanPlaying) {
          triggerAdhan(prayer);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [prayerSettings]);

  const triggerAdhan = async (prayer: string) => {
    setIsAdhanPlaying(true);
    setCurrentPrayer(prayer);
    await audioManager.current?.play(prayer);
    setIsAdhanPlaying(false);
    setCurrentPrayer(null);
  };

  return { isAdhanPlaying, currentPrayer, triggerAdhan };
}
```

### 7. Admin Settings Tab

```typescript
// src/components/admin/PrayerTimesTab.tsx
// Features:
// - Location picker (map or search)
// - Geolocation button to auto-detect
// - Calculation method dropdown
// - Madhab selection (Shafi/Hanafi)
// - High latitude rule selection
// - Manual time adjustments per prayer
// - Enable/disable toggle
// - Per-prayer adhan settings:
//   - Enable/disable
//   - Select audio from presets or upload custom
//   - Volume slider
//   - Reminder enable/disable
//   - Reminder minutes before
```

---

## User Interface Flow

### Public Family Board

1. **Floating Button (Always Visible)**
   - Shows in bottom-right corner (configurable position)
   - Displays next prayer name and countdown
   - Pulses/glows when prayer is approaching (< 15 min)
   - Click to expand Prayer Times Panel

2. **Prayer Times Panel**
   - Slides up from floating button
   - Shows all 5 daily prayers with times
   - Current/next prayer highlighted
   - Today's date (Gregorian and Hijri)
   - Settings gear icon (visible to admins only)

3. **Adhan Fullscreen View**
   - Automatically triggered at prayer time (if enabled)
   - Covers the entire family board
   - Beautiful Islamic design with prayer name
   - Audio plays automatically
   - Controls: Mute, Skip, Volume
   - Auto-dismiss after audio ends
   - Can be manually dismissed

4. **Pre-Prayer Reminder**
   - Optional notification before prayer
   - Configurable minutes before (5, 10, 15, 30)
   - Subtle toast notification
   - Optional reminder sound

### Admin Panel

1. **New "Prayer Times" Tab**
   - Location Section
     - Map picker or search box
     - "Use My Location" button
     - Manual lat/lng input
     - Timezone selector

   - Calculation Section
     - Method dropdown with descriptions
     - Madhab selection
     - High latitude rule (for northern locations)
     - Manual adjustments (expandable)

   - Display Section
     - Enable/disable prayer times feature
     - Show/hide floating button
     - Enable/disable fullscreen adhan

   - Audio Section (per prayer)
     - Enable/disable adhan for each prayer
     - Select from preset adhans
     - Upload custom audio
     - Volume control
     - Test play button

   - Reminder Section
     - Enable/disable reminders
     - Minutes before setting
     - Sound enable/disable

---

## Real-Time Updates

### New SSE Event Types

```typescript
// Extend existing RealtimeEvent type
type PrayerRealtimeEvent =
  | { type: 'prayer_settings_updated'; familyId: number }
  | { type: 'adhan_triggered'; prayer: string; familyId: number }
  | { type: 'adhan_dismissed'; familyId: number };
```

### Synchronization

- When admin updates settings, broadcast to all connected clients
- All clients recalculate prayer times with new settings
- Adhan trigger can be synchronized across all family boards

---

## Server Functions

```typescript
// src/server/prayer.ts

// Get prayer settings for a family
export const getPrayerSettings = createServerFn({ method: 'GET' })
  .validator(z.object({ familyId: z.number().optional() }))
  .handler(async ({ data }) => { /* ... */ });

// Update prayer settings
export const updatePrayerSettings = createServerFn({ method: 'POST' })
  .validator(prayerSettingsSchema)
  .handler(async ({ data }) => { /* ... */ });

// Get adhan settings for all prayers
export const getAdhanSettings = createServerFn({ method: 'GET' })
  .handler(async () => { /* ... */ });

// Update adhan settings for a specific prayer
export const updateAdhanSettings = createServerFn({ method: 'POST' })
  .validator(adhanSettingsSchema)
  .handler(async ({ data }) => { /* ... */ });

// Get default adhan audio options
export const getDefaultAdhanAudios = createServerFn({ method: 'GET' })
  .handler(async () => { /* ... */ });

// Calculate prayer times (server-side for consistency)
export const calculateServerPrayerTimes = createServerFn({ method: 'GET' })
  .validator(z.object({ date: z.string().optional() }))
  .handler(async ({ data }) => { /* ... */ });
```

---

## Implementation Phases

### Phase 1: Core Infrastructure
1. Install `adhan` npm package
2. Create database schema and migrations
3. Implement server functions for CRUD operations
4. Create prayer calculation utility wrapper
5. Add "Prayer Times" tab to admin panel

### Phase 2: Admin Settings
1. Location picker component (with geolocation)
2. Calculation method selector
3. Manual adjustment controls
4. Basic settings form and save functionality
5. Settings validation

### Phase 3: Prayer Display
1. Create PrayerTimesContext for state management
2. Implement usePrayerTimes hook
3. Build PrayerTimesFloatingButton
4. Build PrayerTimesPanel
5. Style components with theme support

### Phase 4: Adhan Audio
1. Implement AdhanAudioManager (Web Audio API)
2. Create per-prayer audio settings UI
3. Add preset adhan audio files
4. Implement custom audio upload
5. Audio preloading strategy

### Phase 5: Fullscreen Adhan
1. Design AdhanFullscreenView component
2. Implement adhan scheduler hook
3. Add fullscreen overlay logic
4. Create animation and transitions
5. Test across devices

### Phase 6: Reminders
1. Implement reminder scheduling
2. Add toast notifications for reminders
3. Service worker integration (optional)
4. Browser notification permission handling

### Phase 7: Polish and Integration
1. Add to public board routes
2. SSE integration for settings sync
3. Mobile responsiveness
4. Performance optimization (audio preloading)
5. Testing and bug fixes

---

## Dependencies

```json
{
  "dependencies": {
    "adhan": "^4.4.3"
  }
}
```

---

## Security Considerations

1. **Audio Files**: Validate uploaded audio files (type, size, duration)
2. **Location Data**: Ensure location is only stored per-family, not leaked
3. **Permission Checks**: All prayer settings mutations require admin role
4. **Input Validation**: Strict Zod schemas for all inputs
5. **Rate Limiting**: Consider rate limiting geolocation API calls

---

## Future Enhancements

1. **Hijri Calendar Display**: Show Islamic date alongside Gregorian
2. **Qibla Direction**: Compass showing direction to Mecca
3. **Monthly Prayer Calendar**: View/print prayer times for the month
4. **Push Notifications**: Server-side push for reminders when app is closed
5. **Multiple Location Presets**: Save multiple locations (home, work, mosque)
6. **Mosque Integration**: Import times from local mosques
7. **Fasting Times**: Suhoor and Iftar times during Ramadan
8. **Prayer Tracking**: Optional feature to log completed prayers

---

## Sources

- [adhan-js GitHub](https://github.com/batoulapps/adhan-js) - Prayer calculation library
- [AlAdhan API](https://aladhan.com/prayer-times-api) - Prayer times API and calculation methods
- [AlAdhan Calculation Methods](https://aladhan.com/calculation-methods) - Method details
- [PrayTimes.org](https://praytimes.org/manual) - Alternative calculation library
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Audio playback
- [MDN AudioScheduledSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/start) - Scheduled audio
- [Web Audio Scheduling](https://sonoport.github.io/web-audio-clock.html) - Best practices
- [AlAdhan Download Adhans](https://aladhan.com/download-adhans) - Adhan audio files
- [Internet Archive Athan Sounds](https://archive.org/details/azan-sounds) - Free adhan audio
- [Notification Triggers API](https://web.dev/notification-triggers/) - Scheduled notifications
