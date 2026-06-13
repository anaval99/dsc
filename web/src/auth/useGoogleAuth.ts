/**
 * Google sign-in hook (project-plan.md §3). The user clicks the Google button
 * themselves — the app never enters credentials and never auto-creates accounts.
 * Exposes the current user, a loading flag, and sign-in/out actions.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { getClientAuth } from "@/firebase.client";

export interface GoogleAuthState {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useGoogleAuth(): GoogleAuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(getClientAuth(), (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(getClientAuth(), provider);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(getClientAuth());
  }, []);

  return { user, loading, signIn, signOut };
}
