# Damn Simple Cooking — Project Plan

A dead-simple, offline-first recipe app, plus a public recipe site that hands recipes to it. The phone app is one searchable list of recipe cards; tap one to read it as a single column of cards (one ingredients card + N step cards). One global **portion ×N** slider scales every quantity proportionally while you cook. No login, no network on the phone — all app data lives on the device. The website is the only piece that touches the cloud (Firebase Auth + Firestore), and exists so people can publish recipes and one-tap "Add to Damn Simple Cooking."

> Sibling project to **Damn Simple Scheduler (dss)**. Same philosophy: one job done plainly; offline-first; forgiving, fat-finger-friendly input; a pure-Dart domain core that's fully unit-testable.

---

## 1. Product summary

Two deliverables in **one repo** (`dsc`), `/mobile` and `/web`:

- **`/mobile` — Damn Simple Cooking (the app).** Flutter, Android, offline-only. A searchable single-column list of recipe cards. Tapping a recipe opens its steps page: a single column of cards — exactly **one ingredients card** followed by **one or more step cards**. While cooking, a single **portion ×N** slider (default ×1, steps of 0.5) scales every ingredient quantity proportionally. Editing is deliberately quarantined on a separate **Edit Recipe** page so you can't fat-finger a change mid-cook.
- **`/web` — the recipe site.** React (Vite). Anyone can browse/read recipes without logging in. To *upload* a recipe you sign in with Google (Firebase Auth) so bots can't spam it; recipes are stored in Firestore. Each recipe page has an **"Add to Damn Simple Cooking"** action — an Android App Link that opens the app and adds that recipe to local storage, with the **full recipe payload embedded in the link** so the app never needs network or Firebase.

### Core principles
- **Damn simple.** The app is two screens (list → steps) plus a quarantined editor. The site is browse → recipe → "Add to app."
- **Offline-first, local-only (app).** Zero network code in `/mobile`. App data never leaves the device. Firebase lives **only** in `/web`.
- **No accidental edits while cooking.** Reading/cooking and editing are different screens. The portion slider is **hidden in edit mode**.
- **Proportional, not "servings."** No servings estimation headache. One global multiplier scales everything from a stored base; the *only* runtime knob is `portion ×N`.
- **Forgiving input.** Quantities accept whole or fractional values; units are a free datalist with common suggestions.
---

## 2. Confirmed requirements & decisions

| Area | Decision |
|---|---|
| Repo layout | **Monorepo `dsc`** with `/mobile` (Flutter app) and `/web` (React site). |
| App platform | Android only (code stays cross-platform-clean; only Android is tested/shipped), mirroring dss. |
| App storage | Local-only, on-device (Drift/SQLite). No sync, no backend, no auth, **no Firebase in the app**. |
| Web stack | React + Vite. Firebase **Auth (Google)** + **Firestore**. |
| Web read access | **Public** — browsing/reading requires no login. |
| Web write access | **Login required (Google) only to upload.** This is the anti-bot gate. |
| Recipe shape | `title`, optional `description`, **one** `ingredients[]` list, **one or more** ordered `steps[]`. |
| Ingredient row | `{ name, qty (rational, whole or fractional), unit }`. |
| Unit input | Free-text **datalist**: common suggestions (cup, tsp, tbsp, g, ml, …) but users may type their own. |
| Quantity display | Decimals rendered as nice fractions: `0.5 → ½`, `1.5 → 1½`. No special-casing — everything scales. |
| Portion slider | **Single global** `portion ×N`. Default **×1**. Steps of **0.5** (valid: 0.5, 1, 1.5, 2, …). Scales **every** ingredient by the same factor. |
| Scaling model | Each ingredient stores a **base qty**; displayed qty = `baseQty × portion`. No per-ingredient sliders. Factor is **runtime/ephemeral** (resets to ×1 on reopen — see §7). |
| Edit safety | Dedicated **Edit Recipe** page; reached from home → recipe card **⋮** → **Edit recipe**. Portion slider is **not shown** in edit mode (editor or adder). |
| App ↔ web handoff | **Android App Link** carrying the **full recipe payload embedded** in the URL. App parses it and writes to local SQLite. No network on the app side. |
| Steps | Ordered free-text blocks. A step does not formally reference ingredients in v1. |
---

## 3. Tech stack & rationale

### `/mobile` (the app)

