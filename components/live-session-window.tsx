"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { createClient } from "@/lib/supabase/client";
import type { LiveSession, LiveSessionMessage } from "@/types/live-session";
import type { Profile, SessionUser } from "@/types/profile";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Pacific/Auckland",
  }).format(new Date(value));
}

export function LiveSessionWindow({
  user,
  ownProfile,
  session,
  initialMessages,
  onSignIn,
}: {
  user: SessionUser;
  ownProfile: Profile | null;
  session: LiveSession | null;
  initialMessages: LiveSessionMessage[];
  onSignIn: () => void;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
    setDraft("");
  }, [initialMessages, session?.session_id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!user || !session) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`live-session:${session.session_id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_messages",
          filter: `session_id=eq.${session.session_id}`,
        },
        (payload) => {
          const incoming = payload.new as LiveSessionMessage;
          setMessages((current) =>
            current.some((message) => message.id === incoming.id)
              ? current
              : [...current, incoming],
          );
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [session?.session_id, user?.id]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`live-session-membership:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_members",
          filter: `member_id=eq.${user.id}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [router, user?.id]);

  function sendOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!session || !user || !body || busy) return;

    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data, error: sendError } = await supabase
      .from("live_session_messages")
      .insert({ session_id: session.session_id, sender_id: user.id, body })
      .select("id,session_id,sender_id,body,created_at")
      .single();
    if (sendError) setError(sendError.message);
    else if (data) {
      const message = data as LiveSessionMessage;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      setDraft("");
    }
    setBusy(false);
  }

  async function leaveLiveChat() {
    if (!user || !session || busy) return;
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: leaveError } = await supabase.rpc("leave_live_session");
    if (leaveError) {
      setError(leaveError.message);
      setBusy(false);
      return;
    }
    window.location.assign("/?section=live");
  }

  if (!user || !session) {
    return (
      <section className="sona-live-chat" aria-label="Live chat">
        <div className="sona-live-chat-titlebar">
          <span className="sona-live-room-mark" aria-hidden="true">●</span>
          <span><strong>Live chat</strong><small>Waiting room</small></span>
        </div>
        <div className="message-history sona-live-message-history sona-live-empty-message" aria-live="polite">
          <div>
            <strong>No one has joined yet.</strong>
            <p>Spread the words and make us grow.</p>
            {!user ? <button className="button sona-primary-button" type="button" onClick={onSignIn}>Sign in</button> : null}
          </div>
        </div>
        <form className="message-composer" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="live-message-waiting">Live message</label>
          <textarea id="live-message-waiting" placeholder="Match with someone to start chatting" rows={2} disabled />
          <div className="composer-actions"><button className="button" type="submit" disabled>Send</button></div>
        </form>
      </section>
    );
  }

  return (
    <section className="sona-live-chat" aria-label="Live chat">
      <div className="sona-live-chat-titlebar">
        <Avatar name={session.display_name} url={session.avatar_url} size="small" />
        <span><strong>{session.display_name}</strong><small>Live</small></span>
        <button className="sona-leave-live-chat" type="button" onClick={() => void leaveLiveChat()} disabled={busy}>
          Leave chat
        </button>
      </div>
      <div className="message-history sona-live-message-history" aria-live="polite">
        {messages.length ? messages.map((message) => {
          const mine = message.sender_id === user.id;
          return (
            <article className={mine ? "message-row mine" : "message-row"} key={message.id}>
              <Avatar
                name={mine ? ownProfile?.display_name ?? user.email : session.display_name}
                url={mine ? ownProfile?.avatar_url ?? null : session.avatar_url}
                size="small"
              />
              <div className="message-bubble">
                <div className="message-byline">
                  <strong>{mine ? ownProfile?.display_name ?? "You" : session.display_name}</strong>
                  <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                </div>
                <p>{message.body}</p>
              </div>
            </article>
          );
        }) : <div className="sona-live-empty-message"><p>Spread the words and make us grow.</p></div>}
        <div ref={endRef} />
      </div>
      <form className="message-composer" onSubmit={sendMessage}>
        <label htmlFor="live-message-text">Live message</label>
        <textarea
          id="live-message-text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={sendOnEnter}
          placeholder="Write a message"
          maxLength={4000}
          rows={2}
          disabled={busy}
        />
        <div className="composer-actions"><button className="button" type="submit" disabled={busy}>{busy ? "Sending…" : "Send"}</button></div>
        {error ? <p className="form-error composer-error" role="alert">{error}</p> : null}
      </form>
    </section>
  );
}
