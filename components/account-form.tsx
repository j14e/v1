"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { parseCourseCodes } from "@/lib/course-codes";
import { departments, majors, programmeGroups, yearLevels } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/profile";

export function AccountForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  async function uploadAvatar(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Profile images must be under 3 MB.");
      return;
    }

    setBusy(true);
    setError("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${profile.id}/profile.${extension}`;
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setError(uploadError.message);
      setBusy(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const versionedUrl = `${publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: versionedUrl })
      .eq("id", profile.id);

    if (updateError) setError(updateError.message);
    else {
      setAvatarUrl(versionedUrl);
      setMessage("Profile picture updated.");
      router.refresh();
    }
    setBusy(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const parsed = parseCourseCodes(String(formData.get("courses") ?? ""));
    if (parsed.error) {
      setError(parsed.error);
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: String(formData.get("display_name")).trim(),
        year_level: String(formData.get("year_level")),
        programme: String(formData.get("programme")),
        department: String(formData.get("department")),
        major: String(formData.get("major")) || null,
        courses: parsed.courses,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (updateError) setError(updateError.message);
    else {
      setMessage("Profile saved.");
      router.refresh();
    }
    setBusy(false);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("password_confirmation") ?? "");

    setPasswordError("");
    setPasswordMessage("");
    if (password.length < 8) {
      setPasswordError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setPasswordError("The passwords do not match.");
      return;
    }

    setPasswordBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setPasswordError(updateError.message);
    else {
      setPasswordMessage("Password saved. You can now sign in with email and password.");
      form.reset();
    }
    setPasswordBusy(false);
  }

  return (
    <section className="account-card">
      <div className="profile-titlebar">
        <h1>My profile</h1>
        <span>{profile.verified ? "verified" : "awaiting email confirmation"}</span>
      </div>
      <div className="account-layout">
        <aside className="avatar-editor">
          <Avatar name={profile.display_name} url={avatarUrl} size="large" />
          <label className="file-label">
            choose profile picture
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAvatar(file);
              }}
            />
          </label>
          <small>JPG, PNG, or WebP. Maximum 3 MB.</small>
        </aside>
        <div className="account-form-stack">
          <form className="account-form form-grid" onSubmit={saveProfile}>
          <label>
            Display name
            <input
              name="display_name"
              required
              minLength={2}
              maxLength={80}
              defaultValue={profile.display_name}
            />
          </label>
          <label>
            Student email
            <input value={profile.email} readOnly aria-readonly="true" />
          </label>
          <label>
            Year
            <select
              name="year_level"
              required
              defaultValue={profile.year_level}
            >
              {yearLevels.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Programme
            <select name="programme" defaultValue={profile.programme ?? ""}>
              <option value="">Not listed</option>
              {programmeGroups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            Faculty or department
            <select
              name="department"
              defaultValue={profile.department ?? ""}
            >
              <option value="">Not listed</option>
              {departments.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Major <span className="optional">(optional)</span>
            <select name="major" defaultValue={profile.major ?? ""}>
              <option value="">Not listed</option>
              {majors.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="wide-field">
            Current courses
            <input name="courses" required placeholder="DES100, COMPSCI130" defaultValue={profile.courses.join(", ")} />
            <small>Use course codes like DES100, separated by commas.</small>
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}
          <div className="form-actions">
            <button className="button" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save profile"}
            </button>
            <a href={`/people/${profile.id}`}>view public profile</a>
          </div>
          </form>
          <form className="account-password-form form-grid" onSubmit={savePassword}>
            <h2>Password</h2>
            <label>
              New password
              <input name="password" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            <label>
              Confirm password
              <input name="password_confirmation" type="password" required minLength={8} autoComplete="new-password" />
            </label>
            {passwordError ? <p className="form-error" role="alert">{passwordError}</p> : null}
            {passwordMessage ? <p className="form-success" role="status">{passwordMessage}</p> : null}
            <div className="form-actions">
              <button className="button" type="submit" disabled={passwordBusy}>
                {passwordBusy ? "Saving…" : "Save password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
