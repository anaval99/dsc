import type { Metadata } from "next";
import { RecipeForm } from "@/components/RecipeForm";

export const metadata: Metadata = { title: "New recipe" };

export default function NewRecipePage() {
  return (
    <section>
      <h1 className="page-title">New recipe</h1>
      <RecipeForm mode="create" />
    </section>
  );
}
