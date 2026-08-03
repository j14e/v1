"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthDialog } from "@/components/auth-dialog";
import { Avatar } from "@/components/avatar";
import { AvailabilityBadge } from "@/components/availability-badge";
import { DirectoryBanner } from "@/components/directory-banner";
import { createClient } from "@/lib/supabase/client";
import { departments } from "@/lib/catalog";
import type { BannerSubmission } from "@/types/banner";
import type { InboxItem } from "@/types/inbox";
import type { Profile, SessionUser } from "@/types/profile";

type DirectoryClientProps = {
  profiles: Profile[];
  newMembers: Profile[];
  user: SessionUser;
  ownProfile: Profile | null;
  inbox: InboxItem[];
  featuredBanner: BannerSubmission | null;
};

type WaveState = "sending" | "sent" | "error";

function inboxPreview(item: InboxItem, currentUserId: string) {
  if (item.latest.message_type === "connection") {
    return "Connection notice";
  }
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
  newMembers,
  user,
  ownProfile,
  inbox,
  featuredBanner,
}: DirectoryClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [departmentsOpen, setDepartmentsOpen] = useState(false);
  const [waveStates, setWaveStates] = useState<Record<string, WaveState>>({});

  const filteredProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesDepartment =
        !department || profile.department === department;
      const haystack = [
        profile.display_name,
        profile.availability_status === "open_to_talk" ? "open to talk" : "busy",
        profile.year_level,
        profile.programme,
        profile.major,
        profile.department,
        ...profile.courses,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesDepartment && (!needle || haystack.includes(needle));
    });
  }, [department, profiles, query]);

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
    window.location.reload();
  }

  async function sayHi(profile: Profile) {
    if (!user) {
      showAuth("signin");
      return;
    }
    if (!ownProfile || profile.id === user.id) return;

    setWaveStates((states) => ({ ...states, [profile.id]: "sending" }));
    const supabase = createClient();
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: profile.id,
      message_type: "member",
      body: `${ownProfile.display_name} waved at you`,
    });

    setWaveStates((states) => ({
      ...states,
      [profile.id]: error ? "error" : "sent",
    }));
    if (!error) router.refresh();
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="wordmark" href="/">
          v1
        </Link>
        <nav className="primary-nav" aria-label="Main navigation">
          <Link className="active" href="/">
            directory
          </Link>
          {user ? <Link href="/messages">messages</Link> : null}
          <a href="#about">about</a>
        </nav>
        <div className="member-actions">
          {user ? (
            <>
              <span className="signed-in-as">
                signed in as {ownProfile?.display_name ?? user.email}
              </span>
              <Link className="mobile-nav-link" href="/messages">
                messages
              </Link>
              <Link href="/account">my profile</Link>
              <button className="nav-button" type="button" onClick={signOut}>
                sign out
              </button>
            </>
          ) : (
            <>
              <button
                className="nav-button"
                type="button"
                onClick={() => showAuth("signin")}
              >
                sign in
              </button>
              <button
                className="join-button"
                type="button"
                onClick={() => showAuth("signup")}
              >
                join v1
              </button>
            </>
          )}
        </div>
      </header>

      <div className="utility-strip">
        <strong>University of Auckland</strong>
        <span>student contact directory</span>
        <span className="utility-status">
          {profiles.length} verified {profiles.length === 1 ? "member" : "members"}
        </span>
      </div>

      <div className="page-grid directory-layout">
        <aside className="sidebar">
          <section className="side-panel directory-browser">
            <button
              className="panel-heading panel-toggle"
              type="button"
              aria-expanded={departmentsOpen}
              aria-controls="department-links"
              onClick={() => setDepartmentsOpen((open) => !open)}
            >
              <span>departments</span>
              <span aria-hidden="true">{departmentsOpen ? "−" : "+"}</span>
            </button>
            <button
              className={!department ? "side-link selected" : "side-link"}
              type="button"
              onClick={() => setDepartment("")}
            >
              All members directory
            </button>
            {departmentsOpen ? (
              <div id="department-links">
                {departments.map((item) => (
                  <button
                    className={
                      department === item ? "side-link selected" : "side-link"
                    }
                    type="button"
                    key={item}
                    onClick={() => setDepartment(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="side-panel inbox-panel">
            <div className="panel-heading">
              <span>inbox</span>
              {user ? <Link href="/messages">open all</Link> : null}
            </div>
            {user ? (
              inbox.length ? (
                <div className="homepage-inbox-list">
                  {inbox.map((item) => (
                    <Link
                      className={item.unread ? "homepage-inbox-row unread" : "homepage-inbox-row"}
                      href={`/messages/${item.person.id}`}
                      key={item.person.id}
                    >
                      <Avatar
                        name={item.person.display_name}
                        url={item.person.avatar_url}
                        size="small"
                      />
                      <span>
                        <strong>{item.person.display_name}</strong>
                        <small>{inboxPreview(item, user.id)}</small>
                      </span>
                      <span className="homepage-inbox-meta">
                        <time dateTime={item.latest.created_at}>
                          {formatInboxTime(item.latest.created_at)}
                        </time>
                        {item.unread ? <b>{item.unread}</b> : null}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p>No messages yet.</p>
              )
            ) : (
              <div className="homepage-inbox-guest">
                <p>Sign in to see messages and new connections.</p>
                <button
                  className="side-link"
                  type="button"
                  onClick={() => showAuth("signin")}
                >
                  sign in to inbox
                </button>
              </div>
            )}
          </section>

          <section className="side-panel about-panel" id="about">
            <div className="panel-heading">about v1</div>
            <p>
              Find people across faculties, majors, years, and courses. Directory
              access is public. Profiles, friends, and messaging are for
              verified students.
            </p>
          </section>

        </aside>

        <main className="directory-main">
          <div className="section-heading">
            <div>
              <h1>Contact directory</h1>
              <p>
                Browse verified University of Auckland students. Sign in to open
                a profile, send a message, or add someone as a friend.
              </p>
            </div>
          </div>

          <div className="homepage-discovery-grid">
            <section
              className="new-members-panel"
              aria-labelledby="new-members-title"
            >
              <div className="discovery-titlebar">
                <div>
                  <h2 id="new-members-title">Newly joined members</h2>
                  <p>Meet the latest people added to the directory.</p>
                </div>
                <span>{newMembers.length} latest</span>
              </div>
              {newMembers.length ? (
                <div className="new-members-scroll">
                  {newMembers.map((profile) => {
                    const waveState = waveStates[profile.id];
                    return (
                      <article className="new-member-card" key={profile.id}>
                        <button
                          className="new-member-profile"
                          type="button"
                          onClick={() => openProfile(profile.id)}
                        >
                          <Avatar
                            name={profile.display_name}
                            url={profile.avatar_url}
                            size="large"
                          />
                          <span>
                            <strong>{profile.display_name}</strong>
                            <small>{profile.major || "Major not listed"}</small>
                            <small>
                              {profile.programme || "Studies not listed"}
                            </small>
                          </span>
                        </button>
                        <button
                          className="say-hi-button"
                          type="button"
                          disabled={waveState === "sending" || waveState === "sent"}
                          onClick={() => void sayHi(profile)}
                        >
                          {waveState === "sending"
                            ? "sending..."
                            : waveState === "sent"
                              ? "waved"
                              : waveState === "error"
                                ? "try again"
                                : "say hi"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="new-members-empty">
                  New members will appear here as they join.
                </p>
              )}
            </section>

          </div>

          <div className="directory-tools">
            <label htmlFor="directory-search">Search people</label>
            <input
              id="directory-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="name, major, department, or course"
            />
            <span className="result-count">
              showing {filteredProfiles.length} of {profiles.length}
            </span>
          </div>

          <section className="directory-panel" aria-label="People">
            <div className="directory-header" aria-hidden="true">
              <span>person</span>
              <span>year</span>
              <span>programme / major</span>
              <span>faculty or department</span>
              <span />
            </div>

            {filteredProfiles.length ? (
              <div className="directory-list">
                {filteredProfiles.map((profile) => (
                  <button
                    className="directory-row"
                    type="button"
                    key={profile.id}
                    onClick={() => openProfile(profile.id)}
                    aria-label={`Open ${profile.display_name}'s profile`}
                  >
                    <span className="person-cell">
                      <Avatar
                        name={profile.display_name}
                        url={profile.avatar_url}
                      />
                      <span>
                        <strong>{profile.display_name}</strong>
                        <AvailabilityBadge
                          status={profile.availability_status}
                        />
                        <small>
                          {profile.is_demo
                            ? "demo profile"
                            : user
                              ? profile.email
                              : "verified student"}
                        </small>
                      </span>
                    </span>
                    <span>{profile.year_level}</span>
                    <span>
                      {profile.programme || "Programme not listed"}
                      {profile.major ? (
                        <small>{profile.major}</small>
                      ) : null}
                    </span>
                    <span>{profile.department || "Not listed"}</span>
                    <span className="row-action">
                      {user ? "view profile →" : "join to view →"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-directory">
                <strong>
                  {profiles.length
                    ? "No members match this search."
                    : "The directory is ready for its first verified member."}
                </strong>
                <p>
                  {profiles.length
                    ? "Try a broader name, course, or department."
                    : "Create a profile with your University student email. It appears here after email confirmation."}
                </p>
                {!user ? (
                  <button
                    className="button"
                    type="button"
                    onClick={() => showAuth("signup")}
                  >
                    Join the directory
                  </button>
                ) : null}
              </div>
            )}
          </section>

        </main>
        <DirectoryBanner
          featured={featuredBanner}
          user={user}
          onRequireSignIn={() => showAuth("signin")}
        />
      </div>

      <AuthDialog
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}
