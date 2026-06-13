import type { Metadata } from "next";
import { RecipeForm } from "@/components/RecipeForm";

export const metadata: Metadata = { title: "Edit recipe" };

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section>
      <h1 className="page-title">Edit recipe</h1>
      <RecipeForm mode="edit" sourceId={id} />
    </section>
  );
}
