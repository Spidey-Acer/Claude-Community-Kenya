"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HandHelping, Loader2 } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import type { JoinRequestMineView, JoinRequestView } from "@/lib/impact-lab/member";
import type { MatchProfileTrack } from "./MatchProfileForm";
import { useVisiblePoll } from "./useVisiblePoll";

/** Either half of GET /api/impact-lab/team/join-request. */
type JoinRequestGetResponse =
  | ({ success: true } & JoinRequestMineView)
  | { success: true; onTeam: true }
  | { success?: false; error?: string };

const POLL_INTERVAL_MS = 30_000;
const NOTE_MAX = 200;

/**
 * "Ask to join a team" — the only affordance a person without a team has once
 * the organisers have finalized rosters.
 *
 * Until now the dashboard told them teams were locked and left them to find an
 * organiser in a loud room. This raises one request that every team in their
 * track with room sees; when a team accepts, the next poll finds them on a
 * team and hands off to the parent's refetch so the team card appears in place
 * of this one.
 */
export function JoinRequestCard({
  cohort,
  tracks = [],
  onPlaced,
}: {
  /** The event these fetches read — appended as `?cohort=` on every call. */
  cohort?: string;
  /** The event's declared tracks, so the copy can name the caller's track. */
  tracks?: MatchProfileTrack[];
  /** Called once a team has accepted — the parent refetches and swaps this out. */
  onPlaced: () => void;
}) {
  const cohortQuery = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  const [loading, setLoading] = useState(true);
  const [myRequest, setMyRequest] = useState<JoinRequestView | null>(null);
  const [myTrackKey, setMyTrackKey] = useState<string | null>(null);
  const [teamsWithRoom, setTeamsWithRoom] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Held in a ref so a fresh inline callback from the parent on every render
  // does not re-create `refresh` and re-fire the mount fetch in a loop.
  const onPlacedRef = useRef(onPlaced);
  useEffect(() => {
    onPlacedRef.current = onPlaced;
  }, [onPlaced]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/impact-lab/team/join-request${cohortQuery}`);
      if (!res.ok) return; // keep what's on screen; retry next tick
      const json: JoinRequestGetResponse = await res.json();
      if (!json.success) return;
      if (json.onTeam) {
        // A team accepted. The team card lives in the parent, so hand off.
        onPlacedRef.current();
        return;
      }
      setMyRequest(json.myRequest);
      setMyTrackKey(json.myTrackKey);
      setTeamsWithRoom(json.teamsWithRoom);
    } catch {
      // A failed background refresh must never blank a screen someone is
      // mid-read of — leave the last good state and try again on the next tick.
    } finally {
      setLoading(false);
    }
  }, [cohortQuery]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useVisiblePoll(() => void refresh(), POLL_INTERVAL_MS);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/impact-lab/team/join-request${cohortQuery}`, {
        method: "POST",
        headers: await csrfHeaders(),
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "That did not send. Try again.");
        return;
      }
      setMyRequest(json.request as JoinRequestView);
      setTeamsWithRoom(typeof json.teamsReached === "number" ? json.teamsReached : 0);
    } catch {
      setError("That did not send. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/impact-lab/team/join-request${cohortQuery}`, {
        method: "DELETE",
        headers: await csrfHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "That did not work. Try again.");
        return;
      }
      setMyRequest(null);
    } catch {
      setError("That did not work. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const trackLabel = tracks.find((t) => t.key === myTrackKey)?.label ?? myTrackKey;
  const canSend = Boolean(myTrackKey) && !busy;

  return (
    <section
      className="rounded-lg border border-green-primary/30 bg-bg-secondary p-4 sm:p-5"
      aria-label="Ask to join a team"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-green-primary/30 bg-green-primary/10">
          <HandHelping className="h-5 w-5 text-green-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-mono text-base font-bold text-text-primary">
            Ask to join a team
          </h2>

          {loading ? (
            <p className="mt-2 font-mono text-sm text-text-dim" role="status">
              Checking…
            </p>
          ) : myRequest ? (
            <div className="mt-2 space-y-3">
              <p className="break-words text-sm leading-relaxed text-text-secondary">
                Your request is with every team in{" "}
                <span className="text-text-primary">{trackLabel ?? "your track"}</span> that
                still has room ({teamsWithRoom}{" "}
                {teamsWithRoom === 1 ? "team" : "teams"}). You will see your team here when
                one accepts.
              </p>
              {myRequest.note && (
                <p className="break-words rounded border border-border-default bg-bg-card px-3 py-2 font-mono text-xs text-text-dim">
                  {myRequest.note}
                </p>
              )}
              <button
                type="button"
                onClick={() => void withdraw()}
                disabled={busy}
                className="inline-flex min-h-11 items-center text-sm text-text-dim underline underline-offset-4 transition-colors hover:text-red disabled:opacity-50"
              >
                {busy ? "Working…" : "Withdraw my request"}
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              {myTrackKey ? (
                <p className="break-words text-sm leading-relaxed text-text-secondary">
                  Teams in{" "}
                  <span className="text-text-primary">{trackLabel}</span> with fewer than
                  five people will see your name and can take you on.
                </p>
              ) : (
                <p
                  className="break-words rounded border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-amber"
                  role="status"
                >
                  Pick your track above first so the right teams see you
                </p>
              )}

              <div>
                <label
                  htmlFor="join-request-note"
                  className="font-mono text-xs uppercase tracking-wider text-text-dim"
                >
                  Add a note (optional)
                </label>
                <input
                  id="join-request-note"
                  type="text"
                  value={note}
                  maxLength={NOTE_MAX}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="One line about what you can build"
                  className="mt-2 w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2.5 text-base text-text-primary placeholder:text-text-dim focus:border-green-primary focus:outline-none sm:text-sm"
                />
              </div>

              <button
                type="button"
                onClick={() => void send()}
                disabled={!canSend}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-4 font-mono text-xs font-semibold uppercase tracking-wider text-green-primary transition-colors hover:bg-green-primary/20 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 break-words text-sm text-red">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
