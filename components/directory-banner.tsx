"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BannerSubmission } from "@/types/banner";
import type { SessionUser } from "@/types/profile";

const acceptedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export function DirectoryBanner({
  featured,
  user,
  onRequireSignIn,
}: {
  featured: BannerSubmission | null;
  user: SessionUser;
  onRequireSignIn: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitFile(file: File) {
    if (!user) {
      onRequireSignIn();
      return;
    }

    const extension = acceptedTypes.get(file.type);
    if (!extension) {
      setError("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Showcase images must be under 8 MB.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("directory-banners")
      .upload(path, file, { cacheControl: "3600" });

    if (uploadError) {
      setError(uploadError.message);
      setBusy(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("banner_submissions")
      .insert({
        member_id: user.id,
        file_path: path,
        file_name: file.name.slice(0, 255),
        mime_type: file.type,
      });

    if (insertError) {
      await supabase.storage.from("directory-banners").remove([path]);
      setError(insertError.message);
    } else {
      setMessage("Submitted. Homepage banners are selected randomly.");
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <aside className="banner-rail" aria-label="Member showcase">
      <section className="banner-card">
        <div className="panel-heading">
          <span>random showcase</span>
        </div>
        <div className="banner-display">
          {featured ? (
            <Image
              src={featured.public_url}
              alt={featured.file_name}
              fill
              sizes="(max-width: 780px) 280px, 220px"
            />
          ) : (
            <span className="banner-empty-mark" aria-hidden="true">
              file
            </span>
          )}
        </div>
        <div className="banner-submit">
          <strong>Submit a file, and get displayed here—chosen randomly.</strong>
          <p>Member images rotate on page load.</p>
          {user ? (
            <label className="file-label banner-file-label">
              {busy ? "submitting…" : "submit image"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void submitFile(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          ) : (
            <button
              className="button full-banner-button"
              type="button"
              onClick={onRequireSignIn}
            >
              sign in to submit
            </button>
          )}
          {error ? (
            <p className="form-error banner-feedback" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="form-success banner-feedback" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </section>
    </aside>
  );
}
