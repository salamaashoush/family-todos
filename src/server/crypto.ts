/**
 * Server-side cryptographic utilities
 * This file should only be imported by server code to avoid bundling Node.js crypto for browser
 */
import crypto from "node:crypto";

/**
 * Generate a secure share token (64 hex characters = 32 bytes)
 */
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate a secure random token of specified byte length
 */
export function generateSecureToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * Generate a URL-safe random token
 */
export function generateUrlSafeToken(byteLength: number = 32): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}