| Concern | Choice | Why |
|---|---|---|
| Framework | Flutter (stable 3.44.x, Dart 3.12) | Matches dss; great for this UI. |
| State | Riverpod (`flutter_riverpod` v2) | Same as dss. The "scaled ingredient list = base × portion" is a clean computed provider. |
| Persistence | Drift (SQLite) | Type-safe, migration-friendly, durable. Recipes + ingredients + steps as related tables. |
| Rational quantities | A small **rational/fraction** type (numerator/denominator) | Avoids float drift (`0.1+0.2`); makes `½`, `1½` exact and round-trippable. See §5. |
| Fraction formatting | In-house formatter (or a vetted pub package) decimal/ratio → `1½` | Display only; math stays exact. |
| Deep links | `app_links` (or `uni_links`) + Android `intent-filter` | Receive the App Link, parse the embedded recipe payload. |
| IDs | SQLite autoincrement INTEGER PK (local) + a stable `sourceId` (string) from the web payload | Local PK for ordering; `sourceId` so re-adding the same web recipe updates rather than duplicates. |

> **Why no Firebase in the app?** The whole point of "100% offline." The App Link embeds the recipe, so the app reads its own copy and writes to SQLite. The app never authenticates or fetches.

### `/web` (the site)

| Concern | Choice | Why |
|---|---|---|
| Framework | React + **Vite** | Simple, fast, no SSR needed for v1. |
| Auth | Firebase Auth (Google provider) | One-click sign-in; gate uploads against bots. |
| Database | Firestore | Document model fits a recipe cleanly; public read rules, authed write rules. |
| Hosting | Firebase Hosting (assumption) | Co-located with Auth/Firestore; clean App-Link domain association (`assetlinks.json`). |
| Fraction formatting | Shared logic mirrored from the app's formatter (ported to TS) | Identical `½`/`1½` rendering on both sides. |

> **Account creation rule:** the plan never auto-creates accounts. Google sign-in is performed **by the user** in their own browser; the app never enters credentials.
---

## 4. Architecture

### 4.1 `/mobile` — layered, pure-Dart domain core (no Flutter/Drift imports in `domain/`)

```
mobile/lib/
├── main.dart                      # bootstrap: init DB, ProviderScope, deep-link listener, runApp
├── app.dart                       # MaterialApp, theme, routing
│
├── core/
│   ├── theme/                     # color tokens, text styles, spacing
│   ├── rational/                  # Rational type + parse + fraction formatter (½, 1½)
│   └── constants.dart
│
├── domain/                        # PURE DART — no Flutter, no Drift
│   ├── models/
│   │   ├── recipe.dart            # Recipe { id, sourceId?, title, description?, ingredients[], steps[] }
│   │   ├── ingredient.dart        # Ingredient { name, baseQty: Rational, unit }
│   │   ├── step.dart              # RecipeStep { order, text }
│   │   └── portion.dart           # Portion factor value object (>=0.5, multiple of 0.5)
│   └── scaling/
│       └── portion_scaler.dart    # scale(ingredients, portion) -> scaled ingredients (pure)
│
├── data/
│   ├── deeplink/
│   │   └── recipe_link_codec.dart # decode App-Link payload -> domain Recipe (total, non-throwing)
│   ├── database/
│   │   ├── app_database.dart       # Drift DB: Recipes, Ingredients, Steps tables + migrations
│   │   └── recipe_dao.dart
│   └── repositories/
│       └── recipe_repository.dart  # CRUD; maps Drift rows <-> domain Recipe; dedupe by sourceId
│
└── presentation/
    ├── providers/
    │   ├── repository_providers.dart
    │   ├── recipe_list_provider.dart    # watch recipes -> filter by search query
    │   ├── search_query_provider.dart
    │   └── portion_provider.dart        # per-open-recipe ephemeral ×N factor (default 1.0)
    ├── screens/
    │   ├── recipe_list_screen.dart      # HOME: searchable single-column list of recipe cards
    │   ├── recipe_steps_screen.dart     # READ/COOK: ingredients card + step cards + portion slider
    │   └── recipe_editor_screen.dart    # EDIT/ADD: quarantined; NO portion slider
    └── widgets/
        ├── recipe_card.dart             # list row, with ⋮ menu (Edit recipe)
        ├── ingredients_card.dart        # the one ingredients card, with ⋮ menu (Edit portions)
        ├── step_card.dart
        ├── portion_slider.dart          # the single "portion ×N" slider (steps of 0.5)
        ├── portion_dialog.dart          # modal opened from ingredients card ⋮ > Edit portions
        ├── qty_text.dart                # renders a Rational as ½ / 1½
        └── empty_state.dart
```

