"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import type { JoinRequestInboxItem, JoinRequestInboxView } from "@/lib/impact-lab/member";
import { useVisiblePoll } from "./useVisiblePoll";

/** Either half of GET /api/impact-lab/team/join-request. */
type JoinRequestGetResponse =
  | ({ success: true } & JoinRequestInboxView)
  | { success: true; onTeam: false }
  | { success?: false; error?: string };

const POLL_INTERVAL_MS = 30_000;

/**
 * The other side of "ask to join a team": people without a team, shown to a
 * team that still has room.
 *
 * Accepting is the sanctioned way past a locked roster — the person is placed
 * through the same shared roster helper the add/drop route uses, so they leave
 * `unassignedIds` and land on this team in one write. The section disappears
 * once the team is full, because a team over five stops being eligible to win
 * and should not be invited to grow further.
 */
export function JoinRequestsInbox({
  cohort,
  onAccepted,
}: {
  /** The team's event — appended as `?cohort=` on every fetch. */
  cohort?: string;
  /** Called after a successful accept, so the parent refetches the roster. */
  onAccepted: () => void;
}) {
  const cohortQuery = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  const [requests, setRequests] = useState<JoinRequestInboxItem[]>([]);
  const [hasRoom, setHasRoom] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/impact-lab/team/join-request${cohortQuery}`);
      if (!res.ok) return; // keep what's on screen; retry next tick
      const json: JoinRequestGetResponse = await res.json();
      if (!json.success || !json.onTeam) return;
      setRequests(json.requests);
      setHasRoom(json.myTeamSize < json.maxTeamSize);
    } catch {
      // Leave the last good state rather than blanking a live screen.
    }
  }, [cohortQuery]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useVisiblePoll(() => void refresh(), POLL_INTERVAL_MS);

  async function accept(id: string) {
    setBusyId(id);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch(
        `/api/impact-lab/team/join-request/${encodeURIComponent(id)}/accept${cohortQuery}`,
        { method: "POST", headers: await csrfHeaders() }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "That did not work. Try again.");
        // A 409 means somebody else took them — drop the stale row immediately.
        await refresh();
        return;
      }
      setWarning(json.warning ?? null);
      setRequests((prev) => prev.filter((r) => r.id !== id));
      onAccepted();
    } catch {
      setError("That did not work. Check your connection.");
    } finally {
      setBusyId(null);
    }
  }

  // Nothing to say to a full team with an empty inbox.
  if (!hasRoom && requests.length === 0) return null;

  return (
    <section
      className="mt-8 rounded-xl border border-border-default bg-bg-card p-4 sm:p-5"
      aria-label="People asking to join"
    >
      <h3 className="font-mono text-sm uppercase tracking-wider text-text-primary">
        People asking to join
      </h3>
      <p className="mt-1 break-words text-sm text-text-dim">
        Nobody placed them on a team. Accepting puts them on yours straight away.
      </p>

      {requests.length === 0 ? (
        <p className="mt-4 text-sm text-text-dim">No requests right now.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-border-default bg-bg-primary p-4 sm:p-5"
            >
              <p className="flex flex-wrap items-center gap-2 break-words text-sm text-text-primary">
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    r.checkedIn ? "bg-green-primary" : "bg-text-dim"
                  }`}
                />
                {r.participant.fullName}
                <span className="font-mono text-[11px] text-text-dim">
                  {r.checkedIn ? "in the room" : "not checked in"}
                </span>
              </p>
              <p className="mt-1 break-words font-mono text-xs text-text-dim">
                {r.participant.primaryRole || "No role given"} &middot;{" "}
                {r.participant.experienceLevel.toLowerCase()}
              </p>
              {r.participant.technicalSkills.length > 0 && (
                <p className="mt-1 break-words font-mono text-xs text-text-dim">
                  {r.participant.technicalSkills.join(", ")}
                </p>
              )}
              {r.note && (
                <p className="mt-2 break-words text-sm text-text-secondary">{r.note}</p>
              )}
              <button
                type="button"
                onClick={() => void accept(r.id)}
                disabled={busyId === r.id}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-4 font-mono text-[11px] font-semibold uppercase tracking-wider text-green-primary transition-colors hover:bg-green-primary/20 disabled:opacity-40 sm:w-auto"
              >
                {busyId === r.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {busyId === r.id ? "Adding…" : "Accept"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {warning && (
        <p role="status" className="mt-3 break-words text-sm text-amber">
          {warning}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 break-words text-sm text-red">
          {error}
        </p>
      )}
    </section>
  );
}
