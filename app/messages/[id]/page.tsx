import { notFound, redirect } from "next/navigation";
import { ChatThread } from "@/components/chat-thread";
import { SimpleHeader } from "@/components/simple-header";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/types/message";
import type { Profile } from "@/types/profile";

export const dynamic = "force-dynamic";

export default async function ConversationPage({
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
  if (id === user.id) redirect("/messages");

  const profileFields =
    "id,email,display_name,year_level,programme,major,department,courses,avatar_url,verified,created_at";

  const [
    { data: ownProfile },
    { data: recipientProfile },
    { data: rawMessages },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(profileFields)
      .eq("id", user.id)
      .eq("verified", true)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(profileFields)
      .eq("id", id)
      .eq("verified", true)
      .maybeSingle(),
    supabase
      .from("messages")
      .select(
        "id,sender_id,recipient_id,body,media_type,media_path,duration_seconds,created_at,read_at",
      )
      .in("sender_id", [user.id, id])
      .in("recipient_id", [user.id, id])
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  if (!ownProfile) redirect("/account");
  if (!recipientProfile) notFound();

  const currentUser = ownProfile as Profile;
  const recipient = recipientProfile as Profile;
  const messages = (rawMessages ?? []) as Message[];
  const mediaPaths = messages
    .map((message) => message.media_path)
    .filter((path): path is string => Boolean(path));

  const { data: signedMedia } = mediaPaths.length
    ? await supabase.storage
        .from("message-media")
        .createSignedUrls(mediaPaths, 3600)
    : { data: [] };

  const signedUrls = new Map(
    (signedMedia ?? []).map((item, index) => [
      mediaPaths[index],
      item.signedUrl,
    ]),
  );
  const initialMessages = messages.map((message) => ({
    ...message,
    media_url: message.media_path
      ? signedUrls.get(message.media_path) ?? null
      : null,
  }));

  const unreadIds = messages
    .filter(
      (message) => message.recipient_id === user.id && !message.read_at,
    )
    .map((message) => message.id);

  if (unreadIds.length) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
  }

  return (
    <div className="site-shell">
      <SimpleHeader name={currentUser.display_name} />
      <main className="messages-page">
        <ChatThread
          currentUser={{
            id: currentUser.id,
            displayName: currentUser.display_name,
            avatarUrl: currentUser.avatar_url,
          }}
          recipient={{
            id: recipient.id,
            displayName: recipient.display_name,
            avatarUrl: recipient.avatar_url,
          }}
          initialMessages={initialMessages}
        />
      </main>
    </div>
  );
}
