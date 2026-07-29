import Link from "next/link";
import { AdminAccessForm } from "@/components/admin-access-form";
import { AdminMemberControls } from "@/components/admin-member-controls";
import { Avatar } from "@/components/avatar";
import { SimpleHeader } from "@/components/simple-header";
import {
  createAdminClient,
  getAdminSettings,
  getEligibleAdminOwnerId,
  hasValidAdminSession,
} from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { lockAdminAction } from "./actions";

export const dynamic = "force-dynamic";

type AdminProfile = {
  id: string;
  email: string;
  display_name: string;
  year_level: string;
  programme: string | null;
  major: string | null;
  department: string | null;
  courses: string[];
  avatar_url: string | null;
  verified: boolean;
  frozen: boolean;
  created_at: string;
};

function formatJoinDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland",
  }).format(new Date(value));
}

function PublicAdminHeader() {
  return (
    <>
      <header className="topbar">
        <Link className="wordmark" href="/">
          v1
        </Link>
        <nav className="primary-nav" aria-label="Main navigation">
          <Link href="/">directory</Link>
        </nav>
      </header>
      <div className="utility-strip">
        <strong>University of Auckland</strong>
        <span>administration</span>
        <Link className="back-link" href="/">
          ← back to directory
        </Link>
      </div>
    </>
  );
}

function AccessPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="admin-page">
      <section className="admin-gate">
        <div className="profile-titlebar">
          <h1>{title}</h1>
          <span>restricted</span>
        </div>
        <div className="admin-gate-body">{children}</div>
      </section>
    </main>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="site-shell">
        <PublicAdminHeader />
        <AccessPanel title="Admin sign in required">
          <p>Sign in to your original v1 account, then return to /admin.</p>
          <Link className="button inline-button" href="/">
            Go to sign in
          </Link>
        </AccessPanel>
      </div>
    );
  }

  const admin = createAdminClient();
  const [{ data: ownProfile }, settings, eligibleOwnerId] = await Promise.all([
    admin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single(),
    getAdminSettings(),
    getEligibleAdminOwnerId(),
  ]);
  const displayName = ownProfile?.display_name ?? user.email ?? "member";

  if (!settings) {
    const eligible = user.id === eligibleOwnerId;
    return (
      <div className="site-shell">
        <SimpleHeader name={displayName} />
        <AccessPanel title="Set up admin access">
          {eligible ? (
            <>
              <p>
                Create the separate password used to unlock this administration
                page. It is stored only as a salted cryptographic hash.
              </p>
              <AdminAccessForm mode="setup" />
            </>
          ) : (
            <p>Only the original v1 account can configure admin access.</p>
          )}
        </AccessPanel>
      </div>
    );
  }

  if (settings.owner_id !== user.id) {
    return (
      <div className="site-shell">
        <SimpleHeader name={displayName} />
        <AccessPanel title="Admin access denied">
          <p>This member account is not the owner of the administration portal.</p>
        </AccessPanel>
      </div>
    );
  }

  if (!(await hasValidAdminSession(user.id, settings))) {
    return (
      <div className="site-shell">
        <SimpleHeader name={displayName} />
        <AccessPanel title="Unlock admin">
          <p>Enter the separate admin password to view and manage accounts.</p>
          <AdminAccessForm mode="unlock" />
        </AccessPanel>
      </div>
    );
  }

  const { data: profiles, error } = await admin
    .from("profiles")
    .select(
      "id,email,display_name,year_level,programme,major,department,courses,avatar_url,verified,frozen,created_at",
    )
    .order("created_at", { ascending: true });
  if (error) throw error;

  const members = (profiles ?? []) as AdminProfile[];
  const frozenCount = members.filter((member) => member.frozen).length;

  return (
    <div className="site-shell">
      <SimpleHeader name={displayName} />
      <main className="admin-page">
        <section className="admin-directory">
          <div className="admin-titlebar">
            <div>
              <h1>Member administration</h1>
              <p>
                {members.length} total · {frozenCount} frozen
              </p>
            </div>
            <form action={lockAdminAction}>
              <button className="secondary-button" type="submit">
                lock admin
              </button>
            </form>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>member</th>
                  <th>email</th>
                  <th>joined</th>
                  <th>year / programme</th>
                  <th>major / department</th>
                  <th>courses</th>
                  <th>status</th>
                  <th>controls</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const owner = member.id === settings.owner_id;
                  return (
                    <tr
                      className={member.frozen ? "admin-member-frozen" : ""}
                      key={member.id}
                    >
                      <td>
                        <span className="admin-person">
                          <Avatar
                            name={member.display_name}
                            url={member.avatar_url}
                            size="small"
                          />
                          <span>
                            <strong>{member.display_name}</strong>
                            <small>{member.id}</small>
                          </span>
                        </span>
                      </td>
                      <td>
                        <a href={`mailto:${member.email}`}>{member.email}</a>
                      </td>
                      <td>
                        <time dateTime={member.created_at}>
                          {formatJoinDate(member.created_at)}
                        </time>
                      </td>
                      <td>
                        {member.year_level}
                        <small>{member.programme || "Not listed"}</small>
                      </td>
                      <td>
                        {member.major || "Not listed"}
                        <small>{member.department || "Not listed"}</small>
                      </td>
                      <td>
                        {member.courses.length
                          ? member.courses.join(", ")
                          : "Not listed"}
                      </td>
                      <td>
                        <span
                          className={
                            member.frozen
                              ? "admin-status frozen"
                              : member.verified
                                ? "admin-status active"
                                : "admin-status pending"
                          }
                        >
                          {owner
                            ? "owner"
                            : member.frozen
                              ? "frozen"
                              : member.verified
                                ? "active"
                                : "unverified"}
                        </span>
                      </td>
                      <td>
                        {owner ? (
                          <small>protected owner</small>
                        ) : (
                          <AdminMemberControls
                            memberId={member.id}
                            memberName={member.display_name}
                            frozen={member.frozen}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
