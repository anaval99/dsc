/**
 * Pure stat-mutation logic for `/api/stats` (project-plan.md §6.2, §10).
 *
 * Kept free of Firebase so the one-per-IP / value∈1..5 / delta-constrained
 * invariants can be unit-tested directly. The route handler wires these into an
 * Admin SDK transaction (marker-doc write + counter bump, atomically).
 */

import type { RecipeStats } from "@/types/recipe";

export type StatAction = "rate" | "add";

export const MIN_RATING = 1;
export const MAX_RATING = 5;

/** A rating is valid iff it's an integer in [1, 5]. */
export function isValidRating(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= MIN_RATING && value <= MAX_RATING;
}

export interface StatOutcome {
  /** False when the write is a no-op (duplicate IP) or invalid. */
  accepted: boolean;
  /** Counters to persist when accepted (unchanged when not). */
  stats: RecipeStats;
  /** Why an update was rejected, for the API response. */
  reason?: "duplicate" | "invalid";
}

/**
 * Compute the result of a rating. `markerExists` reflects whether this IP has
 * already rated (create-only marker ⇒ one rating per IP).
 */
export function applyRating(current: RecipeStats, value: number, markerExists: boolean): StatOutcome {
  if (!isValidRating(value)) {
    return { accepted: false, stats: current, reason: "invalid" };
  }
  if (markerExists) {
    return { accepted: false, stats: current, reason: "duplicate" };
  }
  return {
    accepted: true,
    stats: {
      ratingSum: current.ratingSum + value,
      ratingCount: current.ratingCount + 1,
      addCount: current.addCount,
    },
  };
}

/** Compute the result of an "Add to DSC" click (one add per IP). */
export function applyAdd(current: RecipeStats, markerExists: boolean): StatOutcome {
  if (markerExists) {
    return { accepted: false, stats: current, reason: "duplicate" };
  }
  return {
    accepted: true,
    stats: {
      ratingSum: current.ratingSum,
      ratingCount: current.ratingCount,
      addCount: current.addCount + 1,
    },
  };
}

/** Client-side display helper: average stars (0 when unrated). */
export function averageRating(stats: Pick<RecipeStats, "ratingSum" | "ratingCount">): number {
  if (stats.ratingCount <= 0) return 0;
  return stats.ratingSum / stats.ratingCount;
}
