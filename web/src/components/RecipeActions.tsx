/**
 * Edit / Fork actions on a recipe page (project-plan.md §7). Fork shows for any
 * signed-in user; Edit shows only for the owner. Hidden entirely when signed out.
 */

"use client";

import Link from "next/link";
import { useGoogleAuth } from "@/auth/useGoogleAuth";

export function RecipeActions({ recipeId, authorUid }: { recipeId: string; authorUid: string }) {
  const { user, loading } = useGoogleAuth();

  if (loading || !user) return null;

  const isOwner = user.uid === authorUid;

  return (
    <div className="recipe-actions">
      <Link href={`/r/${recipeId}/fork`} className="btn btn-ghost">
        Fork
      </Link>
      {isOwner ? (
        <Link href={`/r/${recipeId}/edit`} className="btn btn-ghost">
          Edit
        </Link>
      ) : null}
    </div>
  );
}
