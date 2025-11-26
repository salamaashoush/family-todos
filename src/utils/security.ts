/**
 * Security utilities for input sanitization and validation
 */

/**
 * Escape special characters in SQL LIKE patterns to prevent injection.
 * Special characters in LIKE: % (any chars), _ (single char), \ (escape)
 *
 * @param input - The user input to escape
 * @returns Escaped string safe for use in LIKE patterns
 */
export function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/%/g, "\\%") // Escape percent
    .replace(/_/g, "\\_"); // Escape underscore
}

/**
 * Sanitize search input - escape LIKE patterns and limit length
 *
 * @param input - The user search input
 * @param maxLength - Maximum allowed length (default 100)
 * @returns Sanitized search string
 */
export function sanitizeSearchInput(input: string, maxLength = 100): string {
  // Trim and limit length
  const trimmed = input.trim().substring(0, maxLength);
  // Escape LIKE special characters
  return escapeLikePattern(trimmed);
}

/**
 * Validate that a share token has the correct format.
 * Share tokens should be exactly 64 hex characters.
 *
 * @param token - The token to validate
 * @returns true if valid, false otherwise
 */
export function isValidShareToken(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token);
}

/**
 * Generate a cryptographically secure random delay between min and max ms.
 * Used to prevent timing attacks by adding noise to response times.
 *
 * @param minMs - Minimum delay in milliseconds
 * @param maxMs - Maximum delay in milliseconds
 */
export async function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns true if strings are equal, false otherwise.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if equal, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    // but we know the result will be false
    let result = 1;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0);
    }
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
