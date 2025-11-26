import { useSession } from "@tanstack/react-start/server";

// Validate SESSION_SECRET at module load time
const SESSION_SECRET = process.env.SESSION_SECRET;

// List of known weak/default secrets that should never be used
const WEAK_SECRETS = [
  "change-this-secret-to-at-least-32-characters-long",
  "change-this-to-a-random-secret-at-least-32-characters-long-for-production",
  "secret",
  "password",
  "changeme",
];

function validateSessionSecret(): string {
  if (!SESSION_SECRET) {
    throw new Error(
      "SECURITY ERROR: SESSION_SECRET environment variable is not set. " +
        "Generate a secure secret with: openssl rand -hex 32"
    );
  }

  if (SESSION_SECRET.length < 32) {
    throw new Error(
      "SECURITY ERROR: SESSION_SECRET must be at least 32 characters long. " +
        "Generate a secure secret with: openssl rand -hex 32"
    );
  }

  const lowerSecret = SESSION_SECRET.toLowerCase();
  for (const weak of WEAK_SECRETS) {
    if (lowerSecret.includes(weak.toLowerCase())) {
      throw new Error(
        "SECURITY ERROR: SESSION_SECRET appears to be a default/weak value. " +
          "Generate a secure secret with: openssl rand -hex 32"
      );
    }
  }

  return SESSION_SECRET;
}

// Validate on module load - will throw if invalid
const VALIDATED_SESSION_SECRET = validateSessionSecret();

type UserRole = "owner" | "admin" | "member";

type SessionData = {
  username?: string;
  adminUserId?: number;
  isAuthenticated?: boolean;
  familyIds?: number[];
  currentFamilyId?: number;
  currentFamilyRole?: UserRole;
};

// Use explicit environment variable for secure cookies, not just NODE_ENV
const isProduction = process.env.NODE_ENV === "production";
const forceSecureCookies = process.env.SECURE_COOKIES === "true";

export function useAppSession() {
  return useSession<SessionData>({
    name: "admin-session",
    password: VALIDATED_SESSION_SECRET,
    cookie: {
      secure: isProduction || forceSecureCookies,
      sameSite: "strict", // Upgraded from "lax" for better CSRF protection
      httpOnly: true,
      maxAge: 60 * 60 * 24, // Reduced from 7 days to 24 hours
    },
  });
}
