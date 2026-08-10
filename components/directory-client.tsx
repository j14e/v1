"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthDialog } from "@/components/auth-dialog";
import { Avatar } from "@/components/avatar";
import { LiveMatchPanel } from "@/components/live-match-panel";
import { SonaLogo } from "@/components/sona-logo";
import { createClient } from "@/lib/supabase/client";
import type { InboxItem } from "@/types/inbox";
import type { Profile, SessionUser } from "@/types/profile";

type Section = "directory" | "connect" | "profile";

type DirectoryClientProps = {
  profiles: Profile[];
  user: SessionUser;
  ownProfile: Profile | null;
  inbox: InboxItem[];
  openSignIn?: boolean;
  initialSection?: Section;
};

const SONA_SIGNUP_URL = "https://v1-gray-one.vercel.app/signup";

function NewMembersStrip({
  profiles,
  onOpen,
}: {
  profiles: Profile[];
  onOpen: (profileId: string) => void;
}) {
  if (!profiles.length) return null;

  return (
    <div className="sona-new-members" aria-label="New users">
      <strong className="sona-new-members-title">New users</strong>
      <div className="sona-new-members-list">
        {profiles.map((profile) => (
          <button
            className="sona-new-member"
            type="button"
            key={profile.id}
            onClick={() => onOpen(profile.id)}
          >
            <Avatar name={profile.display_name} url={profile.avatar_url} />
            <strong>{profile.display_name}</strong>
            <small>{profile.courses.length ? profile.courses.slice(0, 2).join(", ") : profile.year_level}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function inboxPreview(item: InboxItem, currentUserId: string) {
  if (item.latest.message_type === "connection") return "Connected!";
  const prefix = item.latest.sender_id === currentUserId ? "You: " : "";
  if (item.latest.body) return `${prefix}${item.latest.body}`;
  if (item.latest.media_type === "image") return `${prefix}sent an image`;
  if (item.latest.media_type === "audio") return `${prefix}sent media`;
  return `${prefix}new message`;
}

function formatInboxTime(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    month: "short",
    day: "numeric",
    timeZone: "Pacific/Auckland",
  }).format(new Date(value));
}

export function DirectoryClient({
  profiles,
  user,
  ownProfile,
  inbox,
  openSignIn = false,
  initialSection = "directory",
}: DirectoryClientProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<Section>(initialSection);
  const [query, setQuery] = useState("");
  const [authOpen, setAuthOpen] = useState(openSignIn);
  const [authMode, setAuthMode] = useState<"signup" | "signin">(
    openSignIn ? "signin" : "signup",
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  const filteredProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return profiles;
    return profiles.filter((profile) =>
      [
        profile.display_name,
        profile.year_level,
        profile.programme,
        profile.major,
        profile.department,
        ...profile.courses,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [profiles, query]);

  const newMembers = useMemo(
    () => [...profiles]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 20),
    [profiles],
  );

  function showAuth(mode: "signup" | "signin") {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  function openProfile(profileId: string) {
    if (!user) {
      showAuth("signup");
      return;
    }
    router.push(`/people/${profileId}`);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function copySignupLink() {
    try {
      await navigator.clipboard.writeText(SONA_SIGNUP_URL);
      setShareNotice("Link copied.");
    } catch {
      setShareNotice("Select the link above to copy it.");
    }
  }

  async function shareSignupLink() {
    if (!navigator.share) {
      await copySignupLink();
      return;
    }

    try {
      await navigator.share({
        title: "Join SONA",
        text: "Join me on SONA.",
        url: SONA_SIGNUP_URL,
      });
    } catch {
      // Closing the native share sheet does not need an error message.
    }
  }

  return (
    <div className="sona-app-shell">
      <header className="sona-topbar">
        <SonaLogo />
        <div className="sona-session">
          {user ? (
            <>
              <span>{ownProfile?.display_name ?? user.email}</span>
              <button type="button" onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => showAuth("signin")}>Sign in</button>
              <button className="sona-join-button" type="button" onClick={() => showAuth("signup")}>Join</button>
            </>
          )}
          <button type="button" onClick={() => { setShareNotice(""); setShareOpen(true); }}>Share</button>
        </div>
      </header>

      <nav className="sona-tabs" aria-label="Main sections">
        {(["directory", "connect", "profile"] as Section[]).map((section) => (
          <button
            key={section}
            type="button"
            className={activeSection === section ? "active" : ""}
            aria-current={activeSection === section ? "page" : undefined}
            onClick={() => setActiveSection(section)}
          >
            {section}
            {section === "connect" && inbox.some((item) => item.unread) ? (
              <span className="sona-tab-dot" aria-label="Unread messages" />
            ) : null}
          </button>
        ))}
      </nav>

      <main className="sona-main">
        <NewMembersStrip profiles={newMembers} onOpen={openProfile} />

        {activeSection === "directory" ? (
          <section className="sona-section sona-directory-section" aria-labelledby="directory-title">
            <h1 className="visually-hidden" id="directory-title">Directory</h1>

            <div className="sona-directory-layout">
              <div className="sona-directory-column">
                <div className="sona-search-wrap">
                  <input
                    id="sona-directory-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search"
                    aria-label="Search directory"
                  />
                </div>

                <div className="sona-directory-list" aria-label="Directory profiles">
                  {filteredProfiles.length ? filteredProfiles.map((profile) => (
                    <button
                      className="sona-directory-card"
                      type="button"
                      key={profile.id}
                      onClick={() => openProfile(profile.id)}
                    >
                      <Avatar name={profile.display_name} url={profile.avatar_url} />
                      <span className="sona-person-copy">
                        <strong>{profile.display_name}</strong>
                        <span>{profile.programme || profile.major || "Studies not added"}</span>
                        <small>
                          {profile.year_level}
                          {profile.courses.length ? ` · ${profile.courses.slice(0, 3).join(", ")}` : ""}
                        </small>
                      </span>
                      <span className="sona-card-arrow" aria-hidden="true">›</span>
                    </button>
                  )) : (
                    <div className="sona-empty-state">
                      <strong>No profiles found</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeSection === "connect" ? (
          <section className="sona-section sona-connect-section" aria-label="Connect">
            <LiveMatchPanel
              user={user}
              profiles={profiles}
              onSignIn={() => showAuth("signin")}
            />

            <div className="sona-history-card">
              <div className="sona-history-heading">
                <h2>Chats</h2>
                {user && inbox.length ? <span>{inbox.length} conversation{inbox.length === 1 ? "" : "s"}</span> : null}
              </div>
              {user ? (
                inbox.length ? (
                  <div className="sona-chat-list">
                    {inbox.map((item) => (
                      <Link className={item.unread ? "sona-chat-row unread" : "sona-chat-row"} href={`/messages/${item.person.id}`} key={item.person.id}>
                        <Avatar name={item.person.display_name} url={item.person.avatar_url} size="small" />
                        <span>
                          <strong>{item.person.display_name}</strong>
                          <small>{inboxPreview(item, user.id)}</small>
                        </span>
                        <span className="sona-chat-meta">
                          <time dateTime={item.latest.created_at}>{formatInboxTime(item.latest.created_at)}</time>
                          {item.unread ? <b>{item.unread}</b> : null}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="sona-empty-state"><strong>No chats yet</strong></div>
                )
              ) : (
                <div className="sona-empty-state">
                  <button className="button sona-primary-button" type="button" onClick={() => showAuth("signin")}>Sign in</button>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {activeSection === "profile" ? (
          <section className="sona-section" aria-labelledby="profile-title">
            {user && ownProfile ? (
              <div className="sona-profile-card">
                <div className="sona-profile-cover" />
                <div className="sona-profile-content">
                  <Avatar name={ownProfile.display_name} url={ownProfile.avatar_url} size="large" />
                  <div className="sona-profile-title">
                    <h1 id="profile-title">{ownProfile.display_name}</h1>
                    <p>{ownProfile.email}</p>
                  </div>
                  <dl className="sona-profile-details">
                    <div><dt>Year</dt><dd>{ownProfile.year_level}</dd></div>
                    <div><dt>Studies</dt><dd>{ownProfile.programme || "Not added yet"}</dd></div>
                    <div><dt>Major</dt><dd>{ownProfile.major || "Not added yet"}</dd></div>
                    <div><dt>Department</dt><dd>{ownProfile.department || "Not added yet"}</dd></div>
                    <div><dt>Courses</dt><dd>{ownProfile.courses.length ? ownProfile.courses.join(", ") : "Not added yet"}</dd></div>
                  </dl>
                  <Link className="button sona-primary-button sona-edit-link" href="/account">Edit profile</Link>
                </div>
              </div>
            ) : (
              <div className="sona-profile-card sona-profile-guest">
                <h1 id="profile-title">Create profile</h1>
                <div className="sona-guest-actions">
                  <button className="button sona-primary-button" type="button" onClick={() => showAuth("signup")}>Join SONA</button>
                  <button className="sona-secondary-button" type="button" onClick={() => showAuth("signin")}>Sign in</button>
                </div>
              </div>
            )}
          </section>
        ) : null}
      </main>

      <AuthDialog open={authOpen} initialMode={authMode} onClose={() => setAuthOpen(false)} />
      {shareOpen ? (
        <div className="dialog-backdrop sona-dialog-backdrop" onMouseDown={() => setShareOpen(false)}>
          <section className="sona-share-dialog" role="dialog" aria-modal="true" aria-label="Share SONA" onMouseDown={(event) => event.stopPropagation()}>
            <div className="sona-share-heading">
              <SonaLogo linked={false} />
              <button type="button" onClick={() => setShareOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="sona-share-body">
              <Image src="/v1-signin-qr.png" alt="QR code for joining SONA" width={240} height={240} priority />
              <strong>Scan to join</strong>
              <input value={SONA_SIGNUP_URL} readOnly aria-label="SONA signup link" onFocus={(event) => event.currentTarget.select()} />
              <div className="sona-share-actions">
                <button className="button" type="button" onClick={() => void shareSignupLink()}>Share link</button>
                <button type="button" onClick={() => void copySignupLink()}>Copy link</button>
              </div>
              {shareNotice ? <p role="status">{shareNotice}</p> : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
