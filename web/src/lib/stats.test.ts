import { describe, it, expect } from "vitest";
import { applyRating, applyAdd, isValidRating, averageRating } from "./stats";
import type { RecipeStats } from "@/types/recipe";

const zero: RecipeStats = { ratingSum: 0, ratingCount: 0, addCount: 0 };

describe("isValidRating", () => {
  it.each([1, 2, 3, 4, 5])("accepts %i", (v) => expect(isValidRating(v)).toBe(true));
  it.each([0, 6, -1, 2.5, NaN])("rejects %p", (v) => expect(isValidRating(v)).toBe(false));
  it("rejects non-numbers", () => {
    expect(isValidRating("3")).toBe(false);
    expect(isValidRating(null)).toBe(false);
  });
});

describe("applyRating", () => {
  it("adds value to sum and bumps count by one", () => {
    const r = applyRating({ ratingSum: 8, ratingCount: 2, addCount: 5 }, 4, false);
    expect(r.accepted).toBe(true);
    expect(r.stats).toEqual({ ratingSum: 12, ratingCount: 3, addCount: 5 });
  });

  it("rejects a duplicate IP without changing counters", () => {
    const r = applyRating({ ...zero, ratingSum: 4, ratingCount: 1 }, 5, true);
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe("duplicate");
    expect(r.stats).toEqual({ ratingSum: 4, ratingCount: 1, addCount: 0 });
  });

  it("rejects an out-of-range value", () => {
    const r = applyRating(zero, 7, false);
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe("invalid");
    expect(r.stats).toEqual(zero);
  });

  it("never touches addCount", () => {
    expect(applyRating({ ...zero, addCount: 9 }, 3, false).stats.addCount).toBe(9);
  });
});

describe("applyAdd", () => {
  it("bumps addCount by one", () => {
    const r = applyAdd({ ratingSum: 8, ratingCount: 2, addCount: 5 }, false);
    expect(r.accepted).toBe(true);
    expect(r.stats).toEqual({ ratingSum: 8, ratingCount: 2, addCount: 6 });
  });

  it("rejects a duplicate IP", () => {
    const r = applyAdd({ ...zero, addCount: 1 }, true);
    expect(r.accepted).toBe(false);
    expect(r.stats.addCount).toBe(1);
  });

  it("never touches rating counters", () => {
    const r = applyAdd({ ratingSum: 8, ratingCount: 2, addCount: 0 }, false);
    expect(r.stats.ratingSum).toBe(8);
    expect(r.stats.ratingCount).toBe(2);
  });
});

describe("averageRating", () => {
  it("computes the mean", () => {
    expect(averageRating({ ratingSum: 12, ratingCount: 3 })).toBe(4);
  });
  it("is 0 when unrated", () => {
    expect(averageRating({ ratingSum: 0, ratingCount: 0 })).toBe(0);
  });
});
