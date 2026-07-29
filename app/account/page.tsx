import { redirect } from "next/navigation";
import { AccountForm } from "@/components/account-form";
import { SimpleHeader } from "@/components/simple-header";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/profile";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id,email,display_name,year_level,programme,major,department,courses,avatar_url,verified,created_at",
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/");

  return (
    <div className="site-shell">
      <SimpleHeader name={profile.display_name} />
      <main className="profile-page">
        <AccountForm profile={profile as Profile} />
      </main>
    </div>
  );
}
