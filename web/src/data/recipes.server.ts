/**
 * SERVER-side Firestore reads for SSR (project-plan.md §4.2). React Server
 * Components call these to stream recipe content + denormalized stats into the
 * HTML — crawlable and shareable. Reads are resilient: if Firebase isn't
 * configured (e.g. a preview build with no env), they return empty/null rather
 * than throwing, so pages still render.
 */

import "server-only";
import { getAdminDb } from "@/firebase.admin";
import { mapRecipe } from "@/data/recipes.shared";
import type { RecipeDoc } from "@/types/recipe";

const RECIPES = "recipes";

export { mapRecipe };

/** Newest recipes first, for the browse page. */
export async function listRecipes(limit = 100): Promise<RecipeDoc[]> {
  try {
    const snap = await getAdminDb().collection(RECIPES).orderBy("updatedAt", "desc").limit(limit).get();
    return snap.docs.map((doc) => mapRecipe(doc.id, doc.data()));
  } catch (err) {
    console.warn("listRecipes failed; returning empty list", err);
    return [];
  }
}

/** A single recipe by id, or null if missing / unavailable. */
export async function getRecipe(id: string): Promise<RecipeDoc | null> {
  try {
    const doc = await getAdminDb().collection(RECIPES).doc(id).get();
    if (!doc.exists) return null;
    return mapRecipe(doc.id, doc.data());
  } catch (err) {
    console.warn(`getRecipe(${id}) failed`, err);
    return null;
  }
}
