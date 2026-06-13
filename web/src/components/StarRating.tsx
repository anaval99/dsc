/**
 * Interactive 1–5 star rating + average display (project-plan.md §7).
 * No sign-in needed: posts to /api/stats, which dedups by server-observed IP.
 * The stars disable once this browser has rated (soft UX via localStorage; the
 * server is the real enforcer). Average is computed client-side from counters.
 */

"use client";

import { useEffect, useState } from "react";
import { submitRating } from "@/data/stats.client";
import { averageRating } from "@/lib/stats";
import type { RecipeStats } from "@/types/recipe";

const RATED_KEY = (id: string) => `dsc:rated:${id}`;

export function StarRating({ recipeId, initial }: { recipeId: string; initial: RecipeStats }) {
  const [stats, setStats] = useState<RecipeStats>(initial);
  const [hover, setHover] = useState(0);
  const [rated, setRated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(RATED_KEY(recipeId))) setRated(true);
    } catch {
      // localStorage unavailable (private mode etc.) — server still dedups.
    }
  }, [recipeId]);

  const avg = averageRating(stats);

  async function rate(value: number) {
    if (rated || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitRating(recipeId, value);
      setStats({ ratingSum: res.ratingSum, ratingCount: res.ratingCount, addCount: res.addCount });
      setRated(true);
      try {
        localStorage.setItem(RATED_KEY(recipeId), String(value));
      } catch {
        /* ignore */
      }
    } catch {
      setError("Couldn't record your rating. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="star-rating">
      <div
        className="stars"
        role="radiogroup"
        aria-label="Rate this recipe from 1 to 5 stars"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hover || Math.round(avg)) >= n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={Math.round(avg) === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className={`star ${filled ? "star-filled" : ""}`}
              disabled={rated || submitting}
              onMouseEnter={() => !rated && setHover(n)}
              onClick={() => rate(n)}
            >
              ★
            </button>
          );
        })}
      </div>
      <div className="star-summary">
        {stats.ratingCount > 0 ? (
          <span>
            {avg.toFixed(1)} <span className="stats-muted">({stats.ratingCount})</span>
          </span>
        ) : (
          <span className="stats-muted">No ratings yet</span>
        )}
        {rated ? <span className="star-thanks"> · Thanks!</span> : null}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
