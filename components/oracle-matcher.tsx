"use client";

import Link from "next/link";
import { useActionState } from "react";
import { runConnectionOracle } from "@/app/oracle/actions";
import { Avatar } from "@/components/avatar";
import { AvailabilityBadge } from "@/components/availability-badge";
import type { OracleState } from "@/types/oracle";

function formatConnectedDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland",
  }).format(new Date(value));
}

export function OracleMatcher({
  initialState,
}: {
  initialState: OracleState;
}) {
  const [state, formAction, pending] = useActionState(
    runConnectionOracle,
    initialState,
  );

  return (
    <section className="oracle-card">
      <div className="profile-titlebar oracle-titlebar">
        <div>
          <h1>Connection Oracle</h1>
          <small>five introductions, chosen completely at random</small>
        </div>
        <span>random introductions</span>
      </div>

      <div className="oracle-intro">
        <div className="oracle-explanation">
          <h2>Ask the directory for five random introductions</h2>
          <p>
            The Oracle selects up to five people you have not matched with
            before. Every verified, active, previously unconnected member has
            an equal chance of being selected.
          </p>
          <ol>
            <li>No year, programme, major, or course filters are used.</li>
            <li>The draw is random among eligible members.</li>
            <li>
              Each match appears in Messages as a system connection notice.
            </li>
          </ol>
          <form action={formAction}>
            <button className="button oracle-button" type="submit" disabled={pending}>
              {pending ? "Consulting the Oracle…" : "Find five connections"}
            </button>
          </form>
          {state.error ? (
            <p className="form-error oracle-feedback" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.message ? (
            <p className="form-success oracle-feedback" role="status">
              {state.message}
            </p>
          ) : null}
        </div>
      </div>

      <section className="oracle-results" aria-labelledby="oracle-results-title">
        <div className="oracle-results-heading">
          <div>
            <h2 id="oracle-results-title">
              {state.hasRun ? "Oracle result" : "Previous connections"}
            </h2>
            <p>
              {state.matches.length
                ? `${state.matches.length} ${
                    state.matches.length === 1 ? "person" : "people"
                  } shown`
                : "No connections to show yet"}
            </p>
          </div>
          <Link href="/messages">open messages →</Link>
        </div>

        {state.matches.length ? (
          <div className="oracle-table">
            <div className="oracle-row oracle-header" aria-hidden="true">
              <span>person</span>
              <span>selection</span>
              <span>studies</span>
              <span>connected</span>
              <span />
            </div>
            {state.matches.map((match) => (
              <div className="oracle-row" key={match.matched_id}>
                <span className="person-cell">
                  <Avatar
                    name={match.display_name}
                    url={match.avatar_url}
                    size="medium"
                  />
                  <span>
                    <strong>{match.display_name}</strong>
                    <AvailabilityBadge status={match.availability_status} />
                  </span>
                </span>
                <span className="oracle-reasons">
                  <small>randomly selected</small>
                </span>
                <span>
                  {match.year_level}
                  <small>{match.programme || "Programme not listed"}</small>
                  {match.major ? <small>{match.major}</small> : null}
                </span>
                <time dateTime={match.connected_at}>
                  {formatConnectedDate(match.connected_at)}
                </time>
                <span className="oracle-actions">
                  <Link href={`/messages/${match.matched_id}`}>message</Link>
                  <Link href={`/people/${match.matched_id}`}>profile</Link>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="oracle-empty">
            <strong>The Oracle is waiting.</strong>
            <p>
              Run a match now, or return later when more verified members have
              joined.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
