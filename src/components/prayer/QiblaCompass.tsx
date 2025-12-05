import { useState, useEffect, useMemo } from "react";
import {
  calculateQiblaDirection,
  getCardinalDirection,
  getFullCardinalName,
} from "../../utils/qiblaDirection";

interface QiblaCompassProps {
  latitude: number;
  longitude: number;
  showDistance?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function QiblaCompass({
  latitude,
  longitude,
  showDistance = true,
  size = "md",
  className = "",
}: QiblaCompassProps) {
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [hasCompassSupport, setHasCompassSupport] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const qiblaResult = useMemo(
    () => calculateQiblaDirection(latitude, longitude),
    [latitude, longitude]
  );

  const cardinalAbbr = useMemo(
    () => getCardinalDirection(qiblaResult.direction),
    [qiblaResult.direction]
  );

  const cardinalFull = useMemo(
    () => getFullCardinalName(cardinalAbbr),
    [cardinalAbbr]
  );

  // Request device orientation permission and listen for updates
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // Use webkitCompassHeading for iOS, alpha for others
      const heading =
        (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
          .webkitCompassHeading ?? event.alpha;
      if (heading !== null && heading !== undefined) {
        setDeviceHeading(heading);
        setHasCompassSupport(true);
      }
    };

    const requestPermission = async () => {
      // iOS 13+ requires permission
      const DeviceOrientationEventTyped = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      };

      if (typeof DeviceOrientationEventTyped.requestPermission === "function") {
        try {
          const permission = await DeviceOrientationEventTyped.requestPermission();
          if (permission === "granted") {
            window.addEventListener("deviceorientation", handleOrientation, true);
          } else {
            setPermissionDenied(true);
          }
        } catch {
          setPermissionDenied(true);
        }
      } else {
        // Non-iOS devices
        window.addEventListener("deviceorientation", handleOrientation, true);
      }
    };

    requestPermission();

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  // Calculate the rotation needed to point to Qibla
  const qiblaRotation = useMemo(() => {
    if (deviceHeading === null) {
      return qiblaResult.direction;
    }
    // Adjust Qibla direction relative to device heading
    return qiblaResult.direction - deviceHeading;
  }, [qiblaResult.direction, deviceHeading]);

  const sizeClasses = {
    sm: "w-32 h-32",
    md: "w-48 h-48",
    lg: "w-64 h-64",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Compass */}
      <div
        className={`
          relative ${sizeClasses[size]}
          bg-gradient-to-br from-gray-100 to-gray-200
          rounded-full shadow-lg
          border-4 border-white
        `}
      >
        {/* Compass Ring */}
        <div className="absolute inset-2 rounded-full border-2 border-gray-300" />

        {/* Cardinal Directions */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="absolute top-3 text-xs font-bold text-gray-600">N</span>
          <span className="absolute bottom-3 text-xs font-bold text-gray-400">S</span>
          <span className="absolute left-3 text-xs font-bold text-gray-400">W</span>
          <span className="absolute right-3 text-xs font-bold text-gray-400">E</span>
        </div>

        {/* Qibla Arrow */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
          style={{ transform: `rotate(${qiblaRotation}deg)` }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-3/4 h-3/4"
              viewBox="0 0 100 100"
              fill="none"
            >
              {/* Arrow pointing up (to Qibla) */}
              <path
                d="M50 10L60 40H55V90H45V40H40L50 10Z"
                className="fill-theme-primary"
              />
              {/* Kaaba icon at arrow tip */}
              <rect
                x="45"
                y="5"
                width="10"
                height="10"
                rx="1"
                className="fill-gray-800"
              />
            </svg>
          </div>
        </div>

        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 bg-white rounded-full shadow-md border-2 border-gray-300" />
        </div>
      </div>

      {/* Info */}
      <div className={`text-center space-y-1 ${textSizeClasses[size]}`}>
        <div className="font-bold text-gray-800">
          {qiblaResult.direction.toFixed(1)}
        </div>
        <div className="text-gray-600">
          {cardinalFull} ({cardinalAbbr})
        </div>
        {showDistance && (
          <div className="text-gray-500">
            {qiblaResult.distance.toLocaleString()} km to Mecca
          </div>
        )}
        {hasCompassSupport && deviceHeading !== null && (
          <div className="text-xs text-emerald-600 flex items-center justify-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live Compass Active
          </div>
        )}
        {permissionDenied && (
          <div className="text-xs text-amber-600">
            Compass permission denied
          </div>
        )}
        {!hasCompassSupport && !permissionDenied && (
          <div className="text-xs text-gray-400">
            Static direction (no compass sensor)
          </div>
        )}
      </div>
    </div>
  );
}

