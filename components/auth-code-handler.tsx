"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthCodeHandler() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (!code) return;

    const supabase = createClient();
    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        window.location.replace("/auth/auth-code-error");
        return;
      }

      window.location.replace("/account");
    });
  }, []);

  return null;
}
