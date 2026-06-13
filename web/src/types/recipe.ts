/**
 * Recipe shapes shared across the web app (mirrors project-plan.md §5.1 / §6.2).
 *
 * Two representations exist on purpose:
 *  - `RecipeDoc`   — the Firestore document (quantities serialized as "3/2").
 *  - `RecipeInput` — what the create/edit/fork form produces before save.
 */

/** An ingredient as stored: qty is an exact-rational string like "3/2". */
export interface IngredientDoc {
  name: string;
  qty: string;
  unit: string;
}

/** Denormalized, server-written stat counters living on the recipe doc. */
export interface RecipeStats {
  ratingSum: number;
  ratingCount: number;
  addCount: number;
}

/** A recipe document as read from Firestore (id is the doc id, not stored). */
export interface RecipeDoc extends RecipeStats {
  id: string;
  title: string;
  description?: string;
  ingredients: IngredientDoc[];
  steps: string[];
  authorUid: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  // Present only on forks.
  forkedFrom?: string;
  forkedFromTitle?: string;
  forkedFromAuthor?: string;
}

/** Editable recipe content produced by the form (no ids, stats, or authorship). */
export interface RecipeInput {
  title: string;
  description?: string;
  ingredients: IngredientDoc[];
  steps: string[];
}

/** Attribution captured when a recipe is forked from another. */
export interface ForkAttribution {
  forkedFrom: string;
  forkedFromTitle: string;
  forkedFromAuthor: string;
}
