/**
 * Recipe mapping shared by server (Admin SDK) and client (Web SDK) reads.
 * No "server-only" import here so it's safe in client components too. The
 * mapping is defensive: a malformed row never blanks a whole recipe.
 */

import type { RecipeDoc, IngredientDoc } from "@/types/recipe";

export function mapRecipe(id: string, data: Record<string, unknown> | undefined): RecipeDoc {
  const d = data ?? {};
  const ingredients: IngredientDoc[] = Array.isArray(d.ingredients)
    ? (d.ingredients as unknown[]).flatMap((row) => {
        if (typeof row !== "object" || row === null) return [];
        const r = row as Record<string, unknown>;
        if (typeof r.name !== "string" || typeof r.qty !== "string") return [];
        return [{ name: r.name, qty: r.qty, unit: typeof r.unit === "string" ? r.unit : "" }];
      })
    : [];
  const steps: string[] = Array.isArray(d.steps)
    ? (d.steps as unknown[]).filter((s): s is string => typeof s === "string")
    : [];

  return {
    id,
    title: typeof d.title === "string" ? d.title : "",
    description: typeof d.description === "string" ? d.description : undefined,
    ingredients,
    steps,
    authorUid: typeof d.authorUid === "string" ? d.authorUid : "",
    authorName: typeof d.authorName === "string" ? d.authorName : "Anonymous",
    createdAt: typeof d.createdAt === "number" ? d.createdAt : 0,
    updatedAt: typeof d.updatedAt === "number" ? d.updatedAt : 0,
    forkedFrom: typeof d.forkedFrom === "string" ? d.forkedFrom : undefined,
    forkedFromTitle: typeof d.forkedFromTitle === "string" ? d.forkedFromTitle : undefined,
    forkedFromAuthor: typeof d.forkedFromAuthor === "string" ? d.forkedFromAuthor : undefined,
    ratingSum: typeof d.ratingSum === "number" ? d.ratingSum : 0,
    ratingCount: typeof d.ratingCount === "number" ? d.ratingCount : 0,
    addCount: typeof d.addCount === "number" ? d.addCount : 0,
  };
}
