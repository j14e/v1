"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { parseCourseCodes } from "@/lib/course-codes";
import { yearLevels } from "@/lib/catalog";
import { savePendingSignupAvatar } from "@/lib/pending-signup-avatar";
import { createClient } from "@/lib/supabase/client";

export function MinimalSignupForm({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return;
    }

    const preview = URL.createObjectURL(avatarFile);
    setAvatarPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [avatarFile]);

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use a JPG, PNG, or WebP profile photo.");
      event.target.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Profile photos must be under 3 MB.");
      event.target.value = "";
      return;
    }

    setError("");
    setAvatarFile(file);
  }

  function updateCompletion(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const displayName = String(formData.get("display_name") ?? "").trim();
    const yearLevel = String(formData.get("year_level") ?? "");
    const parsed = parseCourseCodes(String(formData.get("courses") ?? ""));

    setIsComplete(
      form.checkValidity()
      && email.endsWith("@aucklanduni.ac.nz")
      && displayName.length >= 2
      && Boolean(yearLevel)
      && !parsed.error,
    );
  }

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
    if (avatarFile) {
      try {
        await savePendingSignupAvatar(email, avatarFile);
      } catch {
        setError("Your photo could not be saved. Choose it again and retry.");
        setBusy(false);
        return;
      }
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
      setNotice(avatarFile
        ? "Check your student inbox for your SONA access link. Your photo will be added when you sign in."
        : "Check your student inbox for your SONA access link.");
      form.reset();
      setAvatarFile(null);
      setIsComplete(false);
    }
    setBusy(false);
  }

  if (notice) {
    return <div className="sona-form-notice" role="status">{notice}</div>;
  }

  return (
    <form
      className={compact ? "sona-signup-form compact" : "sona-signup-form"}
      onSubmit={handleSubmit}
      onInput={updateCompletion}
      onChange={updateCompletion}
    >
      <label className="sona-selfie-field">
        <strong>Take a selfie!</strong>
        <span className={avatarPreview ? "sona-selfie-preview selected" : "sona-selfie-preview"}>
          {avatarPreview ? (
            <Image src={avatarPreview} alt="Selected profile photo" fill sizes="112px" unoptimized />
          ) : (
            <span aria-hidden="true">Add photo</span>
          )}
        </span>
        <input
          name="avatar"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          disabled={busy}
          onChange={chooseAvatar}
        />
        <small>Optional — use the front camera or choose a photo. Maximum 3 MB.</small>
      </label>
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
        {busy ? "Sending access link…" : isComplete ? "DONE!" : "doo-doo doo..."}
      </button>
    </form>
  );
}
