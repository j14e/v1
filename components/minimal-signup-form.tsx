"use client";

import Image from "next/image";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { parseCourseCodes } from "@/lib/course-codes";
import { yearLevels } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/client";

async function uploadSignupAvatar(profileId: string, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${profileId}/profile.${extension}`;
  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: `${publicUrl}?v=${Date.now()}` })
    .eq("id", profileId);
  if (updateError) throw updateError;
}

export function MinimalSignupForm({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
    const displayName = String(formData.get("display_name") ?? "").trim();
    const yearLevel = String(formData.get("year_level") ?? "");
    const parsed = parseCourseCodes(String(formData.get("courses") ?? ""));
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("password_confirmation") ?? "");

    setIsComplete(
      form.checkValidity()
      && displayName.length >= 2
      && Boolean(yearLevel)
      && !parsed.error
      && password.length >= 8
      && password === confirmation,
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email")).trim().toLowerCase();
    const displayName = String(formData.get("display_name")).trim();
    const yearLevel = String(formData.get("year_level"));
    const parsed = parseCourseCodes(String(formData.get("courses") ?? ""));
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("password_confirmation") ?? "");

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
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      setBusy(false);
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          year_level: yearLevel,
          courses: parsed.courses,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    } else if (!data.session || !data.user) {
      setError("Email confirmation is still enabled. Turn it off temporarily in Supabase before signing up without email verification.");
    } else {
      try {
        if (avatarFile) await uploadSignupAvatar(data.user.id, avatarFile);
        window.location.assign("/");
        return;
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Your account was created, but the profile photo could not be saved.");
      }
    }
    setBusy(false);
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
          disabled={busy}
          onChange={chooseAvatar}
        />
        <small>Optional — choose a photo from your gallery or files. Maximum 3 MB.</small>
      </label>
      <label>
        Email
        <input name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
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
      <label>
        Password
        <input name="password" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" />
      </label>
      <label>
        Confirm password
        <input name="password_confirmation" type="password" required minLength={8} autoComplete="new-password" />
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button sona-primary-button" type="submit" disabled={busy}>
        {busy ? "Sending access link…" : isComplete ? "DONE!" : "doo-doo doo..."}
      </button>
    </form>
  );
}
