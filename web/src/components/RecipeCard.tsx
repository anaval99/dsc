/**
 * Browse-list recipe card (project-plan.md §7). Title, optional one-line
 * description, and a compact stats badge. Server-renderable.
 */

import Link from "next/link";
import { StatsBadge } from "./StatsBadge";
import type { RecipeDoc } from "@/types/recipe";

export function RecipeCard({ recipe }: { recipe: RecipeDoc }) {
  return (
    <Link href={`/r/${recipe.id}`} className="recipe-card">
      <h2 className="recipe-card-title">{recipe.title}</h2>
      {recipe.description ? <p className="recipe-card-desc">{recipe.description}</p> : null}
      <div className="recipe-card-meta">
        <span className="recipe-card-author">by {recipe.authorName}</span>
        <StatsBadge stats={recipe} />
      </div>
    </Link>
  );
}
