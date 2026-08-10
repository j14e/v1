"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/types/profile";

type QueueStatus = "idle" | "queued" | "matched";

type QueueResult = {
  status: "queued" | "queued_fallback" | "matched";
  matched_id: string | null;
  display_name: string | null;
  queue_count: number;
  live_session_id: string | null;
};

export function LiveMatchPanel({
  user,
  onSignIn,
}: {
  user: SessionUser;
  onSignIn: () => void;
}) {
  const router = useRouter();
  const [queueStatus, setQueueStatus] = useState<QueueStatus>("idle");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    if (!user || queueStatus !== "queued") return;

    const supabase = createClient();
    const heartbeat = window.setInterval(() => {
      void supabase.rpc("touch_live_match_queue");
    }, 30_000);

    return () => {
      window.clearInterval(heartbeat);
      void supabase.rpc("leave_live_match_queue");
    };
  }, [queueStatus, user?.id]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`live-match-membership:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_members",
          filter: `member_id=eq.${user.id}`,
        },
        () => {
          setQueueStatus("matched");
          setNotice("Connected! Your live chat is ready.");
          setError("");
          router.refresh();
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [router, user?.id]);

  async function joinQueue() {
    if (!user) {
      onSignIn();
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    const supabase = createClient();
    const { data, error: queueError } = await supabase.rpc("join_live_match_queue");
    const result = (data as QueueResult[] | null)?.[0];

    if (queueError || !result) {
      setError(queueError?.message ?? "Could not join the live queue.");
      setBusy(false);
      return;
    }

    setQueueCount(result.queue_count);
    if (result.status === "matched") {
      setQueueStatus("matched");
      setNotice("Connected! Your live chat is ready.");
    } else if (result.status === "queued_fallback") {
      setQueueStatus("queued");
      setNotice("Connected! You are still waiting for a live match.");
    } else {
      setQueueStatus("queued");
      setNotice("You are in the live queue.");
    }
    router.refresh();
    setBusy(false);
  }

  async function leaveQueue() {
    if (!user) return;
    setBusy(true);
    const supabase = createClient();
    const { error: leaveError } = await supabase.rpc("leave_live_match_queue");
    if (leaveError) setError(leaveError.message);
    else {
      setQueueStatus("idle");
      setNotice("");
      setQueueCount(0);
    }
    setBusy(false);
  }

  return (
    <div className="sona-live-match">
      <div className="sona-live-match-heading">
        <span>Live match</span>
        {queueStatus === "queued" ? <small>{queueCount} waiting</small> : null}
      </div>

      {queueStatus === "matched" ? (
        <div className="sona-match-result" role="status">
          <span><strong>Connected!</strong><small>Your live chat is open below.</small></span>
        </div>
      ) : (
        <button
          className="button sona-connect-button"
          type="button"
          disabled={busy}
          onClick={() => void joinQueue()}
        >
          {busy ? "Matching…" : queueStatus === "queued" ? "Still matching" : "Match"}
        </button>
      )}

      {queueStatus === "queued" ? (
        <button className="sona-queue-leave" type="button" disabled={busy} onClick={() => void leaveQueue()}>
          Leave queue
        </button>
      ) : null}
      {notice ? <p className="sona-connect-success" role="status">{notice}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
