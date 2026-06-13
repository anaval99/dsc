/**
 * Firestore security-rules tests (project-plan.md §10). These talk to the
 * Firestore emulator. Run them with:
 *
 *   firebase emulators:exec --only firestore "npm run test:rules"
 *
 * They auto-skip when FIRESTORE_EMULATOR_HOST is unset so CI without an
 * emulator stays green.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, it, expect } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const emulatorRunning = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const d = emulatorRunning ? describe : describe.skip;

const rulesPath = fileURLToPath(new URL("../../firestore.rules", import.meta.url));

function validRecipe(authorUid: string) {
  return {
    title: "Test recipe",
    description: "",
    ingredients: [{ name: "flour", qty: "2/1", unit: "cups" }],
    steps: ["Mix"],
    authorUid,
    authorName: "Tester",
    createdAt: 1,
    updatedAt: 1,
    ratingSum: 0,
    ratingCount: 0,
    addCount: 0,
  };
}

d("firestore.rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "demo-dsc",
      firestore: { rules: readFileSync(rulesPath, "utf8") },
    });
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  async function seedRecipe(id: string, authorUid: string) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "recipes", id), validRecipe(authorUid));
    });
  }

  it("allows public read of recipes", async () => {
    await seedRecipe("r1", "alice");
    const anon = testEnv.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(anon.firestore(), "recipes", "r1")));
  });

  it("lets a signed-in user create a recipe they own", async () => {
    const alice = testEnv.authenticatedContext("alice");
    await assertSucceeds(setDoc(doc(alice.firestore(), "recipes", "r2"), validRecipe("alice")));
  });

  it("rejects creating a recipe owned by someone else", async () => {
    const alice = testEnv.authenticatedContext("alice");
    await assertFails(setDoc(doc(alice.firestore(), "recipes", "r3"), validRecipe("bob")));
  });

  it("rejects creating a recipe with non-zero stat counters", async () => {
    const alice = testEnv.authenticatedContext("alice");
    await assertFails(
      setDoc(doc(alice.firestore(), "recipes", "r4"), { ...validRecipe("alice"), addCount: 5 }),
    );
  });

  it("rejects an unauthenticated create", async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(setDoc(doc(anon.firestore(), "recipes", "r5"), validRecipe("anon")));
  });

  it("lets the owner update content", async () => {
    await seedRecipe("r6", "alice");
    const alice = testEnv.authenticatedContext("alice");
    await assertSucceeds(updateDoc(doc(alice.firestore(), "recipes", "r6"), { title: "Renamed", updatedAt: 2 }));
  });

  it("blocks a non-owner from updating (fork instead)", async () => {
    await seedRecipe("r7", "alice");
    const bob = testEnv.authenticatedContext("bob");
    await assertFails(updateDoc(doc(bob.firestore(), "recipes", "r7"), { title: "Hijacked" }));
  });

  it("blocks a content update from changing stat counters", async () => {
    await seedRecipe("r8", "alice");
    const alice = testEnv.authenticatedContext("alice");
    await assertFails(updateDoc(doc(alice.firestore(), "recipes", "r8"), { addCount: 999 }));
  });

  it("lets a forker create a new owned doc with attribution", async () => {
    await seedRecipe("orig", "alice");
    const bob = testEnv.authenticatedContext("bob");
    await assertSucceeds(
      setDoc(doc(bob.firestore(), "recipes", "fork1"), {
        ...validRecipe("bob"),
        forkedFrom: "orig",
        forkedFromTitle: "Test recipe",
        forkedFromAuthor: "Tester",
      }),
    );
  });

  it("denies direct client writes to the ratings subcollection", async () => {
    await seedRecipe("r9", "alice");
    const anon = testEnv.unauthenticatedContext();
    await assertFails(setDoc(doc(anon.firestore(), "recipes/r9/ratings/ipkey"), { value: 5, createdAt: 1 }));
    const bob = testEnv.authenticatedContext("bob");
    await assertFails(setDoc(doc(bob.firestore(), "recipes/r9/adds/ipkey"), { createdAt: 1 }));
  });

  it("denies recipe deletes", async () => {
    await seedRecipe("r10", "alice");
    const alice = testEnv.authenticatedContext("alice");
    const { deleteDoc } = await import("firebase/firestore");
    await assertFails(deleteDoc(doc(alice.firestore(), "recipes", "r10")));
  });
});
