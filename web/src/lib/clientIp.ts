/**
 * SERVER-ONLY: extract and hash the real client IP from request headers, for
 * best-effort per-IP stat dedup (project-plan.md §3, §6.2).
 *
 * The raw IP is NEVER stored — only a salted SHA-256 hash (`ipKey`). On Vercel
 * the client IP is the FIRST entry of `x-forwarded-for`; we fall back through a
 * couple of common proxy headers and finally to a fixed "unknown" bucket.
 */

import { createHash } from "node:crypto";

/** Pull the best-guess client IP out of request headers. Returns null if none. */
export function extractClientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    // "client, proxy1, proxy2" — the left-most is the original client.
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real && real.trim()) return real.trim();

  return null;
}

/**
 * Stable dedup key for an IP. Salted with STATS_IP_HASH_SALT so the stored key
 * isn't a bare IP hash (mildly raises the bar against rainbow-table reversal).
 * A missing IP collapses to a single shared "unknown" bucket.
 */
export function hashIp(ip: string | null, salt = process.env.STATS_IP_HASH_SALT ?? ""): string {
  const value = ip && ip.length > 0 ? ip : "unknown";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

/** Convenience: header → dedup key in one call. */
export function ipKeyFromHeaders(headers: Headers, salt?: string): string {
  return hashIp(extractClientIp(headers), salt);
}
