/**
 * POST /api/stats — server-side ratings + adds (project-plan.md §4.2, §6.2).
 *
 * The browser can't write stats (Firestore rules deny it). It POSTs here; the
 * route reads the REAL client IP from request headers, hashes it to an ipKey,
 * and in a single Admin SDK transaction writes a create-only marker doc plus
 * the denormalized counter bump. One rating + one add per IP, value ∈ 1..5,
 * deltas constrained — none of it forgeable from the client.
 */

import { NextResponse } from "next/server";
import { getAdminDb } from "@/firebase.admin";
import { ipKeyFromHeaders } from "@/lib/clientIp";
import { applyAdd, applyRating, isValidRating } from "@/lib/stats";
import type { RecipeStats } from "@/types/recipe";

// Always run on the Node runtime (firebase-admin needs it) and never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StatsRequest {
  recipeId?: unknown;
  action?: unknown;
  value?: unknown;
}

function currentStats(data: FirebaseFirestore.DocumentData | undefined): RecipeStats {
  return {
    ratingSum: typeof data?.ratingSum === "number" ? data.ratingSum : 0,
    ratingCount: typeof data?.ratingCount === "number" ? data.ratingCount : 0,
    addCount: typeof data?.addCount === "number" ? data.addCount : 0,
  };
}

export async function POST(request: Request) {
  let body: StatsRequest;
  try {
    body = (await request.json()) as StatsRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON" }, { status: 400 });
  }

  const { recipeId, action } = body;
  if (typeof recipeId !== "string" || recipeId.length === 0) {
    return NextResponse.json({ ok: false, error: "missing recipeId" }, { status: 400 });
  }
  if (action !== "rate" && action !== "add") {
    return NextResponse.json({ ok: false, error: "invalid action" }, { status: 400 });
  }
  if (action === "rate" && !isValidRating(body.value)) {
    return NextResponse.json({ ok: false, error: "rating must be an integer 1..5" }, { status: 400 });
  }

  const ipKey = ipKeyFromHeaders(request.headers);
  const db = getAdminDb();
  const recipeRef = db.collection("recipes").doc(recipeId);
  const markerRef = recipeRef.collection(action === "rate" ? "ratings" : "adds").doc(ipKey);

  try {
    const result = await db.runTransaction(async (tx) => {
      const recipeSnap = await tx.get(recipeRef);
      if (!recipeSnap.exists) {
        return { status: 404 as const };
      }
      const markerSnap = await tx.get(markerRef);
      const stats = currentStats(recipeSnap.data());

      const outcome =
        action === "rate"
          ? applyRating(stats, body.value as number, markerSnap.exists)
          : applyAdd(stats, markerSnap.exists);

      if (outcome.accepted) {
        const now = Date.now();
        if (action === "rate") {
          tx.set(markerRef, { value: body.value, createdAt: now });
        } else {
          tx.set(markerRef, { createdAt: now });
        }
        tx.update(recipeRef, {
          ratingSum: outcome.stats.ratingSum,
          ratingCount: outcome.stats.ratingCount,
          addCount: outcome.stats.addCount,
        });
      }

      return { status: 200 as const, counted: outcome.accepted, stats: outcome.stats };
    });

    if (result.status === 404) {
      return NextResponse.json({ ok: false, error: "recipe not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      counted: result.counted,
      ratingSum: result.stats.ratingSum,
      ratingCount: result.stats.ratingCount,
      addCount: result.stats.addCount,
    });
  } catch (err) {
    console.error("/api/stats transaction failed", err);
    return NextResponse.json({ ok: false, error: "stat write failed" }, { status: 500 });
  }
}
