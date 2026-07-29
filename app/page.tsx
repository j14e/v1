import { DirectoryClient } from "@/components/directory-client";
import { createClient } from "@/lib/supabase/server";
import type { Profile, SessionUser } from "@/types/profile";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const directorySource = user ? "profiles" : "directory_profiles";
  const directoryFields = user
    ? "id,email,display_name,year_level,programme,major,department,courses,avatar_url,verified,created_at"
    : "id,display_name,year_level,programme,major,department,courses,avatar_url,verified,created_at";

  const { data: profiles } = await supabase
    .from(directorySource)
    .select(directoryFields)
    .eq("verified", true)
    .order("display_name", { ascending: true });

  let ownProfile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select(
        "id,email,display_name,year_level,programme,major,department,courses,avatar_url,verified,created_at",
      )
      .eq("id", user.id)
      .maybeSingle();
    ownProfile = data as Profile | null;
  }

  const sessionUser: SessionUser = user
    ? { id: user.id, email: user.email ?? "" }
    : null;

  const rawProfiles = (profiles ?? []) as unknown as Array<
    Omit<Profile, "email"> & { email?: string }
  >;
  const directoryProfiles = rawProfiles.map((profile) => ({
    ...profile,
    email: profile.email ?? "",
  }));

  return (
    <DirectoryClient
      profiles={directoryProfiles}
      user={sessionUser}
      ownProfile={ownProfile}
    />
  );
}
