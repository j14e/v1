"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthDialog } from "@/components/auth-dialog";
import { Avatar } from "@/components/avatar";
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

type ConnectedMember = {
  matched_id: string;
  display_name: string;
};

function inboxPreview(item: InboxItem, currentUserId: string) {
  if (item.latest.message_type === "connection") return "Connected on SONA";
  const prefix = item.latest.sender_id === currentUserId ? "You: " : "";
  if (item.latest.body) return `${prefix}${item.latest.body}`;
  if (item.latest.media_type === "image") return `${prefix}sent an image`;
  if (item.latest.media_type === "audio") return `${prefix}sent a voice note`;
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
  const [connecting, setConnecting] = useState(false);
  const [connectNotice, setConnectNotice] = useState("");
  const [connectError, setConnectError] = useState("");

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

  async function connectRandomly() {
    if (!user) {
      showAuth("signin");
      return;
    }

    setConnecting(true);
    setConnectNotice("");
    setConnectError("");
    const supabase = createClient();
    const { data, error } = await supabase.rpc("connect_random_member");
    const match = (data as ConnectedMember[] | null)?.[0];

    if (error) setConnectError(error.message);
    else if (!match) setConnectError("There is nobody available to connect with yet.");
    else {
      setConnectNotice(`You connected with ${match.display_name}.`);
      router.refresh();
    }
    setConnecting(false);
  }

  return (
    <div className="sona-app-shell">
      <header className="sona-topbar">
        <Link className="sona-wordmark" href="/">SONA</Link>
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
        {activeSection === "directory" ? (
          <section className="sona-section sona-directory-section" aria-labelledby="directory-title">
            <div className="sona-section-heading">
              <div>
                <span className="sona-eyebrow">SONA member network</span>
                <h1 id="directory-title">Student directory</h1>
              </div>
              <span>{profiles.length} members</span>
            </div>

            <div className="sona-directory-layout">
              <div className="sona-directory-column">
                <div className="sona-search-wrap">
                  <label htmlFor="sona-directory-search">Search the directory</label>
                  <input
                    id="sona-directory-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Name, course, study or year"
                  />
                  <small>{filteredProfiles.length} result{filteredProfiles.length === 1 ? "" : "s"}</small>
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
                      <strong>No matching profiles</strong>
                      <p>Try a name, course code, subject, programme, or year.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activeSection === "connect" ? (
          <section className="sona-section sona-connect-section" aria-labelledby="connect-title">
            <div className="sona-connect-hero">
              <span className="sona-eyebrow">Meet someone new</span>
              <h1 id="connect-title">Connect</h1>
              <p>Get introduced to one random person from the SONA directory.</p>
              <button className="button sona-connect-button" type="button" disabled={connecting} onClick={() => void connectRandomly()}>
                {connecting ? "Connecting…" : "Connect me randomly"}
              </button>
              {connectNotice ? <p className="sona-connect-success" role="status">{connectNotice}</p> : null}
              {connectError ? <p className="form-error" role="alert">{connectError}</p> : null}
            </div>

            <div className="sona-history-card">
              <div className="sona-history-heading">
                <h2>Chat history</h2>
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
                  <div className="sona-empty-state"><strong>No chats yet</strong><p>Use the connect button or open a directory profile to start one.</p></div>
                )
              ) : (
                <div className="sona-empty-state">
                  <strong>Sign in to connect</strong>
                  <p>Your connections and chat history will appear here.</p>
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
                    <span className="sona-eyebrow">Your profile</span>
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
                <span className="sona-eyebrow">Your space on SONA</span>
                <h1 id="profile-title">Create your profile</h1>
                <p>Join the directory, add your studies, and start meeting other students.</p>
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
    </div>
  );
}
