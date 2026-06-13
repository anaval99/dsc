import { describe, it, expect } from "vitest";
import {
  buildRecipeLink,
  encodeRecipePayload,
  decodeRecipePayload,
  isWithinLinkLimit,
  toPayload,
  PAYLOAD_VERSION,
  MAX_PAYLOAD_CHARS,
} from "./recipeLink";
import type { RecipeDoc } from "@/types/recipe";

function sampleRecipe(overrides: Partial<RecipeDoc> = {}): RecipeDoc {
  return {
    id: "abc123",
    title: "Soy-glazed something",
    description: "A test recipe with a fraction.",
    ingredients: [
      { name: "soy sauce", qty: "1/1", unit: "cup" },
      { name: "flour", qty: "3/1", unit: "cups" },
      { name: "egg", qty: "3/2", unit: "" },
    ],
    steps: ["Mix it.", "Cook it.", "Eat it."],
    authorUid: "u1",
    authorName: "Tester",
    createdAt: 1,
    updatedAt: 2,
    ratingSum: 0,
    ratingCount: 0,
    addCount: 0,
    ...overrides,
  };
}

describe("toPayload", () => {
  it("carries content only, never stats or authorship", () => {
    const payload = toPayload(sampleRecipe());
    expect(payload).toEqual({
      v: PAYLOAD_VERSION,
      sourceId: "abc123",
      title: "Soy-glazed something",
      description: "A test recipe with a fraction.",
      ingredients: [
        { name: "soy sauce", qty: "1/1", unit: "cup" },
        { name: "flour", qty: "3/1", unit: "cups" },
        { name: "egg", qty: "3/2", unit: "" },
      ],
      steps: ["Mix it.", "Cook it.", "Eat it."],
    });
    expect(payload).not.toHaveProperty("ratingSum");
    expect(payload).not.toHaveProperty("authorUid");
  });

  it("omits an empty description", () => {
    const payload = toPayload(sampleRecipe({ description: undefined }));
    expect(payload).not.toHaveProperty("description");
  });
});

describe("encode ↔ decode round-trip", () => {
  it("recovers the exact payload", () => {
    const recipe = sampleRecipe();
    const encoded = encodeRecipePayload(recipe);
    expect(decodeRecipePayload(encoded)).toEqual(toPayload(recipe));
  });

  it("survives unicode and whitespace in content", () => {
    const recipe = sampleRecipe({
      title: "Crème brûlée 🍮",
      steps: ["Whisk\nthen\trest", "Torch the top — carefully"],
    });
    const decoded = decodeRecipePayload(encodeRecipePayload(recipe));
    expect(decoded?.title).toBe("Crème brûlée 🍮");
    expect(decoded?.steps).toEqual(["Whisk\nthen\trest", "Torch the top — carefully"]);
  });
});

describe("buildRecipeLink", () => {
  it("targets /r/:id with a d= payload param and trims a trailing slash", () => {
    const url = buildRecipeLink("https://dsc.example.com/", sampleRecipe());
    expect(url.startsWith("https://dsc.example.com/r/abc123?d=")).toBe(true);
    const d = new URL(url).searchParams.get("d");
    expect(d).not.toBeNull();
    expect(decodeRecipePayload(d!)?.sourceId).toBe("abc123");
  });
});

describe("decodeRecipePayload — total / non-throwing", () => {
  it("rejects malformed base64url", () => {
    expect(decodeRecipePayload("not base64!!")).toBeNull();
  });

  it("rejects non-JSON content", () => {
    // base64url("hello") — valid base64url, but not JSON.
    expect(decodeRecipePayload("aGVsbG8")).toBeNull();
  });

  it("rejects an unknown version", () => {
    const bad = encodeForTest({ ...toPayload(sampleRecipe()), v: 999 });
    expect(decodeRecipePayload(bad)).toBeNull();
  });

  it("rejects a missing title", () => {
    const p = toPayload(sampleRecipe()) as Record<string, unknown>;
    delete p.title;
    expect(decodeRecipePayload(encodeForTest(p))).toBeNull();
  });

  it("rejects empty ingredients or steps", () => {
    expect(decodeRecipePayload(encodeForTest({ ...toPayload(sampleRecipe()), ingredients: [] }))).toBeNull();
    expect(decodeRecipePayload(encodeForTest({ ...toPayload(sampleRecipe()), steps: [] }))).toBeNull();
  });

  it("rejects an unparseable ingredient qty", () => {
    const p = toPayload(sampleRecipe());
    p.ingredients[0].qty = "not-a-number";
    expect(decodeRecipePayload(encodeForTest(p))).toBeNull();
  });

  it("rejects an oversized payload", () => {
    const huge = "x".repeat(MAX_PAYLOAD_CHARS + 1);
    expect(decodeRecipePayload(huge)).toBeNull();
  });

  it("flags oversized payloads via isWithinLinkLimit", () => {
    const big = sampleRecipe({ steps: Array.from({ length: 500 }, () => "a very long step ".repeat(20)) });
    expect(isWithinLinkLimit(encodeRecipePayload(big))).toBe(false);
    expect(isWithinLinkLimit(encodeRecipePayload(sampleRecipe()))).toBe(true);
  });
});

// Local base64url encoder so tests can craft deliberately-broken payloads
// without importing the module's private helper.
function encodeForTest(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
