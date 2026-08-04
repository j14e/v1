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
      <header className="sona-topbar">
        <Link className="sona-wordmark" href="/">SONA</Link>
        <div className="sona-session">
          <span>{name}</span>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <nav className="sona-tabs sona-link-tabs" aria-label="Main navigation">
        <Link href="/">Directory</Link>
        <Link href="/?section=connect">Connect</Link>
        <Link href="/account">Profile</Link>
      </nav>
    </>
  );
}
