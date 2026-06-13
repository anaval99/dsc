/**
 * "Add to Damn Simple Cooking" App-Link codec (project-plan.md §5.4).
 *
 * The link carries the FULL recipe so the offline app needs zero network:
 *   https://dsc.<domain>/r/<sourceId>?d=<base64url(payload)>
 *
 * The payload is small, versioned JSON. This module is the canonical encoding;
 * the app's `recipe_link_codec.dart` must decode byte-for-byte the same thing,
 * so `decodeRecipePayload` here is also total/non-throwing (returns null on any
 * malformed / unknown-version / oversized input) to mirror that contract and to
 * support an encode↔decode round-trip test.
 */

import { parseRational } from "./rational";
import type { RecipeDoc, IngredientDoc } from "@/types/recipe";

export const PAYLOAD_VERSION = 1;

/**
 * Practical Android App-Link URL length cap. Beyond this the recipe page falls
 * back to "open in browser" rather than producing an unusable link.
 */
export const MAX_PAYLOAD_CHARS = 6000;

export interface RecipePayload {
  v: number;
  sourceId: string;
  title: string;
  description?: string;
  ingredients: IngredientDoc[];
  steps: string[];
}

/** Build the versioned payload object from a recipe doc (content only — no stats). */
export function toPayload(recipe: Pick<RecipeDoc, "id" | "title" | "description" | "ingredients" | "steps">): RecipePayload {
  const payload: RecipePayload = {
    v: PAYLOAD_VERSION,
    sourceId: recipe.id,
    title: recipe.title,
    ingredients: recipe.ingredients.map((i) => ({ name: i.name, qty: i.qty, unit: i.unit })),
    steps: [...recipe.steps],
  };
  if (recipe.description) payload.description = recipe.description;
  return payload;
}

export function encodeRecipePayload(recipe: Pick<RecipeDoc, "id" | "title" | "description" | "ingredients" | "steps">): string {
  return base64UrlEncode(JSON.stringify(toPayload(recipe)));
}

/** Build the full App Link. `origin` is e.g. "https://dsc.example.com". */
export function buildRecipeLink(
  origin: string,
  recipe: Pick<RecipeDoc, "id" | "title" | "description" | "ingredients" | "steps">,
): string {
  const d = encodeRecipePayload(recipe);
  const base = origin.replace(/\/+$/, "");
  return `${base}/r/${encodeURIComponent(recipe.id)}?d=${d}`;
}

/** True when the encoded payload fits within the App-Link length budget. */
export function isWithinLinkLimit(encoded: string): boolean {
  return encoded.length <= MAX_PAYLOAD_CHARS;
}

/**
 * Total, non-throwing decode. Returns a validated payload or null. Mirrors the
 * app codec: unknown `v`, malformed base64, missing/invalid fields, or an
 * oversized payload all yield null instead of throwing.
 */
export function decodeRecipePayload(encoded: string): RecipePayload | null {
  if (typeof encoded !== "string" || encoded.length === 0) return null;
  if (encoded.length > MAX_PAYLOAD_CHARS) return null;

  let json: string;
  try {
    json = base64UrlDecode(encoded);
  } catch {
    return null;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }

  return validatePayload(raw);
}

function validatePayload(raw: unknown): RecipePayload | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;

  if (o.v !== PAYLOAD_VERSION) return null;
  if (typeof o.sourceId !== "string" || o.sourceId.length === 0) return null;
  if (typeof o.title !== "string" || o.title.length === 0) return null;
  if (o.description !== undefined && typeof o.description !== "string") return null;

  if (!Array.isArray(o.ingredients) || o.ingredients.length === 0) return null;
  const ingredients: IngredientDoc[] = [];
  for (const item of o.ingredients) {
    if (typeof item !== "object" || item === null) return null;
    const ing = item as Record<string, unknown>;
    if (typeof ing.name !== "string" || ing.name.length === 0) return null;
    if (typeof ing.qty !== "string") return null;
    // qty must be a parseable exact rational so the app can render it.
    if (parseRational(ing.qty) === null) return null;
    if (typeof ing.unit !== "string") return null;
    ingredients.push({ name: ing.name, qty: ing.qty, unit: ing.unit });
  }

  if (!Array.isArray(o.steps) || o.steps.length === 0) return null;
  const steps: string[] = [];
  for (const step of o.steps) {
    if (typeof step !== "string") return null;
    steps.push(step);
  }

  const payload: RecipePayload = {
    v: PAYLOAD_VERSION,
    sourceId: o.sourceId,
    title: o.title,
    ingredients,
    steps,
  };
  if (typeof o.description === "string") payload.description = o.description;
  return payload;
}

// --- base64url helpers (work in both Node and the browser) -----------------

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let b64: string;
  if (typeof btoa === "function") {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    b64 = btoa(binary);
  } else {
    b64 = Buffer.from(bytes).toString("base64");
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(encoded: string): string {
  // Reject anything outside the base64url alphabet up front.
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new Error("invalid base64url");
  }
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  let bytes: Uint8Array;
  if (typeof atob === "function") {
    const binary = atob(b64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  } else {
    bytes = new Uint8Array(Buffer.from(b64, "base64"));
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}
