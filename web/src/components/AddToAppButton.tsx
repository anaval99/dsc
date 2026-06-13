/**
 * "Add to Damn Simple Cooking" button (project-plan.md §7). Records an Add via
 * /api/stats (server-side, IP-deduped), then navigates to the App Link — which
 * opens the app and adds the recipe locally with the full payload embedded.
 * Falls back to a plain link if the payload is too large for a URL.
 */

"use client";

import { useState } from "react";
import { recordAdd } from "@/data/stats.client";

export function AddToAppButton({
  recipeId,
  appLink,
  oversized,
}: {
  recipeId: string;
  appLink: string;
  oversized: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      // Best-effort: don't block the hand-off if the stat write fails.
      await recordAdd(recipeId).catch(() => undefined);
    } finally {
      window.location.href = appLink;
      setBusy(false);
    }
  }

  if (oversized) {
    return (
      <p className="add-oversized">
        This recipe is too large to hand off via a link. Open it on your phone’s browser to add it.
      </p>
    );
  }

  return (
    <button type="button" className="btn btn-primary add-to-app" onClick={handleClick} disabled={busy}>
      {busy ? "Opening…" : "Add to Damn Simple Cooking"}
    </button>
  );
}
