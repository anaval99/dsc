/**
 * CLIENT-side authed recipe writes — create / edit / fork (project-plan.md §4.2).
 * These run as the signed-in user and are gated by Firestore security rules
 * (owner-only writes; stat fields untouchable). Stats are NEVER written here.
 */

"use client";

import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { getClientDb } from "@/firebase.client";
import { mapRecipe } from "@/data/recipes.shared";
import type { RecipeDoc, RecipeInput, ForkAttribution } from "@/types/recipe";

const RECIPES = "recipes";

function nowMillis(): number {
  return Date.now();
}

/** Client read used to seed the edit / fork form. */
export async function fetchRecipe(id: string): Promise<RecipeDoc | null> {
  const snap = await getDoc(doc(getClientDb(), RECIPES, id));
  if (!snap.exists()) return null;
  return mapRecipe(snap.id, snap.data());
}

/** Create a brand-new recipe owned by the signed-in user. Returns the new id. */
export async function createRecipe(user: User, input: RecipeInput): Promise<string> {
  const ref = doc(collection(getClientDb(), RECIPES));
  await setDoc(ref, {
    ...sanitize(input),
    authorUid: user.uid,
    authorName: user.displayName ?? "Anonymous",
    createdAt: nowMillis(),
    updatedAt: nowMillis(),
    serverCreatedAt: serverTimestamp(),
    // Counters start at zero; only the server ever moves them.
    ratingSum: 0,
    ratingCount: 0,
    addCount: 0,
  });
  return ref.id;
}

/** Update an existing recipe the user owns. Never touches stat counters. */
export async function updateRecipe(id: string, input: RecipeInput): Promise<void> {
  await updateDoc(doc(getClientDb(), RECIPES, id), {
    ...sanitize(input),
    updatedAt: nowMillis(),
  });
}

/**
 * Fork any recipe into a NEW doc owned by the forker, carrying attribution.
 * The original is untouched; the fork starts with zeroed stats.
 */
export async function forkRecipe(user: User, input: RecipeInput, attribution: ForkAttribution): Promise<string> {
  const ref = doc(collection(getClientDb(), RECIPES));
  await setDoc(ref, {
    ...sanitize(input),
    authorUid: user.uid,
    authorName: user.displayName ?? "Anonymous",
    createdAt: nowMillis(),
    updatedAt: nowMillis(),
    serverCreatedAt: serverTimestamp(),
    forkedFrom: attribution.forkedFrom,
    forkedFromTitle: attribution.forkedFromTitle,
    forkedFromAuthor: attribution.forkedFromAuthor,
    ratingSum: 0,
    ratingCount: 0,
    addCount: 0,
  });
  return ref.id;
}

/** Trim content and drop an empty description so the doc stays clean. */
function sanitize(input: RecipeInput) {
  const out: Omit<RecipeInput, "description"> & { description?: string } = {
    title: input.title.trim(),
    ingredients: input.ingredients.map((i) => ({
      name: i.name.trim(),
      qty: i.qty.trim(),
      unit: i.unit.trim(),
    })),
    steps: input.steps.map((s) => s.trim()).filter((s) => s.length > 0),
  };
  const description = input.description?.trim();
  if (description) out.description = description;
  return out;
}
