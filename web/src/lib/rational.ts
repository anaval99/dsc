/**
 * Exact rational quantities — the fractions core, ported to TS to render
 * identically to the app's `Rational` (see project-plan.md §5.2).
 *
 * Quantities are stored and scaled as exact numerator/denominator integers so
 * the `0.1 + 0.2` class of float bug is structurally impossible. Display
 * (½, 1½, …) is derived from the exact value; math is never done on floats.
 */

export class Rational {
  /** Numerator (carries the sign). */
  readonly num: number;
  /** Denominator (always > 0). */
  readonly den: number;

  private constructor(num: number, den: number) {
    this.num = num;
    this.den = den;
  }

  /** Build a normalized rational: gcd-reduced, denominator > 0. */
  static of(num: number, den = 1): Rational {
    if (!Number.isInteger(num) || !Number.isInteger(den)) {
      throw new Error(`Rational.of requires integers, got ${num}/${den}`);
    }
    if (den === 0) {
      throw new Error("Rational denominator must be non-zero");
    }
    if (den < 0) {
      num = -num;
      den = -den;
    }
    const g = gcd(Math.abs(num), den) || 1;
    return new Rational(num / g, den / g);
  }

  /** Whole-number convenience constructor. */
  static fromInt(n: number): Rational {
    return Rational.of(n, 1);
  }

  static get zero(): Rational {
    return Rational.of(0, 1);
  }

  static get one(): Rational {
    return Rational.of(1, 1);
  }

  multiply(other: Rational): Rational {
    return Rational.of(this.num * other.num, this.den * other.den);
  }

  equals(other: Rational): boolean {
    // Both are normalized, so component-wise equality suffices.
    return this.num === other.num && this.den === other.den;
  }

  isWhole(): boolean {
    return this.den === 1;
  }

  isNegative(): boolean {
    return this.num < 0;
  }

  toNumber(): number {
    return this.num / this.den;
  }

  /** Serialized form for the Firestore doc / App-Link payload, e.g. "3/2". */
  toString(): string {
    return `${this.num}/${this.den}`;
  }

  /** Inverse of `toString` — parses "3/2" / "3" (already-normalized form). */
  static fromString(s: string): Rational {
    const parsed = parseRational(s);
    if (parsed === null) {
      throw new Error(`Invalid serialized rational: ${JSON.stringify(s)}`);
    }
    return parsed;
  }
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/**
 * Parse forgiving user / serialized input into an exact `Rational`.
 * Accepts: "2", "0.5", "1.5", "1/2", "3/2", "1 1/2", "-1/2", " 2 ".
 * Returns null for anything it can't parse (callers decide how to surface it).
 */
export function parseRational(input: string): Rational | null {
  if (typeof input !== "string") return null;
  const s = input.trim();
  if (s === "") return null;

  // Mixed number: "1 1/2" (optionally signed whole part).
  const mixed = /^(-?\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (mixed) {
    const whole = Number(mixed[1]);
    const n = Number(mixed[2]);
    const d = Number(mixed[3]);
    if (d === 0) return null;
    const sign = whole < 0 || Object.is(whole, -0) ? -1 : 1;
    return Rational.of(sign * (Math.abs(whole) * d + n), d);
  }

  // Plain fraction: "1/2", "-3/4".
  const frac = /^(-?\d+)\/(\d+)$/.exec(s);
  if (frac) {
    const d = Number(frac[2]);
    if (d === 0) return null;
    return Rational.of(Number(frac[1]), d);
  }

  // Integer: "3", "-7".
  if (/^-?\d+$/.test(s)) {
    return Rational.of(Number(s), 1);
  }

  // Decimal: "0.5", "1.5", "-.25". Convert exactly via the decimal places.
  const dec = /^(-?)(\d*)\.(\d+)$/.exec(s);
  if (dec) {
    const sign = dec[1] === "-" ? -1 : 1;
    const intPart = dec[2] === "" ? "0" : dec[2];
    const fracPart = dec[3];
    const den = 10 ** fracPart.length;
    const num = Number(intPart) * den + Number(fracPart);
    return Rational.of(sign * num, den);
  }

  return null;
}

// Common unicode vulgar fractions, keyed by "num/den" of the proper part.
const VULGAR: Record<string, string> = {
  "1/2": "½",
  "1/3": "⅓",
  "2/3": "⅔",
  "1/4": "¼",
  "3/4": "¾",
  "1/5": "⅕",
  "2/5": "⅖",
  "3/5": "⅗",
  "4/5": "⅘",
  "1/6": "⅙",
  "5/6": "⅚",
  "1/8": "⅛",
  "3/8": "⅜",
  "5/8": "⅝",
  "7/8": "⅞",
};

/**
 * Format a rational for display: mixed numbers with unicode vulgar fractions
 * where they exist, else `a/b`. Integers print plain. Display only — the
 * underlying math always stays on the exact rational.
 *   1/2 → ½   3/2 → 1½   1/3 → ⅓   11/4 → 2¾   3 → 3   7/3 → 2⅓   5/3 → 1⅔
 */
export function formatRational(r: Rational): string {
  const sign = r.num < 0 ? "-" : "";
  const absNum = Math.abs(r.num);
  const den = r.den;

  if (den === 1) {
    return `${sign}${absNum}`;
  }

  const whole = Math.floor(absNum / den);
  const remNum = absNum - whole * den;
  const fracKey = `${remNum}/${den}`;
  const fracText = VULGAR[fracKey] ?? `${remNum}/${den}`;

  if (whole === 0) {
    return `${sign}${fracText}`;
  }
  // Keep a thin space only when falling back to "a/b" so "1 3/7" stays readable;
  // unicode vulgar fractions sit flush against the whole number ("1½").
  const sep = VULGAR[fracKey] ? "" : " ";
  return `${sign}${whole}${sep}${fracText}`;
}
