"use client";

import { useEffect, useState, type FormEvent } from "react";
import { departments, majors, programmes, yearLevels } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/client";

type Mode = "signup" | "signin";

type AuthDialogProps = {
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
};

export function AuthDialog({
  open,
  initialMode = "signup",
  onClose,
}: AuthDialogProps) {
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
    const formData = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email")).trim().toLowerCase(),
      password: String(formData.get("password")),
    });

    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    window.location.reload();
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
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

    const courses = String(formData.get("courses") ?? "")
      .split(",")
      .map((course) => course.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 12);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: String(formData.get("password")),
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          display_name: String(formData.get("display_name")).trim(),
          year_level: String(formData.get("year_level")),
          programme: String(formData.get("programme")),
          department: String(formData.get("department")),
          major: String(formData.get("major")),
          courses,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }

    setNotice(
      "Check your University email and confirm your address. Your profile joins the directory after confirmation.",
    );
    setBusy(false);
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="panel-heading dialog-heading">
          <strong id="auth-title">
            {mode === "signup" ? "Join the directory" : "Member sign in"}
          </strong>
          <button
            className="text-button"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            close
          </button>
        </div>

        {notice ? (
          <div className="dialog-body">
            <div className="notice-box">{notice}</div>
            <button className="button" type="button" onClick={onClose}>
              Return to directory
            </button>
          </div>
        ) : mode === "signup" ? (
          <form className="dialog-body form-grid" onSubmit={handleSignUp}>
            <p className="form-intro">
              Membership is limited to current University of Auckland student
              email addresses.
            </p>
            <label>
              Display name
              <input
                name="display_name"
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
            </label>
            <label>
              University email
              <input
                name="email"
                type="email"
                required
                placeholder="username@aucklanduni.ac.nz"
                pattern=".+@aucklanduni\.ac\.nz"
                autoComplete="email"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label>
              Year
              <select name="year_level" required defaultValue="">
                <option value="" disabled>
                  Select year
                </option>
                {yearLevels.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Programme
              <select name="programme" required defaultValue="">
                <option value="" disabled>
                  Select programme
                </option>
                {programmes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Faculty or department
              <select name="department" required defaultValue="">
                <option value="" disabled>
                  Select faculty
                </option>
                {departments.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Major <span className="optional">(optional)</span>
              <select name="major" defaultValue="">
                <option value="">Not listed</option>
                {majors.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="wide-field">
              Current courses <span className="optional">(optional)</span>
              <input
                name="courses"
                placeholder="COMPSCI 130, STATS 101"
                autoComplete="off"
              />
              <small>Separate course codes with commas.</small>
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button className="button" type="submit" disabled={busy}>
                {busy ? "Creating account…" : "Create account"}
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => setMode("signin")}
              >
                already a member?
              </button>
            </div>
          </form>
        ) : (
          <form className="dialog-body form-grid" onSubmit={handleSignIn}>
            <label className="wide-field">
              University email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
              />
            </label>
            <label className="wide-field">
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-actions">
              <button className="button" type="submit" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => setMode("signup")}
              >
                create an account
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
