import type { Metadata } from "next";
import Link from "next/link";
import { AuthButton } from "@/components/AuthButton";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Damn Simple Cooking",
    template: "%s · Damn Simple Cooking",
  },
  description:
    "A dead-simple public recipe site. Browse, rate, and one-tap add recipes to the offline Damn Simple Cooking app.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="site-logo">
            Damn Simple Cooking
          </Link>
          <nav className="site-nav">
            <Link href="/new" className="btn btn-primary">
              New recipe
            </Link>
            <AuthButton />
          </nav>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <span>Recipes are public. Authoring requires a Google sign-in.</span>
        </footer>
      </body>
    </html>
  );
}