**Data flow (app).** `RecipeRepository` exposes a reactive stream of stored recipes (Drift `.watch()`). `recipeListProvider` filters by `searchQueryProvider`. On the steps screen, `portionProvider` holds an ephemeral factor; the displayed ingredient list = `portionScaler.scale(recipe.ingredients, factor)`. Edits go through the editor screen → repository → Drift → stream re-emits → list rebuilds. Unidirectional, mirroring dss.

**Deep-link flow.** `main.dart` registers an `app_links` listener (cold-start initial link + warm stream). An incoming App Link → `recipe_link_codec.decode(uri)` → domain `Recipe` → `recipeRepository.upsertBySourceId(recipe)` → navigate to its steps screen. Decoding is **total and non-throwing**: a malformed/oversized/unknown-version payload is dropped with a logged warning and a user-facing snackbar — never a crash.

### 4.2 `/web` — the site

```
web/src/
├── main.tsx
├── App.tsx                  # routes: / (browse), /r/:id (recipe), /new (upload, auth-gated)
├── firebase.ts              # Firebase init (config via env, NOT committed secrets)
├── auth/
│   └── useGoogleAuth.ts     # sign-in/out; the user clicks the Google button themselves
├── data/
│   └── recipes.ts           # Firestore read (public) + write (authed) helpers
├── lib/
│   ├── rational.ts          # mirror of the app's Rational parse/format (½, 1½)
│   └── recipeLink.ts        # build the "Add to Damn Simple Cooking" App Link (encode payload)
├── pages/
│   ├── BrowsePage.tsx       # public list/search of recipes
│   ├── RecipePage.tsx       # public recipe view + "Add to Damn Simple Cooking" button
│   └── UploadPage.tsx       # auth-gated form: title, description, ingredients[], steps[]
└── components/
    ├── RecipeCard.tsx
    ├── IngredientEditor.tsx # qty + unit (datalist) + name rows
    └── StepEditor.tsx
```

**Data flow (web).** Browse/recipe pages read Firestore directly (public read rules). Upload page requires an authed user (Google); on submit it writes a recipe document. The recipe page builds the App Link by encoding the recipe into the URL via `recipeLink.ts`.
---

## 5. Domain model & the two tricky pieces

### 5.1 Recipe (app domain)

```
Recipe {
  int? id                 // local SQLite PK
  String? sourceId        // stable id from the web payload (for dedupe/upsert); null if created in-app
  String title            // required, non-empty
  String? description     // optional
  List<Ingredient> ingredients   // the ONE ingredients card; >= 1 row to be useful
  List<RecipeStep> steps         // >= 1 step
  DateTime createdAt
  DateTime updatedAt
}

Ingredient { String name; Rational baseQty; String unit }   // unit is free text
RecipeStep { int order; String text }
```

**Invariant (one ingredients card, N step cards):** this is a *rendering* rule, not a data rule — a recipe holds exactly one `ingredients` collection (rendered as one card) and an ordered list of steps (one card each). The editor enforces: non-empty title; ≥1 ingredient; ≥1 step before save.

### 5.2 Rational quantities — the fractions problem

Quantities are entered/displayed as whole or fractional values and scaled by multiples of 0.5, so they **must stay exact** (`3 eggs × 0.5 = 1½`, `⅓ cup × 1.5 = ½ cup`). Floats can't do this cleanly.

- **Storage:** store each `baseQty` as an exact rational — **numerator + denominator integers** (recommended). Decision is made in Phase 1 and frozen for the Drift schema.
- **Parsing (input → Rational):** accept `2`, `0.5`, `1.5`, `1/2`, `1 1/2`. (Web reuses the same grammar in TS.)
- **Formatting (Rational → display):** `½, ⅓, ¼, 1½, 2¾, 3` — mixed numbers, common unicode vulgar fractions where they exist, else `a/b`. **Display only; math is always on the exact rational.**
- **Scaling:** `displayQty = baseQty × portion`, where `portion ∈ {0.5, 1, 1.5, …}` is itself rational (`n/2`). Pure multiplication of two rationals → exact result, then format. `portion_scaler.dart` is pure and the most heavily tested unit alongside the formatter.

> Evaluate a vetted pub/npm fraction package vs. a tiny in-house `Rational`. In-house is ~80 lines and avoids a dependency; pick during Phase 1 and mirror the choice in `web/src/lib/rational.ts` so both sides render identically.

