/**
 * "Forked from <title> by <author>" line shown on a forked recipe
 * (project-plan.md §4.2). Links back to the original.
 */

import Link from "next/link";
import type { RecipeDoc } from "@/types/recipe";

export function ForkAttribution({ recipe }: { recipe: RecipeDoc }) {
  if (!recipe.forkedFrom) return null;
  return (
    <p className="fork-attribution">
      Forked from{" "}
      <Link href={`/r/${recipe.forkedFrom}`}>{recipe.forkedFromTitle ?? "the original"}</Link>
      {recipe.forkedFromAuthor ? ` by ${recipe.forkedFromAuthor}` : null}
    </p>
  );
}
