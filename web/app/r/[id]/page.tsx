import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRecipe } from "@/data/recipes.server";
import { averageRating } from "@/lib/stats";
import { buildRecipeLink, encodeRecipePayload, isWithinLinkLimit } from "@/lib/recipeLink";
import { QtyText } from "@/components/QtyText";
import { StarRating } from "@/components/StarRating";
import { ForkAttribution } from "@/components/ForkAttribution";
import { RecipeActions } from "@/components/RecipeActions";
import { AddToAppButton } from "@/components/AddToAppButton";

export const dynamic = "force-dynamic";

const APP_LINK_ORIGIN = process.env.NEXT_PUBLIC_APP_LINK_ORIGIN ?? "https://dsc.example.com";

type Params = { params: Promise<{ id: string }> };

// Dynamic OG/meta tags for rich link previews and crawlability (project-plan.md §4.2).
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) {
    return { title: "Recipe not found" };
  }
  const avg = averageRating(recipe);
  const ratingNote = recipe.ratingCount > 0 ? ` · ★ ${avg.toFixed(1)} (${recipe.ratingCount})` : "";
  const description = recipe.description ?? `A recipe by ${recipe.authorName}${ratingNote}`;
  return {
    title: recipe.title,
    description,
    openGraph: {
      title: recipe.title,
      description,
      type: "article",
    },
  };
}

export default async function RecipePage({ params }: Params) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  const encoded = encodeRecipePayload(recipe);
  const appLink = buildRecipeLink(APP_LINK_ORIGIN, recipe);
  const oversized = !isWithinLinkLimit(encoded);

  return (
    <article className="recipe-page">
      <ForkAttribution recipe={recipe} />
      <h1 className="recipe-title">{recipe.title}</h1>
      <p className="recipe-byline">by {recipe.authorName}</p>
      {recipe.description ? <p>{recipe.description}</p> : null}

      <div className="recipe-section">
        <StarRating recipeId={recipe.id} initial={recipe} />
      </div>

      <AddToAppButton recipeId={recipe.id} appLink={appLink} oversized={oversized} />
      <RecipeActions recipeId={recipe.id} authorUid={recipe.authorUid} />

      <section className="recipe-section">
        <h2>Ingredients</h2>
        <ul className="ingredient-list">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>
              <QtyText qty={ing.qty} unit={ing.unit} />
              <span className="ingredient-name-text">{ing.name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="recipe-section">
        <h2>Steps</h2>
        <ol className="steps-list">
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>
    </article>
  );
}