### 5.3 Portion scaling — behavior (locked)

- **Exactly one** runtime control: a slider labeled **"portion ×N"**, default **×1**.
- **Step = 0.5**, minimum **0.5**; cap at **×10** for slider sanity (assumption, free to revisit).
- Moving the slider recomputes **every** ingredient's displayed qty as `baseQty × N`. No per-ingredient control exists.
- The factor is **ephemeral per open**: opening a recipe always starts at ×1 (assumption — keeps the cooking view stateless). To persist the last factor per recipe, that's a one-line repository column; flagged in §11.
- The slider is **absent in edit mode** (both the Edit Recipe page and the in-app Add Recipe flow). It lives only on the read/cook steps screen, reachable two ways:
  1. the **portion slider** directly on the steps screen, and
  2. the ingredients card **⋮ → Edit portions** opening **portion_dialog** (a modal with the same slider) — per your spec.

> Worked example: base = `{soy sauce 1 cup, flour 3 cups}`. The slider is the only knob; setting **×2** yields `{2 cups, 6 cups}`. There is no editing of an individual ingredient's quantity at cook time — only the global factor — exactly the "I don't want users estimating servings" behavior.

### 5.4 App-Link payload codec — the handoff

- **Link shape (assumption):** `https://dsc.<yourdomain>/r/<sourceId>?d=<base64url(payload)>` registered as an **Android App Link** (verified via `/.well-known/assetlinks.json` on the web host). The web `RecipePage` builds it with `recipeLink.ts`.
- **Payload:** a small, **versioned** JSON `{ v, sourceId, title, description?, ingredients:[{name, qty, unit}], steps:[...] }`, `qty` serialized as an exact rational string (e.g. `"3/2"`). base64url-encoded in the `d` param so the app needs **zero network**.
- **`/r/:id` also works in a browser** (the web route renders from Firestore) — so the same link is shareable and degrades gracefully if the app isn't installed.
- **Decoding (`recipe_link_codec.dart`) is total/non-throwing:** unknown `v`, malformed base64, missing required fields, or an oversized payload → drop with a logged warning + user snackbar, never crash.
- **Dedupe:** `upsertBySourceId` — adding the same web recipe twice **updates** the local copy instead of duplicating.
- **Size guard:** App Links have practical URL length limits. Define a max payload size; beyond it, fall back to "open in browser" (or a future fetch-by-id path). Decided in Phase 5.
---

## 6. Persistence

### 6.1 App — Drift schema (`schemaVersion = 1`)

Three related tables; computed/scaled quantities are **never stored** (only `baseQty`).

**Recipes**
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | local stable id; list tiebreaker |
| sourceId | TEXT NULL | from web payload; UNIQUE index for upsert/dedupe |
| title | TEXT NOT NULL | non-empty (validated above DB) |
| description | TEXT NULL | optional |
| createdAt | INTEGER (epoch millis) NOT NULL | |
| updatedAt | INTEGER (epoch millis) NOT NULL | |

**Ingredients** (ordered, FK → Recipes.id, `ON DELETE CASCADE`)
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| recipeId | INTEGER NOT NULL | FK |
| position | INTEGER NOT NULL | display order within the one ingredients card |
| name | TEXT NOT NULL | |
| qtyNum | INTEGER NOT NULL | base qty numerator |
| qtyDen | INTEGER NOT NULL | base qty denominator (>0; normalized) |
| unit | TEXT NOT NULL | free text (may be empty for "to taste"-style) |

**Steps** (ordered, FK → Recipes.id, `ON DELETE CASCADE`)
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK AUTOINCREMENT | |
| recipeId | INTEGER NOT NULL | FK |
| position | INTEGER NOT NULL | step order |
| text | TEXT NOT NULL | |

- **Mapping is total & non-throwing:** a malformed ingredient row (e.g. `qtyDen = 0`) is repaired or skipped-and-logged so one bad row never blanks a recipe.
- **Migrations:** start at `schemaVersion = 1` with a documented `MigrationStrategy`; bump per change (Drift-checked) — same discipline as dss.

### 6.2 Web — Firestore

`recipes/{recipeId}` document:

```
{ title, description?, ingredients: [{name, qty:"3/2", unit}], steps: ["…"],
  authorUid, authorName, createdAt, updatedAt }
```

