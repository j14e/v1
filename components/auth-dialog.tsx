"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MinimalSignupForm } from "@/components/minimal-signup-form";
import { createClient } from "@/lib/supabase/client";

type Mode = "signup" | "signin";

type AuthDialogProps = {
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
};

export function AuthDialog({ open, initialMode = "signup", onClose }: AuthDialogProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError("");
      setNotice("");
    }
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim().toLowerCase();

    if (!email.endsWith("@aucklanduni.ac.nz")) {
      setError("Use your @aucklanduni.ac.nz student email.");
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
      },
    });

    if (signInError) setError(signInError.message);
    else setNotice("Check your University email for your SONA sign-in link.");
    setBusy(false);
  }

  return (
    <div className="dialog-backdrop sona-dialog-backdrop" onMouseDown={onClose}>
      <section className="auth-dialog sona-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sona-dialog-heading">
          <div>
            <span className="sona-dialog-mark">SONA</span>
            <strong id="auth-title">{mode === "signup" ? "Join the directory" : "Sign in"}</strong>
          </div>
          <button className="sona-icon-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="sona-dialog-body">
          {notice ? (
            <div className="sona-form-notice" role="status">{notice}</div>
          ) : mode === "signup" ? (
            <MinimalSignupForm compact />
          ) : (
            <form className="sona-signin-form" onSubmit={handleSignIn}>
              <p>We will email you a secure sign-in link.</p>
              <label>
                University email
                <input name="email" type="email" required placeholder="you@aucklanduni.ac.nz" autoComplete="email" />
              </label>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <button className="button sona-primary-button" type="submit" disabled={busy}>
                {busy ? "Sending link…" : "Email me a sign-in link"}
              </button>
            </form>
          )}
          <button className="sona-mode-button" type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
            {mode === "signup" ? "Already on SONA? Sign in" : "New to SONA? Join now"}
          </button>
        </div>
      </section>
    </div>
  );
}
