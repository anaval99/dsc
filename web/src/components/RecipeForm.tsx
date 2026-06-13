/**
 * Unified auth-gated recipe form — create / edit / fork (project-plan.md §4.2).
 * One form, three modes:
 *  - create: empty → new owned doc
 *  - edit:   owner-only; loads the doc, writes back to the SAME doc
 *  - fork:   loads any recipe, seeds the form, writes a NEW owned doc with
 *            forkedFrom* attribution. The original is never modified.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleAuth } from "@/auth/useGoogleAuth";
import { IngredientEditor } from "./IngredientEditor";
import { StepEditor } from "./StepEditor";
import { fetchRecipe, createRecipe, updateRecipe, forkRecipe } from "@/data/recipes.client";
import { validateRecipeInput } from "@/lib/recipeValidation";
import type { RecipeDoc, RecipeInput, ForkAttribution } from "@/types/recipe";

type Mode = "create" | "edit" | "fork";

const EMPTY: RecipeInput = {
  title: "",
  description: "",
  ingredients: [{ name: "", qty: "", unit: "" }],
  steps: [""],
};

function toInput(recipe: RecipeDoc): RecipeInput {
  return {
    title: recipe.title,
    description: recipe.description ?? "",
    ingredients: recipe.ingredients.length ? recipe.ingredients.map((i) => ({ ...i })) : [{ name: "", qty: "", unit: "" }],
    steps: recipe.steps.length ? [...recipe.steps] : [""],
  };
}

export function RecipeForm({ mode, sourceId }: { mode: Mode; sourceId?: string }) {
  const router = useRouter();
  const { user, loading: authLoading, signIn } = useGoogleAuth();

  const [input, setInput] = useState<RecipeInput>(EMPTY);
  const [source, setSource] = useState<RecipeDoc | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(mode !== "create");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Load the source recipe for edit / fork.
  useEffect(() => {
    if (mode === "create" || !sourceId) {
      setLoadingDoc(false);
      return;
    }
    let active = true;
    setLoadingDoc(true);
    fetchRecipe(sourceId)
      .then((recipe) => {
        if (!active) return;
        if (!recipe) {
          setLoadError("Recipe not found.");
        } else {
          setSource(recipe);
          setInput(toInput(recipe));
        }
      })
      .catch(() => active && setLoadError("Couldn't load this recipe."))
      .finally(() => active && setLoadingDoc(false));
    return () => {
      active = false;
    };
  }, [mode, sourceId]);

  if (authLoading || loadingDoc) {
    return <p className="form-status">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="auth-gate">
        <p>Sign in with Google to {mode === "fork" ? "fork" : mode} a recipe.</p>
        <button type="button" className="btn btn-primary" onClick={() => void signIn()}>
          Sign in with Google
        </button>
      </div>
    );
  }

  if (loadError) {
    return <p className="form-error">{loadError}</p>;
  }

  // Edit is owner-only.
  if (mode === "edit" && source && source.authorUid !== user.uid) {
    return <p className="form-error">You can only edit recipes you created. Try forking it instead.</p>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateRecipeInput(input);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      let id: string;
      if (mode === "create") {
        id = await createRecipe(user!, input);
      } else if (mode === "edit") {
        await updateRecipe(sourceId!, input);
        id = sourceId!;
      } else {
        const attribution: ForkAttribution = {
          forkedFrom: source!.id,
          forkedFromTitle: source!.title,
          forkedFromAuthor: source!.authorName,
        };
        id = await forkRecipe(user!, input, attribution);
      }
      router.push(`/r/${id}`);
    } catch (err) {
      console.error(err);
      setErrors(["Couldn't save. Please try again."]);
      setSaving(false);
    }
  }

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      {mode === "fork" && source ? (
        <p className="fork-note">
          Forking <strong>{source.title}</strong> by {source.authorName}. This creates a new recipe you own,
          with attribution back to the original.
        </p>
      ) : null}

      <label className="field">
        <span className="field-label">Title</span>
        <input
          className="field-input"
          value={input.title}
          onChange={(e) => setInput({ ...input, title: e.target.value })}
          placeholder="Damn good spaghetti"
        />
      </label>

      <label className="field">
        <span className="field-label">Description (optional)</span>
        <textarea
          className="field-input"
          rows={2}
          value={input.description ?? ""}
          onChange={(e) => setInput({ ...input, description: e.target.value })}
          placeholder="A one-liner about this recipe."
        />
      </label>

      <IngredientEditor ingredients={input.ingredients} onChange={(ingredients) => setInput({ ...input, ingredients })} />
      <StepEditor steps={input.steps} onChange={(steps) => setInput({ ...input, steps })} />

      {errors.length > 0 ? (
        <ul className="form-errors">
          {errors.map((err) => (
            <li key={err} className="form-error">
              {err}
            </li>
          ))}
        </ul>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Saving…" : mode === "create" ? "Publish recipe" : mode === "edit" ? "Save changes" : "Create fork"}
      </button>
    </form>
  );
}
