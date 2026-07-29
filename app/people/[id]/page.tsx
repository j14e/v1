import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { AvailabilityBadge } from "@/components/availability-badge";
import { FriendButton } from "@/components/friend-button";
import { SimpleHeader } from "@/components/simple-header";
import { createClient } from "@/lib/supabase/server";
import type { Friendship } from "@/types/message";
import type { Profile } from "@/types/profile";

export const dynamic = "force-dynamic";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [{ data: profile }, { data: ownProfile }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,email,display_name,availability_status,year_level,programme,major,department,courses,avatar_url,verified,created_at",
      )
      .eq("id", id)
      .eq("verified", true)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (!profile) notFound();

  const person = profile as Profile;
  const { data: friendship } =
    user.id === person.id
      ? { data: null }
      : await supabase
          .from("contacts")
          .select("id,requester_id,addressee_id,status")
          .in("requester_id", [user.id, person.id])
          .in("addressee_id", [user.id, person.id])
          .maybeSingle();

  return (
    <div className="site-shell">
      <SimpleHeader name={ownProfile?.display_name ?? user.email ?? "member"} />
      <main className="profile-page">
        <section className="profile-card">
          <div className="profile-titlebar">
            <h1>{person.display_name}</h1>
            <span>verified University member</span>
          </div>
          <div className="profile-body">
            <aside className="profile-photo">
              <Avatar
                name={person.display_name}
                url={person.avatar_url}
                size="large"
              />
              {person.id === user.id ? (
                <a href="/account">edit my profile</a>
              ) : null}
            </aside>
            <div className="profile-details">
              <dl>
                <div>
                  <dt>Name</dt>
                  <dd>{person.display_name}</dd>
                </div>
                <div>
                  <dt>Availability</dt>
                  <dd>
                    <AvailabilityBadge status={person.availability_status} />
                  </dd>
                </div>
                <div>
                  <dt>Year</dt>
                  <dd>{person.year_level}</dd>
                </div>
                <div>
                  <dt>Programme</dt>
                  <dd>{person.programme || "Not listed"}</dd>
                </div>
                <div>
                  <dt>Major</dt>
                  <dd>{person.major || "Not listed"}</dd>
                </div>
                <div>
                  <dt>Faculty / department</dt>
                  <dd>{person.department || "Not listed"}</dd>
                </div>
                <div>
                  <dt>Current courses</dt>
                  <dd>
                    {person.courses.length ? (
                      <span className="course-list">
                        {person.courses.map((course) => (
                          <span key={course}>{course}</span>
                        ))}
                      </span>
                    ) : (
                      "Not listed"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>University email</dt>
                  <dd>
                    <a href={`mailto:${person.email}`}>{person.email}</a>
                  </dd>
                </div>
              </dl>

              {person.id !== user.id ? (
                <div className="profile-actions">
                  <Link
                    className="button inline-button"
                    href={`/messages/${person.id}`}
                  >
                    Send message
                  </Link>
                  <FriendButton
                    currentUserId={user.id}
                    personId={person.id}
                    initialFriendship={(friendship as Friendship | null) ?? null}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
