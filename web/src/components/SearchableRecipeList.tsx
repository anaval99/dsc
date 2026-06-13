/**
 * Browse list with client-side search (project-plan.md §7). Recipes are fetched
 * server-side and passed in already rendered into HTML; this only filters them
 * by the search box, keeping the initial render crawlable.
 */

"use client";

import { useMemo, useState } from "react";
import { RecipeCard } from "./RecipeCard";
import type { RecipeDoc } from "@/types/recipe";

export function SearchableRecipeList({ recipes }: { recipes: RecipeDoc[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r) => {
      const haystack = `${r.title} ${r.description ?? ""} ${r.authorName}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [recipes, query]);

  return (
    <div className="browse">
      <input
        type="search"
        className="search-input"
        placeholder="Search recipes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search recipes"
      />
      {filtered.length === 0 ? (
        <p className="empty-state">
          {recipes.length === 0
            ? "No recipes yet. Sign in and create the first one!"
            : "No recipes match your search."}
        </p>
      ) : (
        <ul className="recipe-grid">
          {filtered.map((r) => (
            <li key={r.id}>
              <RecipeCard recipe={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