- **Security rules:** `read: if true` (public browse); `create/update: if request.auth != null && request.auth.uid == request.resource.data.authorUid` (only signed-in users, only their own docs). Delete out of scope for v1 (and never performed automatically). **Rules are part of the deliverable**, version-controlled in `/web`.
- `authorUid`/`authorName` come from the Google sign-in; never collected via a form.
---

## 7. UI / UX design direction

Use the `/frontend-design:frontend-design` skill on both surfaces to keep them distinctive and production-grade (consistent with dss).

**App — three screens, single-column everything.**
- **Home (recipe list):** a search field pinned at top; below it a **single column** of recipe cards (title + maybe a one-line description). Each card has a **⋮** menu → **Edit recipe** (the only entry into edit mode). A **+** FAB adds a new recipe (opens the editor with the slider hidden).
- **Recipe steps (read/cook):** a single column — **the one ingredients card first**, then **one card per step**. A **portion ×N slider** is visible here (default ×1). The ingredients card has a **⋮** menu → **Edit portions**, opening the **portion dialog** (same slider in a modal). Quantities render as `1½` etc. via `qty_text`.
- **Edit Recipe / Add Recipe (editor):** title, optional description, an **ingredients editor** (rows of qty + unit-datalist + name, reorderable), and a **steps editor** (reorderable text blocks). **No portion slider anywhere in edit mode.** Save / (on edit) Delete.
- **Empty state:** friendly prompt pointing at **+** and at the website.
- **Accessibility:** large tap targets; the slider exposes its current ×N as text; fractions have semantic labels.

**Web — three routes.**
- **Browse (`/`):** public, searchable grid/list of recipe cards.
- **Recipe (`/r/:id`):** public read view + a prominent **"Add to Damn Simple Cooking"** button (the App Link). Shows fractions identically to the app.
- **Upload (`/new`):** **auth-gated.** A clear "Sign in with Google to publish" button (the user clicks it themselves). Form mirrors the app's editor: title, description, ingredient rows (qty + unit datalist + name), step blocks.

---

## 8. Edge cases & rules (locked)

- **Exact fractions only.** All quantity math is on rationals; never on floats. `qtyDen > 0`, fractions normalized (gcd-reduced). The `0.1 + 0.2` class of bug is structurally impossible.
- **Portion factor domain.** `N` is a multiple of 0.5, `N ≥ 0.5`; default `1`. Slider can't produce other values.
- **One global multiplier.** Every ingredient scales by the same `N`. No per-ingredient scaling, ever.
- **Scaling is display-time.** `baseQty` is the source of truth; scaled values are computed, never persisted. Reopening a recipe resets to ×1 (assumption — see §11 to persist instead).
- **Edit/cook separation.** Edit mode is reachable **only** via home → card ⋮ → Edit recipe (and the + adder). The portion slider never appears in edit mode → no accidental edits while cooking.
- **Deep-link decoding is total/non-throwing.** Malformed/oversized/unknown-version payloads → logged + snackbar, never crash. Unknown `v` is forward-safe.
- **Dedupe by `sourceId`.** Re-adding the same web recipe updates the local copy.
- **App is offline.** No network calls in `/mobile`. The App-Link payload is self-contained.
- **Web write gate.** Uploads require Google auth; reads are public. Enforced in Firestore rules, not just UI.
- **No auto-account / no auto-auth / no auto-share.** Sign-in and any sharing are user-initiated in the browser.
- **Unit is free text** (datalist suggestions are hints, not a closed set). Empty unit allowed (e.g. "2 eggs").
---

## 9. Build phases & milestones

Each phase is independently runnable/testable. **App v1 = Phases 1–7; Web v1 = Phases W1–W3.** They can proceed in parallel after the shared rational spec (Phase 1) is frozen.

