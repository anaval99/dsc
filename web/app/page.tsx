import { listRecipes } from "@/data/recipes.server";
import { SearchableRecipeList } from "@/components/SearchableRecipeList";

// Reads Firestore on the server per request — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const recipes = await listRecipes();
  return (
    <section>
      <h1 className="page-title">Browse recipes</h1>
      <p className="stats-muted">Find a recipe, then one-tap add it to the offline app.</p>
      <SearchableRecipeList recipes={recipes} />
    </section>
  );
}
