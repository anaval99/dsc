/**
 * Firebase ADMIN SDK — SERVER ONLY (project-plan.md §3). Bypasses security
 * rules, so this is the ONLY place stat counters and marker docs are written,
 * and the source of truth for server-rendered Firestore reads.
 *
 * Credentials come from FIREBASE_ADMIN_* env vars (Vercel env in prod, never
 * committed). When FIRESTORE_EMULATOR_HOST is set the Admin SDK auto-targets
 * the emulator, so local dev/tests need no real service account.
 */

import "server-only";
import { initializeApp, getApps, getApp, cert, applicationDefault, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let cachedAdminApp: App | null = null;
let cachedAdminDb: Firestore | null = null;

function initAdminApp(): App {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  // Against the emulator, no real credentials are required.
  if (usingEmulator && !clientEmail) {
    return initializeApp({ projectId: projectId ?? "demo-dsc" });
  }

  if (clientEmail && privateKey && projectId) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  }

  // Fallback to GOOGLE_APPLICATION_CREDENTIALS / platform-provided creds.
  return initializeApp({ credential: applicationDefault(), projectId });
}

export function getAdminApp(): App {
  if (!cachedAdminApp) cachedAdminApp = initAdminApp();
  return cachedAdminApp;
}

export function getAdminDb(): Firestore {
  if (!cachedAdminDb) cachedAdminDb = getFirestore(getAdminApp());
  return cachedAdminDb;
}
