/**
 * Header sign-in/out control (project-plan.md §3). The user clicks "Sign in
 * with Google" themselves; we never enter credentials or auto-create accounts.
 */

"use client";

import { useGoogleAuth } from "@/auth/useGoogleAuth";

export function AuthButton() {
  const { user, loading, signIn, signOut } = useGoogleAuth();

  if (loading) {
    return <span className="auth-status stats-muted">…</span>;
  }

  if (user) {
    return (
      <span className="auth-status">
        <span className="auth-name">{user.displayName ?? "Signed in"}</span>
        <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
          Sign out
        </button>
      </span>
    );
  }

  return (
    <button type="button" className="btn btn-ghost" onClick={() => void signIn()}>
      Sign in with Google
    </button>
  );
}
