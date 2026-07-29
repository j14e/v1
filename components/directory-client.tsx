"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthDialog } from "@/components/auth-dialog";
import { Avatar } from "@/components/avatar";
import { createClient } from "@/lib/supabase/client";
import { departments } from "@/lib/catalog";
import type { Profile, SessionUser } from "@/types/profile";

type DirectoryClientProps = {
  profiles: Profile[];
  user: SessionUser;
  ownProfile: Profile | null;
};

export function DirectoryClient({
  profiles,
  user,
  ownProfile,
}: DirectoryClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");

  const filteredProfiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return profiles.filter((profile) => {
      const matchesDepartment =
        !department || profile.department === department;
      const haystack = [
        profile.display_name,
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
          <a href="#about">about</a>
        </nav>
        <div className="member-actions">
          {user ? (
            <>
              <span className="signed-in-as">
                signed in as {ownProfile?.display_name ?? user.email}
              </span>
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

      <div className="page-grid">
        <aside className="sidebar">
          <section className="side-panel">
            <div className="panel-heading">browse</div>
            <button
              className={!department ? "side-link selected" : "side-link"}
              type="button"
              onClick={() => setDepartment("")}
            >
              All members
            </button>
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
          </section>

          <section className="side-panel" id="about">
            <div className="panel-heading">about v1</div>
            <p>
              Find people across faculties, majors, years, and courses. Directory
              access is public. Profiles and contact tools are for verified
              students.
            </p>
          </section>

          <section className="side-panel access-panel">
            <div className="panel-heading">access</div>
            {user ? (
              <p>
                Your University email is verified. You have full directory
                access.
              </p>
            ) : (
              <>
                <p>Use an @aucklanduni.ac.nz address to join.</p>
                <button
                  className="button full-button"
                  type="button"
                  onClick={() => showAuth("signup")}
                >
                  create profile
                </button>
              </>
            )}
          </section>
        </aside>

        <main className="directory-main">
          <div className="section-heading">
            <div>
              <h1>Contact directory</h1>
              <p>
                Browse verified University of Auckland students. Sign in to open
                a profile or add someone to your contacts.
              </p>
            </div>
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
                        <small>
                          {user ? profile.email : "verified student"}
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

          <footer className="site-footer">
            <span>v1 — independent student directory</span>
            <span>not affiliated with the University of Auckland</span>
          </footer>
        </main>
      </div>

      <AuthDialog
        open={authOpen}
        initialMode={authMode}
        onClose={() => setAuthOpen(false)}
      />
    </div>
  );
}
