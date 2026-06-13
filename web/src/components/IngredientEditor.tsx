/**
 * Ingredient rows for the recipe form (project-plan.md §7): qty + unit (free
 * datalist) + name. Quantities accept whole/decimal/fraction text; the unit
 * suggestions are hints, not a closed set.
 */

"use client";

import type { IngredientDoc } from "@/types/recipe";

const UNIT_SUGGESTIONS = ["cup", "cups", "tsp", "tbsp", "g", "kg", "ml", "l", "oz", "lb", "pinch", "clove"];

export function IngredientEditor({
  ingredients,
  onChange,
}: {
  ingredients: IngredientDoc[];
  onChange: (next: IngredientDoc[]) => void;
}) {
  function update(index: number, patch: Partial<IngredientDoc>) {
    onChange(ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function add() {
    onChange([...ingredients, { name: "", qty: "", unit: "" }]);
  }
  function remove(index: number) {
    onChange(ingredients.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="editor-group">
      <legend>Ingredients</legend>
      <datalist id="unit-suggestions">
        {UNIT_SUGGESTIONS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>

      {ingredients.map((row, i) => (
        <div className="ingredient-row" key={i}>
          <input
            className="ingredient-qty"
            placeholder="1 1/2"
            aria-label={`Ingredient ${i + 1} quantity`}
            value={row.qty}
            onChange={(e) => update(i, { qty: e.target.value })}
          />
          <input
            className="ingredient-unit"
            list="unit-suggestions"
            placeholder="cup"
            aria-label={`Ingredient ${i + 1} unit`}
            value={row.unit}
            onChange={(e) => update(i, { unit: e.target.value })}
          />
          <input
            className="ingredient-name"
            placeholder="flour"
            aria-label={`Ingredient ${i + 1} name`}
            value={row.name}
            onChange={(e) => update(i, { name: e.target.value })}
          />
          <button
            type="button"
            className="btn btn-ghost btn-remove"
            aria-label={`Remove ingredient ${i + 1}`}
            onClick={() => remove(i)}
            disabled={ingredients.length === 1}
          >
            ✕
          </button>
        </div>
      ))}

      <button type="button" className="btn btn-ghost" onClick={add}>
        + Add ingredient
      </button>
    </fieldset>
  );
}
