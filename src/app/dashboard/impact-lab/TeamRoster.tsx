"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { UserPlus, UserMinus, Search, Loader2 } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import type { TeamMemberView } from "@/lib/impact-lab/member";

type SearchHit =
  | { kind: "participant"; id: string; fullName: string; onTeam: string | null }
  | { kind: "account"; userId: string; fullName: string };

/**
 * Roster self-service for a team.
 *
 * Groups shifted on the night — people moved tables, some never arrived — so
 * any member can add whoever is actually sitting with them and drop a no-show,
 * without queueing at the check-in desk. The server resolves the caller's team
 * from their session, so this can only ever edit your own team.
 */
export function TeamRoster({
  members,
  onChanged,
  cohort,
}: {
  members: TeamMemberView[];
  onChanged: () => void;
  /** The team's event — appended as `?cohort=` on every fetch. */
  cohort?: string;
}) {
  const reduceMotion = useReducedMotion();
  const cohortQuery = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  const cohortSearchParam = cohort ? `&cohort=${encodeURIComponent(cohort)}` : "";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(value: string) {
    setQuery(value);
    setError(null);
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `/api/impact-lab/team/search?q=${encodeURIComponent(value.trim())}${cohortSearchParam}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Search failed. Try again.");
        setHits([]);
        return;
      }
      setHits(json.results as SearchHit[]);
    } catch {
      setError("Search failed. Check your connection.");
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  async function mutate(
    body: { participantId: string } | { userId: string },
    method: "POST" | "DELETE"
  ) {
    const busyKey = "participantId" in body ? body.participantId : body.userId;
    setBusyId(busyKey);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/impact-lab/team/roster${cohortQuery}`, {
        method,
        headers: await csrfHeaders(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "That did not work. Try again.");
        return;
      }
      setNotice(json.message ?? "Team updated.");
      setQuery("");
      setHits([]);
      onChanged();
    } catch {
      setError("That did not work. Check your connection.");
    } finally {
      setBusyId(null);
    }
  }

  const memberIds = new Set(members.map((m) => m.id));
  const leader = members.find((m) => m.isLeader) ?? null;
  const iAmLeader = leader?.isSelf ?? false;

  // Somebody has to be the one who presents and who organisers chase. Any
  // member may claim it and a later claim replaces an earlier one — teams
  // re-decide, and a first-come lock would leave a team stuck with whoever
  // tapped fastest.
  async function claimLeadership() {
    setBusyId("leader");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/impact-lab/team/leader${cohortQuery}`, {
        method: "POST",
        headers: await csrfHeaders(),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "That did not work. Try again.");
        return;
      }
      setNotice(json.message ?? "You are now the team leader.");
      onChanged();
    } catch {
      setError("That did not work. Check your connection.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-border-default bg-bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-mono text-sm uppercase tracking-wider text-text-primary">
            Fix your team
          </h3>
          <p className="mt-1 text-sm text-text-dim">
            Add whoever is actually sitting with you, or drop someone who never
            showed up.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-border-default px-3 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary transition-colors hover:border-green-primary/40 hover:text-green-primary"
          aria-expanded={open}
        >
          {open ? "Done" : "Edit team"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border-default pt-4">
        <span className="font-mono text-xs uppercase tracking-wider text-text-dim">
          Team leader
        </span>
        {leader ? (
          <span className="rounded border border-green-primary/30 bg-green-primary/10 px-2.5 py-1 font-mono text-xs text-green-primary">
            {leader.isSelf ? "You" : leader.fullName}
          </span>
        ) : (
          <span className="text-sm text-text-dim">Nobody yet</span>
        )}
        {!iAmLeader && (
          <button
            type="button"
            onClick={claimLeadership}
            disabled={busyId === "leader"}
            className="rounded-lg border border-border-default px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-text-secondary transition-colors hover:border-green-primary/40 hover:text-green-primary disabled:opacity-50"
          >
            {busyId === "leader"
              ? "Saving…"
              : leader
                ? "Take over as leader"
                : "I'll be team leader"}
          </button>
        )}
      </div>

      {open && (
        <div className="mt-5 space-y-5">
          <div>
            <label
              htmlFor="roster-search"
              className="font-mono text-xs uppercase tracking-wider text-text-dim"
            >
              Search everyone registered
            </label>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim"
                aria-hidden="true"
              />
              <input
                id="roster-search"
                type="text"
                value={query}
                onChange={(e) => runSearch(e.target.value)}
                placeholder="Type at least two letters of their name"
                autoComplete="off"
                className="w-full rounded-lg border border-border-default bg-bg-primary py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary focus:outline-none"
              />
              {searching && (
                <Loader2
                  className={`absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim ${
                    reduceMotion ? "" : "animate-spin"
                  }`}
                  aria-hidden="true"
                />
              )}
            </div>

            {hits.length > 0 && (
              <ul className="mt-3 divide-y divide-border-default overflow-hidden rounded-lg border border-border-default">
                {hits.map((hit) => {
                  const key = hit.kind === "participant" ? hit.id : hit.userId;
                  const already = hit.kind === "participant" && memberIds.has(hit.id);
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-3 bg-bg-primary px-3 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-text-primary">
                          {hit.fullName}
                        </span>
                        {hit.kind === "participant" && hit.onTeam && !already && (
                          <span className="block text-xs text-amber">
                            Currently on {hit.onTeam} — adding moves them here
                          </span>
                        )}
                        {hit.kind === "account" && (
                          <span className="block text-xs text-text-dim">
                            Has an account, not on the roster yet
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        disabled={already || busyId === key}
                        onClick={() =>
                          mutate(
                            hit.kind === "participant"
                              ? { participantId: hit.id }
                              : { userId: hit.userId },
                            "POST"
                          )
                        }
                        className="shrink-0 rounded-md border border-green-primary/30 bg-green-primary/10 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-green-primary transition-colors hover:bg-green-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {already ? (
                          "on your team"
                        ) : (
                          <>
                            <UserPlus className="mr-1 inline h-3 w-3" aria-hidden="true" />
                            add
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {query.trim().length >= 2 && !searching && hits.length === 0 && (
              <p className="mt-3 text-sm text-text-dim">
                Nobody registered matches that name.
              </p>
            )}
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-text-dim">
              Remove a no-show
            </p>
            <ul className="mt-2 space-y-2">
              {members
                .filter((m) => !m.isSelf)
                .map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border-default bg-bg-primary px-3 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm text-text-primary">
                      {m.fullName}
                      {!m.checkedIn && (
                        <span className="ml-2 text-xs text-amber">not checked in</span>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={busyId === m.id}
                      onClick={() => mutate({ participantId: m.id }, "DELETE")}
                      className="shrink-0 rounded-md border border-red/30 bg-red/10 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider text-red transition-colors hover:bg-red/20 disabled:opacity-40"
                    >
                      <UserMinus className="mr-1 inline h-3 w-3" aria-hidden="true" />
                      remove
                    </button>
                  </li>
                ))}
            </ul>
            <p className="mt-2 text-xs text-text-dim">
              You cannot remove yourself. If you have moved tables, ask your new
              team to add you — that moves you across.
            </p>
          </div>

          {notice && (
            <p role="status" className="text-sm text-green-primary">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
