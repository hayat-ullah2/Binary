import type { LicenseKey, LicenseStatus } from "@/types/admin";
import type { LicenseKeyRow } from "@/lib/db/schema";

/**
 * Generate a readable license key, e.g. "AMIRFX-7K2P-9QX4-M3TD".
 * Uses crypto for randomness (unambiguous Crockford-ish alphabet).
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I,O,0,1

export function generateLicenseKey(prefix = "AMIRFX"): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  const groups = [
    chars.slice(0, 4).join(""),
    chars.slice(4, 8).join(""),
    chars.slice(8, 12).join(""),
  ];
  return `${prefix}-${groups.join("-")}`;
}

/** Derive the effective status, accounting for expiry. */
export function effectiveStatus(
  stored: LicenseKeyRow["status"],
  expiresAt: Date | null
): LicenseStatus {
  if (stored === "REVOKED") return "REVOKED";
  if (stored === "ACTIVE" && expiresAt && expiresAt.getTime() < Date.now()) {
    return "EXPIRED";
  }
  return stored;
}

/** DB row → API LicenseKey (with derived effective status). */
export function toLicenseKey(row: LicenseKeyRow): LicenseKey {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    email: row.email,
    plan: row.plan,
    status: effectiveStatus(row.status, row.expiresAt),
    activations: row.activations,
    maxActivations: row.maxActivations,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
  };
}
