/**
 * Qibla Direction Calculator
 * Calculates the direction to the Kaaba in Mecca from any location
 */

// Kaaba coordinates (Masjid al-Haram, Mecca)
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

export interface QiblaResult {
  direction: number; // Degrees from North (0-360)
  distance: number; // Distance in kilometers
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate the Qibla direction from a given location
 * Uses the great circle formula for accurate direction calculation
 *
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 * @returns QiblaResult with direction in degrees from North and distance in km
 */
export function calculateQiblaDirection(latitude: number, longitude: number): QiblaResult {
  const userLat = toRadians(latitude);
  const userLng = toRadians(longitude);
  const kaabaLat = toRadians(KAABA_LAT);
  const kaabaLng = toRadians(KAABA_LNG);

  // Calculate the difference in longitude
  const deltaLng = kaabaLng - userLng;

  // Calculate the bearing using the formula:
  // θ = atan2(sin(Δλ) × cos(φ2), cos(φ1) × sin(φ2) − sin(φ1) × cos(φ2) × cos(Δλ))
  const x = Math.sin(deltaLng) * Math.cos(kaabaLat);
  const y = Math.cos(userLat) * Math.sin(kaabaLat) -
            Math.sin(userLat) * Math.cos(kaabaLat) * Math.cos(deltaLng);

  let bearing = toDegrees(Math.atan2(x, y));

  // Normalize to 0-360 degrees
  bearing = (bearing + 360) % 360;

  // Calculate distance using Haversine formula
  const R = 6371; // Earth's radius in kilometers
  const dLat = kaabaLat - userLat;
  const dLng = deltaLng;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLat) * Math.cos(kaabaLat) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return {
    direction: Math.round(bearing * 10) / 10, // Round to 1 decimal place
    distance: Math.round(distance),
  };
}

/**
 * Get cardinal direction name from degrees
 */
export function getCardinalDirection(degrees: number): string {
  const directions = [
    { name: "N", min: 0, max: 22.5 },
    { name: "NNE", min: 22.5, max: 45 },
    { name: "NE", min: 45, max: 67.5 },
    { name: "ENE", min: 67.5, max: 90 },
    { name: "E", min: 90, max: 112.5 },
    { name: "ESE", min: 112.5, max: 135 },
    { name: "SE", min: 135, max: 157.5 },
    { name: "SSE", min: 157.5, max: 180 },
    { name: "S", min: 180, max: 202.5 },
    { name: "SSW", min: 202.5, max: 225 },
    { name: "SW", min: 225, max: 247.5 },
    { name: "WSW", min: 247.5, max: 270 },
    { name: "W", min: 270, max: 292.5 },
    { name: "WNW", min: 292.5, max: 315 },
    { name: "NW", min: 315, max: 337.5 },
    { name: "NNW", min: 337.5, max: 360 },
  ];

  const normalized = degrees % 360;
  const direction = directions.find(d => normalized >= d.min && normalized < d.max);
  return direction?.name || "N";
}

/**
 * Get full cardinal direction name
 */
export function getFullCardinalName(abbreviation: string): string {
  const names: Record<string, string> = {
    N: "North",
    NNE: "North-Northeast",
    NE: "Northeast",
    ENE: "East-Northeast",
    E: "East",
    ESE: "East-Southeast",
    SE: "Southeast",
    SSE: "South-Southeast",
    S: "South",
    SSW: "South-Southwest",
    SW: "Southwest",
    WSW: "West-Southwest",
    W: "West",
    WNW: "West-Northwest",
    NW: "Northwest",
    NNW: "North-Northwest",
  };
  return names[abbreviation] || abbreviation;
}
