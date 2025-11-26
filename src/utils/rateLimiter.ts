/**
 * Flexible in-memory rate limiter for various security-sensitive operations.
 * In production, consider using Redis for distributed rate limiting.
 *
 * WARNING: This rate limiter is NOT suitable for multi-instance deployments
 * as state is not shared across instances. Use Redis for production.
 */

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

// Different rate limit configurations for different use cases
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Login attempts
  login: {
    maxAttempts: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  },
  // Public board mutations - generous limits per token
  publicBoard: {
    maxAttempts: 200, // 200 toggles per window
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDurationMs: 2 * 60 * 1000, // 2 minutes
  },
  // Username/email availability checks
  enumeration: {
    maxAttempts: 30,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 1 * 60 * 1000, // 1 minute
  },
  // Password reset requests
  passwordReset: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  },
  // Email verification resend
  emailVerification: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
  },
};

// Separate stores for each rate limit type
const rateLimitStores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(type: string): Map<string, RateLimitEntry> {
  let store = rateLimitStores.get(type);
  if (!store) {
    store = new Map();
    rateLimitStores.set(type, store);
  }
  return store;
}

function getConfig(type: string): RateLimitConfig {
  return RATE_LIMIT_CONFIGS[type] || RATE_LIMIT_CONFIGS.login;
}

/**
 * Check if an action is allowed for the given identifier
 * @param type - The type of rate limit (login, publicBoard, enumeration, etc.)
 * @param identifier - Unique identifier (IP, username, token, etc.)
 * @returns Object with allowed status and optionally retryAfter in seconds
 */
export function checkRateLimit(
  type: string,
  identifier: string
): {
  allowed: boolean;
  retryAfter?: number;
  remainingAttempts?: number;
} {
  const now = Date.now();
  const store = getStore(type);
  const config = getConfig(type);
  const entry = store.get(identifier);

  // No previous attempts
  if (!entry) {
    return { allowed: true, remainingAttempts: config.maxAttempts };
  }

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Check if window has expired - reset if so
  if (now - entry.firstAttempt > config.windowMs) {
    store.delete(identifier);
    return { allowed: true, remainingAttempts: config.maxAttempts };
  }

  // Check if max attempts reached
  if (entry.count >= config.maxAttempts) {
    // Block the user
    entry.blockedUntil = now + config.blockDurationMs;
    const retryAfter = Math.ceil(config.blockDurationMs / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, remainingAttempts: config.maxAttempts - entry.count };
}

/**
 * Record an attempt (successful or failed)
 * @param type - The type of rate limit
 * @param identifier - Unique identifier
 */
export function recordAttempt(type: string, identifier: string): void {
  const now = Date.now();
  const store = getStore(type);
  const config = getConfig(type);
  const entry = store.get(identifier);

  if (!entry || now - entry.firstAttempt > config.windowMs) {
    // Start new window
    store.set(identifier, {
      count: 1,
      firstAttempt: now,
    });
  } else {
    // Increment count
    entry.count++;
    if (entry.count >= config.maxAttempts) {
      entry.blockedUntil = now + config.blockDurationMs;
    }
  }
}

/**
 * Clear rate limit for an identifier (e.g., on successful login)
 * @param type - The type of rate limit
 * @param identifier - Unique identifier
 */
export function clearRateLimit(type: string, identifier: string): void {
  const store = getStore(type);
  store.delete(identifier);
}

// Legacy functions for backwards compatibility
export function checkLoginRateLimit(identifier: string) {
  return checkRateLimit("login", identifier);
}

export function recordFailedLogin(identifier: string): void {
  recordAttempt("login", identifier);
}

export function clearLoginRateLimit(identifier: string): void {
  clearRateLimit("login", identifier);
}

/**
 * Clean up old entries periodically
 */
export function cleanupRateLimiter(): void {
  const now = Date.now();
  for (const [type, store] of rateLimitStores.entries()) {
    const config = getConfig(type);
    for (const [key, entry] of store.entries()) {
      // Remove entries older than window + block duration
      if (now - entry.firstAttempt > config.windowMs + config.blockDurationMs) {
        store.delete(key);
      }
    }
  }
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimiter, 5 * 60 * 1000);
}
