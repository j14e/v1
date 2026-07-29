"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ContactButtonProps = {
  requesterId: string;
  addresseeId: string;
  existingId: string | null;
};

export function ContactButton({
  requesterId,
  addresseeId,
  existingId,
}: ContactButtonProps) {
  const [contactId, setContactId] = useState(existingId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleContact() {
    setBusy(true);
    setMessage("");
    const supabase = createClient();

    if (contactId) {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contactId);
      if (error) setMessage(error.message);
      else {
        setContactId(null);
        setMessage("Contact request removed.");
      }
    } else {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          requester_id: requesterId,
          addressee_id: addresseeId,
        })
        .select("id")
        .single();
      if (error) setMessage(error.message);
      else {
        setContactId(data.id);
        setMessage("Contact request saved.");
      }
    }

    setBusy(false);
  }

  return (
    <div className="contact-control">
      <button className="button" type="button" onClick={toggleContact} disabled={busy}>
        {busy
          ? "Saving…"
          : contactId
            ? "Remove contact request"
            : "Add to my contacts"}
      </button>
      {message ? <span className="inline-message">{message}</span> : null}
    </div>
  );
}
