/**
 * Recipe form validation (project-plan.md §5.1, §10). The web form is the only
 * authoring surface, so it enforces the recipe invariants before save:
 * non-empty title, ≥1 ingredient with a parseable qty, ≥1 step.
 */

import { parseRational } from "./rational";
import type { RecipeInput } from "@/types/recipe";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRecipeInput(input: RecipeInput): ValidationResult {
  const errors: string[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push("Title is required.");
  }

  const ingredients = input.ingredients.filter((i) => i.name.trim().length > 0);
  if (ingredients.length === 0) {
    errors.push("Add at least one ingredient.");
  }
  for (const ing of ingredients) {
    if (ing.qty.trim().length === 0) {
      errors.push(`Quantity is required for "${ing.name.trim()}".`);
    } else if (parseRational(ing.qty) === null) {
      errors.push(`"${ing.qty}" isn't a valid quantity for "${ing.name.trim()}".`);
    }
  }

  const steps = input.steps.filter((s) => s.trim().length > 0);
  if (steps.length === 0) {
    errors.push("Add at least one step.");
  }

  return { valid: errors.length === 0, errors };
}
