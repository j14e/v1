import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { SimpleHeader } from "@/components/simple-header";
import { createClient } from "@/lib/supabase/server";
import type { Message } from "@/types/message";
import type { Profile } from "@/types/profile";

export const dynamic = "force-dynamic";

type Conversation = {
  person: Profile;
  latest: Message;
  unread: number;
};

function messagePreview(message: Message) {
  if (message.body) return message.body;
  if (message.media_type === "image") return "sent an image";
  if (message.media_type === "audio") return "sent a voice note";
  return "new message";
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland",
  }).format(new Date(value));
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const [{ data: ownProfile }, { data: rawMessages }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single(),
    supabase
      .from("messages")
      .select(
        "id,sender_id,recipient_id,body,media_type,media_path,duration_seconds,created_at,read_at",
      )
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

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

  const { data: rawProfiles } = peerIds.length
    ? await supabase
        .from("profiles")
        .select(
          "id,email,display_name,year_level,programme,major,department,courses,avatar_url,verified,created_at",
        )
        .in("id", peerIds)
    : { data: [] };

  const profiles = new Map(
    ((rawProfiles ?? []) as Profile[]).map((profile) => [profile.id, profile]),
  );
  const conversations = new Map<string, Conversation>();

  for (const message of messages) {
    const peerId =
      message.sender_id === user.id ? message.recipient_id : message.sender_id;
    const person = profiles.get(peerId);
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

  return (
    <div className="site-shell">
      <SimpleHeader name={ownProfile?.display_name ?? user.email ?? "member"} />
      <main className="messages-page">
        <section className="messages-card">
          <div className="profile-titlebar">
            <h1>Messages</h1>
            <span>private member mail</span>
          </div>

          {conversations.size ? (
            <div className="conversation-list">
              {Array.from(conversations.values()).map((conversation) => (
                <Link
                  className={
                    conversation.unread
                      ? "conversation-row unread"
                      : "conversation-row"
                  }
                  href={`/messages/${conversation.person.id}`}
                  key={conversation.person.id}
                >
                  <Avatar
                    name={conversation.person.display_name}
                    url={conversation.person.avatar_url}
                    size="medium"
                  />
                  <span className="conversation-person">
                    <strong>{conversation.person.display_name}</strong>
                    <small>
                      {conversation.person.programme || "Programme not listed"}
                    </small>
                  </span>
                  <span className="conversation-preview">
                    {conversation.latest.sender_id === user.id ? "You: " : ""}
                    {messagePreview(conversation.latest)}
                  </span>
                  <span className="conversation-meta">
                    <time dateTime={conversation.latest.created_at}>
                      {formatMessageTime(conversation.latest.created_at)}
                    </time>
                    {conversation.unread ? (
                      <strong>{conversation.unread} new</strong>
                    ) : null}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-messages">
              <strong>No messages yet.</strong>
              <p>
                Open any member profile and choose “send message”. You do not
                need to be friends first.
              </p>
              <Link className="button inline-button" href="/">
                Browse directory
              </Link>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
