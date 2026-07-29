"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function SimpleHeader({ name }: { name: string }) {
  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <>
      <header className="topbar">
        <Link className="wordmark" href="/">
          v1
        </Link>
        <nav className="primary-nav" aria-label="Main navigation">
          <Link href="/">directory</Link>
          <Link href="/account">my profile</Link>
        </nav>
        <div className="member-actions">
          <span className="signed-in-as">signed in as {name}</span>
          <button className="nav-button" type="button" onClick={signOut}>
            sign out
          </button>
        </div>
      </header>
      <div className="utility-strip">
        <strong>University of Auckland</strong>
        <span>student contact directory</span>
        <Link className="back-link" href="/">
          ← back to directory
        </Link>
      </div>
    </>
  );
}
