/**
 * Compact "★ 4.3 (12) · 87 adds" badge for recipe cards (project-plan.md §7).
 * Server-renderable — pure display from denormalized counters.
 */

import { averageRating } from "@/lib/stats";
import type { RecipeStats } from "@/types/recipe";

export function StatsBadge({ stats }: { stats: RecipeStats }) {
  const avg = averageRating(stats);
  return (
    <span className="stats-badge" aria-label={statsLabel(stats)}>
      <span className="stats-rating">
        <span aria-hidden="true">★</span>{" "}
        {stats.ratingCount > 0 ? avg.toFixed(1) : "—"}
        {stats.ratingCount > 0 ? <span className="stats-muted"> ({stats.ratingCount})</span> : null}
      </span>
      <span className="stats-dot" aria-hidden="true">
        ·
      </span>
      <span className="stats-adds">{stats.addCount} adds</span>
    </span>
  );
}

function statsLabel(stats: RecipeStats): string {
  const avg = averageRating(stats);
  const rating =
    stats.ratingCount > 0
      ? `rated ${avg.toFixed(1)} out of 5 from ${stats.ratingCount} ${stats.ratingCount === 1 ? "rating" : "ratings"}`
      : "no ratings yet";
  return `${rating}, added ${stats.addCount} ${stats.addCount === 1 ? "time" : "times"}`;
}
