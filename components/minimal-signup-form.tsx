"use client";

import { useState, type FormEvent } from "react";
import { parseCourseCodes } from "@/lib/course-codes";
import { yearLevels } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/client";

export function MinimalSignupForm({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email")).trim().toLowerCase();
    const displayName = String(formData.get("display_name")).trim();
    const yearLevel = String(formData.get("year_level"));
    const parsed = parseCourseCodes(String(formData.get("courses") ?? ""));

    if (!email.endsWith("@aucklanduni.ac.nz")) {
      setError("Use your @aucklanduni.ac.nz student email.");
      setBusy(false);
      return;
    }
    if (displayName.length < 2) {
      setError("Enter the name you want people to see.");
      setBusy(false);
      return;
    }
    if (!yearLevel) {
      setError("Choose your current year.");
      setBusy(false);
      return;
    }
    if (parsed.error) {
      setError(parsed.error);
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/account`,
        data: {
          display_name: displayName,
          year_level: yearLevel,
          courses: parsed.courses,
        },
      },
    });

    if (signUpError) setError(signUpError.message);
    else {
      setNotice("Check your student inbox for your SONA access link.");
      form.reset();
    }
    setBusy(false);
  }

  if (notice) {
    return <div className="sona-form-notice" role="status">{notice}</div>;
  }

  return (
    <form className={compact ? "sona-signup-form compact" : "sona-signup-form"} onSubmit={handleSubmit}>
      <label>
        Student email
        <input name="email" type="email" required placeholder="you@aucklanduni.ac.nz" pattern=".+@aucklanduni\.ac\.nz" autoComplete="email" />
      </label>
      <label>
        Name
        <input name="display_name" required minLength={2} maxLength={80} placeholder="Your name" autoComplete="name" />
      </label>
      <label>
        Year
        <select name="year_level" required defaultValue="">
          <option value="" disabled>Choose year</option>
          {yearLevels.map((year) => <option key={year}>{year}</option>)}
        </select>
      </label>
      <label>
        Courses
        <input name="courses" required placeholder="DES100, COMPSCI130" autoComplete="off" aria-describedby="course-format-help" />
        <small id="course-format-help">Format example: DES100. Use commas for more than one course.</small>
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button sona-primary-button" type="submit" disabled={busy}>
        {busy ? "Sending access link…" : "Join SONA"}
      </button>
    </form>
  );
}
