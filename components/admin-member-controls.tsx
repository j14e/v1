"use client";

import { useActionState } from "react";
import {
  manageMemberAction,
  type AdminActionState,
} from "@/app/admin/actions";

const initialState: AdminActionState = { error: "", success: "" };

export function AdminMemberControls({
  memberId,
  memberName,
  frozen,
}: {
  memberId: string;
  memberName: string;
  frozen: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    manageMemberAction,
    initialState,
  );

  return (
    <form
      className="admin-member-controls"
      action={formAction}
      onSubmit={(event) => {
        const submitter = (event.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        if (
          submitter?.value === "remove" &&
          !window.confirm(
            `Permanently remove ${memberName}? Their account and messages will be deleted.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="member_id" value={memberId} />
      <button
        className="secondary-button"
        type="submit"
        name="intent"
        value={frozen ? "unfreeze" : "freeze"}
        disabled={pending}
      >
        {frozen ? "unfreeze" : "freeze"}
      </button>
      <button
        className="danger-button"
        type="submit"
        name="intent"
        value="remove"
        disabled={pending}
      >
        remove
      </button>
      {state.error ? <small className="admin-action-error">{state.error}</small> : null}
      {state.success ? (
        <small className="admin-action-success">{state.success}</small>
      ) : null}
    </form>
  );
}
