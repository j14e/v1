"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Avatar } from "@/components/avatar";
import { AvailabilityBadge } from "@/components/availability-badge";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/message";
import type { AvailabilityStatus } from "@/types/profile";

type ChatPerson = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  availabilityStatus: AvailabilityStatus;
};

type ChatThreadProps = {
  currentUser: ChatPerson;
  recipient: ChatPerson;
  initialMessages: Message[];
};

const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Pacific/Auckland",
  }).format(new Date(value));
}

function appendUnique(messages: Message[], message: Message) {
  if (messages.some((item) => item.id === message.id)) return messages;
  return [...messages, message];
}

export function ChatThread({
  currentUser,
  recipient,
  initialMessages,
}: ChatThreadProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${currentUser.id}:${recipient.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const incoming = payload.new as Message;
          const belongsToConversation =
            (incoming.sender_id === currentUser.id &&
              incoming.recipient_id === recipient.id) ||
            (incoming.sender_id === recipient.id &&
              incoming.recipient_id === currentUser.id);

          if (!belongsToConversation) return;

          let message = incoming;
          if (incoming.media_path) {
            const { data } = await supabase.storage
              .from("message-media")
              .createSignedUrl(incoming.media_path, 3600);
            message = { ...incoming, media_url: data?.signedUrl ?? null };
          }

          setMessages((current) => appendUnique(current, message));

          if (
            incoming.recipient_id === currentUser.id &&
            !incoming.read_at
          ) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", incoming.id);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, recipient.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function insertMessage(values: {
    body?: string | null;
    mediaType?: "image" | "audio" | null;
    mediaPath?: string | null;
    durationSeconds?: number | null;
  }) {
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("messages")
      .insert({
        sender_id: currentUser.id,
        recipient_id: recipient.id,
        message_type: "member",
        body: values.body || null,
        media_type: values.mediaType || null,
        media_path: values.mediaPath || null,
        duration_seconds: values.durationSeconds ?? null,
      })
      .select(
        "id,sender_id,recipient_id,message_type,body,media_type,media_path,duration_seconds,created_at,read_at",
      )
      .single();

    if (insertError) throw insertError;
    return data as Message;
  }

  async function sendText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;

    setBusy(true);
    setError("");
    try {
      const message = await insertMessage({ body });
      setMessages((current) => appendUnique(current, message));
      setDraft("");
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Message failed to send.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendMedia(
    file: File,
    mediaType: "image" | "audio",
    durationSeconds?: number,
  ) {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const extension =
      file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
      (mediaType === "image" ? "jpg" : "webm");
    const path = `${currentUser.id}/${recipient.id}/${crypto.randomUUID()}.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("message-media")
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const caption = mediaType === "image" ? draft.trim() : "";
      const message = await insertMessage({
        body: caption || null,
        mediaType,
        mediaPath: path,
        durationSeconds,
      });
      const { data: signed } = await supabase.storage
        .from("message-media")
        .createSignedUrl(path, 3600);

      setMessages((current) =>
        appendUnique(current, {
          ...message,
          media_url: signed?.signedUrl ?? null,
        }),
      );
      if (mediaType === "image") setDraft("");
    } catch (sendError) {
      await supabase.storage.from("message-media").remove([path]);
      setError(
        sendError instanceof Error ? sendError.message : "Upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!imageTypes.has(file.type)) {
      setError("Use a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Images must be under 8 MB.");
      return;
    }
    await sendMedia(file, "image");
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }

  async function startRecording() {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Voice recording is not supported in this browser.");
      return;
    }

    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredTypes = ["audio/webm;codecs=opus", "audio/ogg", "audio/mp4"];
      const mimeType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      streamRef.current = stream;
      chunksRef.current = [];
      setRecordingSeconds(0);
      setRecording(true);
      const startedAt = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        if (timerRef.current !== null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);

        const seconds = Math.max(
          1,
          Math.min(600, Math.round((Date.now() - startedAt) / 1000)),
        );
        const baseType = recorder.mimeType.split(";")[0] || "audio/webm";
        const extension =
          baseType === "audio/ogg"
            ? "ogg"
            : baseType === "audio/mp4"
              ? "m4a"
              : "webm";
        const blob = new Blob(chunksRef.current, { type: baseType });
        const file = new File([blob], `voice-note.${extension}`, {
          type: baseType,
        });

        if (file.size > 12 * 1024 * 1024) {
          setError("Voice notes must be under 12 MB.");
          return;
        }
        void sendMedia(file, "audio", seconds);
      };

      recorder.start(250);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setRecordingSeconds(elapsed);
        if (elapsed >= 600) recorder.stop();
      }, 1000);
    } catch {
      setError("Microphone access was not available.");
      setRecording(false);
    }
  }

  return (
    <section className="chat-card">
      <div className="chat-titlebar">
        <div className="chat-person">
          <Avatar
            name={recipient.displayName}
            url={recipient.avatarUrl}
            size="small"
          />
          <span>
            <strong>{recipient.displayName}</strong>
            <AvailabilityBadge status={recipient.availabilityStatus} />
            <small>private conversation</small>
          </span>
        </div>
        <div className="chat-links">
          <Link href={`/people/${recipient.id}`}>view profile</Link>
          <Link href="/messages">all messages</Link>
        </div>
      </div>

      <div className="message-history" aria-live="polite">
        {messages.length ? (
          messages.map((message) => {
            const mine = message.sender_id === currentUser.id;
            if (message.message_type === "connection") {
              return (
                <article
                  className="connection-message"
                  key={message.id}
                  aria-label={`Connected with ${recipient.displayName} by Connection Oracle`}
                >
                  <span className="connection-message-mark" aria-hidden="true">
                    O
                  </span>
                  <span>
                    <strong>Connected by Connection Oracle</strong>
                    <small>
                      You and {recipient.displayName} were randomly introduced.
                    </small>
                  </span>
                  <time dateTime={message.created_at}>
                    {formatMessageTime(message.created_at)}
                  </time>
                </article>
              );
            }
            return (
              <article
                className={mine ? "message-row mine" : "message-row"}
                key={message.id}
              >
                <Avatar
                  name={mine ? currentUser.displayName : recipient.displayName}
                  url={mine ? currentUser.avatarUrl : recipient.avatarUrl}
                  size="small"
                />
                <div className="message-bubble">
                  <div className="message-byline">
                    <strong>
                      {mine ? currentUser.displayName : recipient.displayName}
                    </strong>
                    <time dateTime={message.created_at}>
                      {formatMessageTime(message.created_at)}
                    </time>
                  </div>
                  {message.body ? <p>{message.body}</p> : null}
                  {message.media_type === "image" && message.media_url ? (
                    <a
                      className="message-image-link"
                      href={message.media_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Image
                        src={message.media_url}
                        alt="Shared image"
                        width={520}
                        height={390}
                        sizes="(max-width: 780px) 78vw, 520px"
                        unoptimized
                      />
                    </a>
                  ) : null}
                  {message.media_type === "audio" && message.media_url ? (
                    <div className="voice-note">
                      <audio controls preload="metadata" src={message.media_url}>
                        Your browser does not support audio playback.
                      </audio>
                      <small>
                        voice note
                        {message.duration_seconds
                          ? ` · ${message.duration_seconds}s`
                          : ""}
                      </small>
                    </div>
                  ) : null}
                  {message.media_type && !message.media_url ? (
                    <span className="media-unavailable">
                      media unavailable — refresh to retry
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="chat-empty">
            <strong>Start a conversation with {recipient.displayName}.</strong>
            <p>You can message any verified member without adding them first.</p>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      <form className="message-composer" onSubmit={sendText}>
        <label htmlFor="message-text">Message</label>
        <textarea
          id="message-text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Write to ${recipient.displayName}`}
          maxLength={4000}
          rows={3}
          disabled={busy || recording}
        />
        <div className="composer-actions">
          <button className="button" type="submit" disabled={busy || recording}>
            {busy ? "Sending…" : "Send"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || recording}
          >
            send image
          </button>
          <input
            ref={fileInputRef}
            className="hidden-file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={chooseImage}
          />
          <button
            className={recording ? "record-button active" : "record-button"}
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={busy}
          >
            {recording
              ? `stop voice note (${recordingSeconds}s)`
              : "record voice note"}
          </button>
          <span className="composer-note">
            Friendship is not required to send a message.
          </span>
        </div>
        {error ? <p className="form-error composer-error">{error}</p> : null}
      </form>
    </section>
  );
}
