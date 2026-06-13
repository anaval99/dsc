import { describe, it, expect } from "vitest";
import { validateRecipeInput } from "./recipeValidation";
import type { RecipeInput } from "@/types/recipe";

function base(overrides: Partial<RecipeInput> = {}): RecipeInput {
  return {
    title: "Test",
    description: "",
    ingredients: [{ name: "flour", qty: "2", unit: "cups" }],
    steps: ["Mix"],
    ...overrides,
  };
}

describe("validateRecipeInput", () => {
  it("accepts a well-formed recipe", () => {
    expect(validateRecipeInput(base()).valid).toBe(true);
  });

  it("rejects an empty title", () => {
    const r = validateRecipeInput(base({ title: "   " }));
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/title/i);
  });

  it("rejects zero ingredients", () => {
    const r = validateRecipeInput(base({ ingredients: [{ name: "", qty: "", unit: "" }] }));
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/ingredient/i);
  });

  it("rejects zero steps", () => {
    const r = validateRecipeInput(base({ steps: ["", "   "] }));
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/step/i);
  });

  it("rejects an unparseable quantity", () => {
    const r = validateRecipeInput(base({ ingredients: [{ name: "flour", qty: "lots", unit: "" }] }));
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/valid quantity/i);
  });

  it("accepts fractional and mixed quantities", () => {
    expect(validateRecipeInput(base({ ingredients: [{ name: "egg", qty: "1 1/2", unit: "" }] })).valid).toBe(true);
    expect(validateRecipeInput(base({ ingredients: [{ name: "milk", qty: "0.5", unit: "cup" }] })).valid).toBe(true);
  });
});
