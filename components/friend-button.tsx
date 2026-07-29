"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Friendship } from "@/types/message";

type FriendButtonProps = {
  currentUserId: string;
  personId: string;
  initialFriendship: Friendship | null;
};

export function FriendButton({
  currentUserId,
  personId,
  initialFriendship,
}: FriendButtonProps) {
  const [friendship, setFriendship] = useState(initialFriendship);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const incomingRequest =
    friendship?.status === "requested" &&
    friendship.addressee_id === currentUserId;
  const outgoingRequest =
    friendship?.status === "requested" &&
    friendship.requester_id === currentUserId;
  const friends = friendship?.status === "accepted";

  async function addFriend() {
    setBusy(true);
    setNotice("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        requester_id: currentUserId,
        addressee_id: personId,
      })
      .select("id,requester_id,addressee_id,status")
      .single();

    if (error) setNotice(error.message);
    else {
      setFriendship(data as Friendship);
      setNotice("Friend request sent.");
    }
    setBusy(false);
  }

  async function acceptFriend() {
    if (!friendship) return;
    setBusy(true);
    setNotice("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("contacts")
      .update({ status: "accepted" })
      .eq("id", friendship.id)
      .select("id,requester_id,addressee_id,status")
      .single();

    if (error) setNotice(error.message);
    else {
      setFriendship(data as Friendship);
      setNotice("You are now friends.");
    }
    setBusy(false);
  }

  async function removeFriendship(message: string) {
    if (!friendship) return;
    setBusy(true);
    setNotice("");
    const supabase = createClient();
    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", friendship.id);

    if (error) setNotice(error.message);
    else {
      setFriendship(null);
      setNotice(message);
    }
    setBusy(false);
  }

  return (
    <div className="friend-control">
      {incomingRequest ? (
        <>
          <button
            className="button"
            type="button"
            onClick={acceptFriend}
            disabled={busy}
          >
            {busy ? "Saving…" : "Accept friend request"}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => removeFriendship("Friend request declined.")}
            disabled={busy}
          >
            Decline
          </button>
        </>
      ) : outgoingRequest ? (
        <button
          className="secondary-button"
          type="button"
          onClick={() => removeFriendship("Friend request cancelled.")}
          disabled={busy}
        >
          {busy ? "Saving…" : "Cancel friend request"}
        </button>
      ) : friends ? (
        <>
          <span className="friend-status">✓ friends</span>
          <button
            className="text-button"
            type="button"
            onClick={() => removeFriendship("Friend removed.")}
            disabled={busy}
          >
            remove friend
          </button>
        </>
      ) : (
        <button
          className="button"
          type="button"
          onClick={addFriend}
          disabled={busy}
        >
          {busy ? "Saving…" : "Add friend"}
        </button>
      )}
      {notice ? <span className="inline-message">{notice}</span> : null}
    </div>
  );
}
