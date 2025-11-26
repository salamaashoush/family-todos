/**
 * Simple in-memory rate limiter for login attempts.
 * In production, consider using Redis for distributed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();

// Configuration
const MAX_ATTEMPTS = 5; // Max attempts before blocking
const WINDOW_MS = 15 * 60 * 1000; // 15 minute window
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minute block

/**
 * Check if a login attempt is allowed for the given identifier (IP or username)
 * @returns Object with allowed status and optionally retryAfter in seconds
 */
export function checkLoginRateLimit(identifier: string): {
  allowed: boolean;
  retryAfter?: number;
  remainingAttempts?: number;
} {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  // No previous attempts
  if (!entry) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Check if window has expired - reset if so
  if (now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  // Check if max attempts reached
  if (entry.count >= MAX_ATTEMPTS) {
    // Block the user
    entry.blockedUntil = now + BLOCK_DURATION_MS;
    const retryAfter = Math.ceil(BLOCK_DURATION_MS / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - entry.count };
}

/**
 * Record a failed login attempt
 */
export function recordFailedLogin(identifier: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(identifier);

  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    // Start new window
    loginAttempts.set(identifier, {
      count: 1,
      firstAttempt: now,
    });
  } else {
    // Increment count
    entry.count++;
    if (entry.count >= MAX_ATTEMPTS) {
      entry.blockedUntil = now + BLOCK_DURATION_MS;
    }
  }
}

/**
 * Clear rate limit entry on successful login
 */
export function clearLoginRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}

/**
 * Clean up old entries periodically (call this on a timer in production)
 */
export function cleanupRateLimiter(): void {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    // Remove entries older than window + block duration
    if (now - entry.firstAttempt > WINDOW_MS + BLOCK_DURATION_MS) {
      loginAttempts.delete(key);
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimiter, 5 * 60 * 1000);
}
