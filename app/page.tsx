import { DirectoryClient } from "@/components/directory-client";
import { createClient } from "@/lib/supabase/server";
import type { BannerSubmission } from "@/types/banner";
import type { InboxItem } from "@/types/inbox";
import type { Message } from "@/types/message";
import type { Profile, SessionUser } from "@/types/profile";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profilesRequest = user
    ? supabase
        .from("profiles")
        .select(
          "id,email,display_name,availability_status,year_level,programme,major,department,courses,avatar_url,verified,is_demo,created_at",
        )
        .eq("verified", true)
        .order("display_name", { ascending: true })
    : supabase
        .from("directory_profiles")
        .select(
          "id,display_name,availability_status,year_level,programme,major,department,courses,avatar_url,verified,is_demo,created_at",
        )
        .eq("verified", true)
        .order("display_name", { ascending: true });
  const [{ data: profiles }, { data: rawBanners }] = await Promise.all([
    profilesRequest,
    supabase
      .from("banner_submissions")
      .select("id,member_id,file_path,file_name,mime_type,created_at")
      .limit(250),
  ]);

  const banners = (rawBanners ?? []) as Omit<
    BannerSubmission,
    "public_url"
  >[];
  const randomBanner = banners.length
    ? banners[Math.floor(Math.random() * banners.length)]
    : null;
  const featuredBanner: BannerSubmission | null = randomBanner
    ? {
        ...randomBanner,
        public_url: supabase.storage
          .from("directory-banners")
          .getPublicUrl(randomBanner.file_path).data.publicUrl,
      }
    : null;

  let ownProfile: Profile | null = null;
  let inbox: InboxItem[] = [];
  if (user) {
    const [{ data }, { data: rawMessages }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id,email,display_name,availability_status,year_level,programme,major,department,courses,avatar_url,verified,is_demo,created_at",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("messages")
        .select(
          "id,sender_id,recipient_id,message_type,body,media_type,media_path,duration_seconds,created_at,read_at",
        )
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    ownProfile = data as Profile | null;

    const messages = (rawMessages ?? []) as Message[];
    const peerIds = Array.from(
      new Set(
        messages.map((message) =>
          message.sender_id === user.id
            ? message.recipient_id
            : message.sender_id,
        ),
      ),
    );
    const { data: rawPeers } = peerIds.length
      ? await supabase
          .from("profiles")
          .select(
            "id,email,display_name,availability_status,year_level,programme,major,department,courses,avatar_url,verified,is_demo,created_at",
          )
          .in("id", peerIds)
      : { data: [] };
    const peers = new Map(
      ((rawPeers ?? []) as Profile[]).map((profile) => [profile.id, profile]),
    );
    const conversations = new Map<string, InboxItem>();

    for (const message of messages) {
      const peerId =
        message.sender_id === user.id
          ? message.recipient_id
          : message.sender_id;
      const person = peers.get(peerId);
      if (!person) continue;

      const existing = conversations.get(peerId);
      if (!existing) {
        conversations.set(peerId, {
          person,
          latest: message,
          unread:
            message.recipient_id === user.id && !message.read_at ? 1 : 0,
        });
      } else if (message.recipient_id === user.id && !message.read_at) {
        existing.unread += 1;
      }
    }
    inbox = Array.from(conversations.values()).slice(0, 4);
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
  const newMembers = [...directoryProfiles]
    .filter((profile) => profile.id !== user?.id)
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    )
    .slice(0, 12);

  return (
    <DirectoryClient
      profiles={directoryProfiles}
      newMembers={newMembers}
      user={sessionUser}
      ownProfile={ownProfile}
      inbox={inbox}
      featuredBanner={featuredBanner}
    />
  );
}