### App
| Phase | Deliverable | Key tests |
|---|---|---|
| **0. Scaffold** | Flutter project under `/mobile`, app id `damn.simple.cooking`, monorepo git init. | builds & runs empty app |
| **1. Domain core** | `Rational` (parse/format ½,1½), `Recipe`/`Ingredient`/`RecipeStep`, `Portion`, **`portion_scaler`** (pure). **Freeze the rational serialization + table column layout here.** | Heavy unit tests: parse/format fractions; scale by 0.5/1/1.5/2; `3 eggs×0.5=1½`; gcd-reduce; exactness |
| **2. Persistence** | Drift DB (`schemaVersion=1`): Recipes/Ingredients/Steps + cascade; `RecipeRepository` CRUD; total non-throwing mapping; **`upsertBySourceId`**. | In-memory DB CRUD; round-trip rationals; dedupe; malformed-row tolerance |
| **3. State layer** | Riverpod providers: `recipeListProvider`, `searchQueryProvider`, `portionProvider`. | Provider tests with fake repo; search filtering; scaling via provider |
| **4. Home list** | Searchable single-column recipe list; `recipe_card` with ⋮ → Edit recipe; + FAB; empty state. | Widget: search filters; ⋮ menu routes to editor |
| **5. Steps + portion + deep links** | Steps screen (ingredients card + step cards); **portion slider**; ingredients ⋮ → **Edit portions** dialog; `qty_text` fractions. `app_links` + intent-filter + `recipe_link_codec`; cold-start & warm link → upsert → open. | Widget: slider scales all rows; dialog mirrors slider; codec decode (valid/malformed/unknown-version) |
| **6. Editor** | Add/Edit Recipe page (ingredient rows w/ unit datalist, step blocks, reorder); save/delete; **no slider in edit mode**; validation (title/≥1 ingredient/≥1 step). | Create→appears in list; edit persists; delete; validation blocks |
| **7. Design polish** | `frontend-design` pass: tokens, dark mode, spacing, motion, a11y labels. | Manual + optional goldens |

### Web
| Phase | Deliverable | Key tests |
|---|---|---|
| **W0. Scaffold** | React+Vite under `/web`; Firebase init via env; `rational.ts` ported from Phase 1. | builds; rational parity tests vs app fixtures |
| **W1. Browse + read** | `BrowsePage` (public list/search) + `RecipePage` (public view), reading Firestore. | render from fixture docs; fraction parity |
| **W2. Auth + upload** | Google sign-in; auth-gated `UploadPage`; Firestore write; **security rules** committed. | rules unit tests (emulator): public read, authed-own-write only |
| **W3. App Link** | `recipeLink.ts` builds the `https://dsc.<domain>/r/:id?d=…` link; **"Add to Damn Simple Cooking"** button; `assetlinks.json` for App-Link verification + intent-filter parity with the app. | encode↔decode round-trip with the app's `recipe_link_codec`; link opens app and adds recipe (manual on-device) |

---

## 10. Testing strategy

- **Unit (heaviest):** `Rational` parse/format and `portion_scaler` are the correctness-critical core — table-driven tests. Mandatory cases:
  - Fraction formatting: `1/2→½`, `3/2→1½`, `1/3→⅓`, `11/4→2¾`, integers print plain.
  - Scaling exactness: `3 × 0.5 = 3/2 (1½)`; `1/3 × 3/2 = 1/2`; `1 cup × 2 = 2`; the soy-sauce/flour example end-to-end.
  - gcd reduction & `qtyDen>0` invariant; parse round-trips (`1 1/2`, `0.5`, `1/2`).
- **Codec:** `recipe_link_codec` decode of valid payloads (every field), and total/non-throwing handling of malformed base64, missing fields, unknown `v`, and oversized payloads.
- **Repository:** Drift in-memory DB; full CRUD + round-trip of recipes with ingredients/steps; `upsertBySourceId` dedupe; cascade delete; malformed-row tolerance (e.g. `qtyDen=0`).
- **Provider:** fake repo; search filtering; portion provider scales the derived list deterministically; ephemeral reset to ×1 on reopen.
- **Widget:** home search; ⋮ → Edit recipe routing; steps screen renders ingredients-card-then-steps; slider + portion dialog both scale every row; editor validation blocks empty title / 0 ingredients / 0 steps; **no slider present in edit mode**.
- **Web:** Firestore **security-rules tests** on the emulator (public read; authed users write only their own docs); rational parity tests sharing the same fixtures as the app; encode↔decode round-trip between `recipeLink.ts` and `recipe_link_codec.dart`.
- A fixed/injectable clock keeps any time-based tests deterministic (mirrors dss).

---

## 11. Open items / future (post-v1)

- Persist last portion factor per recipe (currently ephemeral, resets to ×1).
- Recipe photo/image (app + web).
- Step ↔ ingredient references (e.g. tap a step to highlight ingredients used).
- Fetch-by-id fallback for oversized recipes (app would then need a one-off network read — breaks pure-offline, so opt-in only).
- Web: edit/delete own recipes; report/flag; pagination/full-text search.
- App: export/share a recipe back out as an App Link; categories/tags; iOS build & store packaging.

---

_Decisions captured 2026-06-10. This plan is the source of truth; update it as scope evolves._
