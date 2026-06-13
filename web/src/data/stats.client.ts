/**
 * Thin client caller → POST /api/stats (project-plan.md §4.2). The browser
 * NEVER writes stats directly to Firestore; it asks the server, which reads the
 * real client IP and writes via the Admin SDK.
 */

"use client";

import type { StatAction } from "@/lib/stats";

export interface StatsResponse {
  ok: boolean;
  /** True when this IP's vote/add was newly counted (false on duplicate). */
  counted: boolean;
  ratingSum: number;
  ratingCount: number;
  addCount: number;
}

async function postStat(recipeId: string, action: StatAction, value?: number): Promise<StatsResponse> {
  const res = await fetch("/api/stats", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ recipeId, action, value }),
  });
  if (!res.ok) {
    throw new Error(`/api/stats responded ${res.status}`);
  }
  return (await res.json()) as StatsResponse;
}

/** Submit a 1–5 rating for a recipe. */
export function submitRating(recipeId: string, value: number): Promise<StatsResponse> {
  return postStat(recipeId, "rate", value);
}

/** Record an "Add to Damn Simple Cooking" click. */
export function recordAdd(recipeId: string): Promise<StatsResponse> {
  return postStat(recipeId, "add");
}
