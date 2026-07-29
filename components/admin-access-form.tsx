"use client";

import { useActionState } from "react";
import {
  setupAdminAction,
  unlockAdminAction,
  type AdminActionState,
} from "@/app/admin/actions";

const initialState: AdminActionState = { error: "", success: "" };

export function AdminAccessForm({ mode }: { mode: "setup" | "unlock" }) {
  const action = mode === "setup" ? setupAdminAction : unlockAdminAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form className="admin-access-form" action={formAction}>
      <label>
        {mode === "setup" ? "Create admin password" : "Admin password"}
        <input
          name="password"
          type="password"
          required
          minLength={mode === "setup" ? 10 : undefined}
          autoComplete={mode === "setup" ? "new-password" : "current-password"}
        />
      </label>
      {mode === "setup" ? (
        <label>
          Confirm admin password
          <input
            name="confirmation"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
          />
        </label>
      ) : null}
      {state.error ? <p className="form-error">{state.error}</p> : null}
      <button className="button" type="submit" disabled={pending}>
        {pending
          ? "Checking…"
          : mode === "setup"
            ? "Set password and open admin"
            : "Open admin"}
      </button>
    </form>
  );
}
