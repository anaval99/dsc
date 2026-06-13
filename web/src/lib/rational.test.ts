import { describe, it, expect } from "vitest";
import { Rational, parseRational, formatRational } from "./rational";

describe("Rational.of / normalization", () => {
  it("gcd-reduces", () => {
    expect(Rational.of(2, 4).toString()).toBe("1/2");
    expect(Rational.of(6, 3).toString()).toBe("2/1");
    expect(Rational.of(0, 5).toString()).toBe("0/1");
  });

  it("keeps denominator positive, moving the sign to the numerator", () => {
    expect(Rational.of(1, -2).toString()).toBe("-1/2");
    expect(Rational.of(-1, -2).toString()).toBe("1/2");
  });

  it("rejects a zero denominator", () => {
    expect(() => Rational.of(1, 0)).toThrow();
  });

  it("rejects non-integers", () => {
    expect(() => Rational.of(1.5, 2)).toThrow();
  });
});

describe("parseRational", () => {
  const cases: Array<[string, string]> = [
    ["2", "2/1"],
    ["-7", "-7/1"],
    ["0.5", "1/2"],
    ["1.5", "3/2"],
    ["-.25", "-1/4"],
    ["0.125", "1/8"],
    ["1/2", "1/2"],
    ["3/2", "3/2"],
    ["2/4", "1/2"],
    ["-3/4", "-3/4"],
    ["1 1/2", "3/2"],
    ["2 3/4", "11/4"],
    ["-1 1/2", "-3/2"],
    [" 2 ", "2/1"],
  ];
  it.each(cases)("parses %s → %s", (input, expected) => {
    expect(parseRational(input)?.toString()).toBe(expected);
  });

  const bad = ["", "abc", "1/0", "1 1/0", "1/2/3", "1.2.3", "/2", "½"];
  it.each(bad)("returns null for invalid input %j", (input) => {
    expect(parseRational(input)).toBeNull();
  });

  it("round-trips through toString/fromString", () => {
    for (const s of ["1 1/2", "0.5", "1/2", "11/4"]) {
      const r = parseRational(s)!;
      expect(Rational.fromString(r.toString()).equals(r)).toBe(true);
    }
  });
});

describe("formatRational", () => {
  const cases: Array<[string, string]> = [
    ["1/2", "½"],
    ["3/2", "1½"],
    ["1/3", "⅓"],
    ["7/3", "2⅓"],
    ["5/3", "1⅔"],
    ["11/4", "2¾"],
    ["3/1", "3"],
    ["0/1", "0"],
    ["1/8", "⅛"],
    ["-3/2", "-1½"],
    ["10/3", "3⅓"],
  ];
  it.each(cases)("formats %s → %s", (input, expected) => {
    expect(formatRational(Rational.fromString(input))).toBe(expected);
  });

  it("falls back to a/b with a space for uncommon fractions", () => {
    expect(formatRational(Rational.of(3, 7))).toBe("3/7");
    expect(formatRational(Rational.of(10, 7))).toBe("1 3/7");
  });
});

describe("multiply (portion scaling)", () => {
  const half = Rational.of(1, 2);
  it("3 eggs × 0.5 = 1½", () => {
    expect(formatRational(Rational.fromInt(3).multiply(half))).toBe("1½");
  });
  it("⅓ cup × 1.5 = ½ cup", () => {
    const third = Rational.of(1, 3);
    const oneAndHalf = Rational.of(3, 2);
    expect(third.multiply(oneAndHalf).toString()).toBe("1/2");
  });
  it("1 cup × 2 = 2", () => {
    expect(Rational.one.multiply(Rational.fromInt(2)).toString()).toBe("2/1");
  });
  it("stays exact: 1/3 × 3 = 1", () => {
    expect(Rational.of(1, 3).multiply(Rational.fromInt(3)).equals(Rational.one)).toBe(true);
  });
});
