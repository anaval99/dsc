import type { Metadata } from "next";
import { RecipeForm } from "@/components/RecipeForm";

export const metadata: Metadata = { title: "Fork recipe" };

export default async function ForkRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section>
      <h1 className="page-title">Fork recipe</h1>
      <RecipeForm mode="fork" sourceId={id} />
    </section>
  );
}
