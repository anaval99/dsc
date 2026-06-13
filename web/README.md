# Damn Simple Cooking — `/web`

The public recipe site: **Next.js (App Router), server-rendered, hosted on Vercel**, with **Firebase Auth (Google) + Firestore** as the backend. Browsing/reading is public; creating, editing, and forking require a Google sign-in. Ratings and "Adds" are anonymous to visitors but written **server-side** (`/api/stats` → Firebase Admin SDK), so counters can't be forged from the browser.

See the repo-root [`project-plan.md`](../project-plan.md) — it is the source of truth.

## Stack

- **Next.js 15** (App Router, RSC) — server-rendered browse/recipe pages for SEO + social previews.
- **Firebase Web SDK** — Google Auth + authed content writes (gated by Firestore security rules).
- **Firebase Admin SDK** (server-only) — SSR reads and the only writer of stat counters.
- **Vitest** — unit tests (rational/fraction core, App-Link codec, IP hashing, stats logic, validation) + emulator-backed security-rules tests.

## Getting started

```bash
cd web
npm install
cp .env.example .env.local   # fill in Firebase config (or use the emulator)
npm run dev                  # http://localhost:3000
```

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build (also lints + typechecks) |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:rules` | Firestore security-rules tests (needs the emulator) |

## Environment

All values live in `.env.example`. Public Firebase config is `NEXT_PUBLIC_*` (exposed to the browser). Admin credentials (`FIREBASE_ADMIN_*`) and `STATS_IP_HASH_SALT` are **server-only** — set them as Vercel env vars, never commit them.

## Firebase emulator (local dev + rules tests)

```bash
# Firestore + Auth emulators (requires the Firebase CLI + Java)
firebase emulators:start --only firestore,auth

# Security-rules tests against the emulator:
firebase emulators:exec --only firestore "npm run test:rules"
```

The rules tests auto-skip when `FIRESTORE_EMULATOR_HOST` is unset, so plain `npm test` stays green without an emulator. The Admin SDK and client SDK both auto-target the emulator when the relevant env vars are set (see `.env.example`).

## Security model (enforced, not just UI)

- **Recipe content:** public read; create/update only by the authed owner; a content write may **not** change `ratingSum`/`ratingCount`/`addCount`.
- **Stats:** every client write to `ratings/*`, `adds/*`, and the counter fields is **denied**. They're written exclusively by `/api/stats` via the Admin SDK, deduped by a **salted hash of the server-observed client IP** (the raw IP is never stored).

Rules live in [`firestore.rules`](./firestore.rules) and are part of the deliverable.

## App-Link handoff

The recipe page builds an `https://<APP_LINK_ORIGIN>/r/:id?d=<base64url(payload)>` link (`src/lib/recipeLink.ts`) carrying the full recipe, so the offline app needs zero network. The encoding is the canonical contract the app's `recipe_link_codec.dart` must match; an encode↔decode round-trip is covered in `recipeLink.test.ts`. `public/.well-known/assetlinks.json` is the Android App-Link domain association (replace the SHA-256 fingerprint before shipping the app).

## Deploy (Vercel)

Set the root directory to `web/`, add the env vars above, and connect the repo for GitHub-driven deploys. Firebase is backend-only (no Firebase Hosting).
