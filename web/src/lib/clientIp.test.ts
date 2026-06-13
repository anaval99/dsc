import { describe, it, expect } from "vitest";
import { extractClientIp, hashIp, ipKeyFromHeaders } from "./clientIp";

describe("extractClientIp", () => {
  it("takes the left-most entry of x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" });
    expect(extractClientIp(h)).toBe("203.0.113.7");
  });

  it("trims whitespace", () => {
    const h = new Headers({ "x-forwarded-for": "  203.0.113.7  " });
    expect(extractClientIp(h)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "198.51.100.5" });
    expect(extractClientIp(h)).toBe("198.51.100.5");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.5" });
    expect(extractClientIp(h)).toBe("203.0.113.7");
  });

  it("returns null when no IP header is present", () => {
    expect(extractClientIp(new Headers())).toBeNull();
  });
});

describe("hashIp", () => {
  it("is deterministic for the same IP + salt", () => {
    expect(hashIp("203.0.113.7", "salt")).toBe(hashIp("203.0.113.7", "salt"));
  });

  it("differs across IPs", () => {
    expect(hashIp("203.0.113.7", "salt")).not.toBe(hashIp("203.0.113.8", "salt"));
  });

  it("differs across salts (rotating the salt resets dedup)", () => {
    expect(hashIp("203.0.113.7", "saltA")).not.toBe(hashIp("203.0.113.7", "saltB"));
  });

  it("never returns the raw IP and produces a 64-hex-char digest", () => {
    const key = hashIp("203.0.113.7", "salt");
    expect(key).not.toContain("203.0.113.7");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("buckets a missing IP into a single shared 'unknown' key", () => {
    expect(hashIp(null, "salt")).toBe(hashIp("", "salt"));
  });
});

describe("ipKeyFromHeaders", () => {
  it("matches hashIp on the extracted IP", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.7" });
    expect(ipKeyFromHeaders(h, "salt")).toBe(hashIp("203.0.113.7", "salt"));
  });
});
