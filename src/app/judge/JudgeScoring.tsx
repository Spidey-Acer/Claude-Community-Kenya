"use client";

import { useCallback, useEffect, useState } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import {
  byTableNumber,
  formatClockTime,
  matchesFilter,
  matchesTeamQuery,
  tracksInRun,
  type JudgeListFilter,
  type JudgeTeamRow,
} from "@/lib/impact-lab/judge-team";
import {
  scoreTotal,
  type JudgingRubric,
  type ScoreSheet,
} from "@/lib/impact-lab/judging";
import { CHIP, CHIP_OFF, CHIP_ON, EYEBROW, FOCUS_RING, GHOST_BUTTON } from "./judge-ui";
import { TeamDetail, type AssistResult } from "./TeamDetail";
import { TeamListRow } from "./TeamListRow";
import { useIsDesktop } from "./useIsDesktop";

/**
 * The scorecard: every team in the final run, and one of them open.
 *
 * On a phone the list is the screen and the open team expands under its row.
 * From lg the list holds a fixed 360px column that scrolls on its own and the
 * open team fills the pane beside it, so a judge on a laptop at the judges'
 * table can see the run and the team at once.
 *
 * The detail is rendered exactly once either way — see `useIsDesktop` for why
 * that matters more than it looks.
 */

/** One judge's saved sheet as the judging endpoint sends it. */
interface SavedSheet {
  scores: ScoreSheet;
  feedback: string | null;
  /** ISO time this sheet was last written. Absent on older responses. */
  savedAt?: string;
}

interface Payload {
  teams: JudgeTeamRow[];
  mine: Record<string, SavedSheet>;
  /**
   * The rubric this cohort is judged on. Optional in the type only because it
   * arrives over the wire and a malformed response must be handled rather than
   * trusted — there is deliberately NO default. Scoring refuses to render
   * without it, because the wrong rubric produces a scorecard that looks
   * completely normal and is silently against the wrong criteria.
   */
  rubric?: JudgingRubric;
}

export function JudgeScoring({
  cohort,
  onDirtyChange,
  onScoredChange,
  onOpenTeamChange,
}: {
  cohort: string;
  /** Reports whether any team has scores edited since the last save, so an
   *  event switcher one level up can warn before discarding them. */
  onDirtyChange?: (dirty: boolean) => void;
  /**
   * Reports whether this judge has any score at all for this event — saved
   * earlier or entered just now. Called only once the teams have loaded, so a
   * caller can tell "no scores" from "not known yet" and does not act on the
   * empty state this component holds before its fetch resolves.
   */
  onScoredChange?: (hasScored: boolean) => void;
  /**
   * Reports whether a team is open. The pitch timer collapses to a slim strip
   * while one is, so it and this screen's action bar never overlap.
   */
  onOpenTeamChange?: (open: boolean) => void;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const [sheets, setSheets] = useState<Record<string, ScoreSheet>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<JudgeListFilter>("all");
  const [assist, setAssist] = useState<Record<string, AssistResult>>({});
  const [assisting, setAssisting] = useState<string | null>(null);

  const isDesktop = useIsDesktop();

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/impact-lab/judging?cohort=${encodeURIComponent(cohort)}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setLoadError(json.error || "Could not load the teams.");
        return;
      }
      const payload = json.data as Payload;
      setData(payload);
      setSheets(
        Object.fromEntries(
          Object.entries(payload.mine).map(([id, saved]) => [id, saved.scores])
        )
      );
      setFeedback(
        Object.fromEntries(
          Object.entries(payload.mine).map(([id, saved]) => [id, saved.feedback ?? ""])
        )
      );
      // A sheet already on the server carries the clock time it was written,
      // so a judge returning to a team sees "Saved 16:52" rather than a bare
      // "Saved" that could be from any point in the evening.
      setSavedAt(
        Object.fromEntries(
          Object.entries(payload.mine)
            .filter(([, saved]) => Boolean(saved.savedAt))
            .map(([id, saved]) => [id, formatClockTime(new Date(saved.savedAt as string))])
        )
      );
      setDirty({});
    } catch {
      setLoadError("Could not load the teams. Check your connection.");
    }
  }, [cohort]);

  useEffect(() => {
    void load();
  }, [load]);

  const anyDirty = Object.values(dirty).some(Boolean);
  useEffect(() => {
    onDirtyChange?.(anyDirty);
  }, [anyDirty, onDirtyChange]);

  const hasScored = Object.values(sheets).some(
    (sheet) => Object.keys(sheet ?? {}).length > 0
  );

  // Gated on `data`: before the fetch resolves every sheet is empty, and
  // reporting that as "has not scored" would be a claim this component cannot
  // yet make.
  useEffect(() => {
    if (!data) return;
    onScoredChange?.(hasScored);
  }, [data, hasScored, onScoredChange]);

  useEffect(() => {
    onOpenTeamChange?.(openTeam !== null);
  }, [openTeam, onOpenTeamChange]);

  // On a laptop the right-hand pane is the whole point of the layout; an
  // empty pane reads as a broken page, so open the first team by default.
  useEffect(() => {
    if (!isDesktop || openTeam || !data || data.teams.length === 0) return;
    const first = [...data.teams].sort(
      (a, b) => (a.table ?? Number.MAX_SAFE_INTEGER) - (b.table ?? Number.MAX_SAFE_INTEGER)
    )[0];
    if (first) setOpenTeam(first.teamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per desktop mount
  }, [isDesktop, data]);

  function setScore(teamId: string, criterionKey: string, value: number) {
    setSheets((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [criterionKey]: value },
    }));
    setDirty((prev) => ({ ...prev, [teamId]: true }));
  }

  function setNote(teamId: string, text: string) {
    setFeedback((prev) => ({ ...prev, [teamId]: text }));
    setDirty((prev) => ({ ...prev, [teamId]: true }));
  }

  /**
   * Optional reading help. Returns observations and questions, never scores —
   * a suggested number would anchor the judge before they had formed a view.
   */
  async function askClaude(teamId: string) {
    setAssisting(teamId);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/impact-lab/judging/assist", {
        method: "POST",
        headers: await csrfHeaders(),
        body: JSON.stringify({ teamId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSaveError(json.error || "Could not read that submission.");
        return;
      }
      setAssist((prev) => ({ ...prev, [teamId]: json.data as AssistResult }));
    } catch {
      setSaveError("Could not read that submission. Check your connection.");
    } finally {
      setAssisting(null);
    }
  }

  async function save(teamId: string) {
    setSaving(teamId);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/admin/impact-lab/judging?cohort=${encodeURIComponent(cohort)}`,
        {
          method: "POST",
          headers: await csrfHeaders(),
          body: JSON.stringify({
            teamId,
            scores: sheets[teamId] ?? {},
            feedback: feedback[teamId] ?? "",
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setSaveError(json.error || "That did not save.");
        return;
      }
      setSavedAt((prev) => ({ ...prev, [teamId]: formatClockTime(new Date()) }));
      setDirty((prev) => ({ ...prev, [teamId]: false }));
    } catch {
      setSaveError("That did not save. Check your connection.");
    } finally {
      setSaving(null);
    }
  }

  if (loadError && !data) {
    return (
      <div className="rounded-lg border border-red/30 bg-red/5 p-5">
        <p className="text-[15px] text-red">{loadError}</p>
        <button type="button" onClick={() => void load()} className={`mt-3 ${GHOST_BUTTON}`}>
          Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="text-[15px] text-text-dim">Loading teams…</p>;
  }

  if (data.teams.length === 0) {
    return <p className="text-[15px] text-text-dim">No teams are published yet.</p>;
  }

  // No fallback rubric on purpose. The server always sends one, and guessing
  // the Impact Lab rubric here would silently show a judge five criteria out of
  // 100 for an event scored on eight out of 50 — a wrong scorecard that looks
  // entirely normal. Refusing to render is the safe failure.
  const rubric = data.rubric;
  if (!rubric) {
    return (
      <p className="text-[15px] text-red" role="alert">
        This event&apos;s judging rubric did not load, so scoring is disabled
        rather than risk scoring on the wrong criteria. Reload the page; if it
        keeps happening, tell an organiser before scoring anything.
      </p>
    );
  }

  /** This judge's own total for a team, or null when they have not scored it. */
  const totalFor = (teamId: string): number | null => {
    const sheet = sheets[teamId];
    if (!sheet || Object.keys(sheet).length === 0) return null;
    return scoreTotal(sheet, rubric);
  };

  const scoredCount = data.teams.filter((t) => totalFor(t.teamId) !== null).length;

  const visible = [...data.teams]
    .filter(
      (team) =>
        matchesFilter(team, filter, totalFor(team.teamId) !== null) &&
        matchesTeamQuery(team, query)
    )
    .sort(byTableNumber);

  const filters: { key: JudgeListFilter; label: string }[] = [
    { key: "all", label: `All ${data.teams.length}` },
    { key: "unscored", label: `Not scored ${data.teams.length - scoredCount}` },
    { key: "scored", label: `Scored ${scoredCount}` },
    ...tracksInRun(data.teams).map((track) => ({
      key: `track:${track.key}` as JudgeListFilter,
      label: track.label,
    })),
  ];

  const openRow = openTeam ? data.teams.find((t) => t.teamId === openTeam) : undefined;

  /** The open team's detail, wired to this component's state. Rendered once. */
  const detailFor = (team: JudgeTeamRow) => (
    <TeamDetail
      team={team}
      rubric={rubric}
      sheet={sheets[team.teamId] ?? {}}
      feedback={feedback[team.teamId] ?? ""}
      savedAtLabel={savedAt[team.teamId] ?? null}
      dirty={Boolean(dirty[team.teamId])}
      saving={saving === team.teamId}
      error={saveError}
      assist={assist[team.teamId]}
      assisting={assisting === team.teamId}
      onScore={(key, value) => setScore(team.teamId, key, value)}
      onFeedback={(text) => setNote(team.teamId, text)}
      onSave={() => void save(team.teamId)}
      onAskClaude={() => void askClaude(team.teamId)}
    />
  );

  return (
    <div className={openTeam ? "pb-44 lg:pb-0" : "pb-20 lg:pb-0"}>
      <div className="lg:grid lg:grid-cols-[minmax(420px,5fr)_minmax(0,7fr)] lg:gap-8">
        <div className="lg:h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pr-1">
          <div className="space-y-2 bg-bg-primary pb-3 lg:sticky lg:top-0 lg:z-10">
            <div className="flex items-baseline justify-between gap-3">
              <p className={EYEBROW}>
                Scored {scoredCount} of {data.teams.length}
              </p>
              {visible.length !== data.teams.length && (
                <p className={EYEBROW}>{visible.length} shown</p>
              )}
            </div>

            <label htmlFor="judge-team-search" className="sr-only">
              Search by table, team, project or member
            </label>
            <input
              id="judge-team-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Table, team, project or member"
              autoComplete="off"
              className={`w-full rounded-lg border border-border-default bg-bg-card px-3 py-3 text-base text-text-primary placeholder:text-text-dim ${FOCUS_RING} focus:border-green-primary`}
            />

            {/* Scrolls sideways rather than wrapping: with one chip per track
                the row is wider than 360px, and a wrapping row pushes the
                first team off a phone screen. */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
              {filters.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setFilter(entry.key)}
                  aria-pressed={filter === entry.key}
                  className={`${CHIP} ${filter === entry.key ? CHIP_ON : CHIP_OFF}`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 && (
            <p className="py-6 text-center text-[15px] text-text-dim">
              No team matches that.
            </p>
          )}

          <div className="space-y-2">
            {visible.map((team) => {
              const isSelected = openTeam === team.teamId;
              return (
                <section
                  key={team.teamId}
                  className={`overflow-hidden rounded-lg border bg-bg-secondary ${
                    isSelected ? "border-green-primary/40" : "border-border-default"
                  }`}
                >
                  <TeamListRow
                    team={team}
                    isSelected={isSelected}
                    isDesktop={isDesktop}
                    scoredTotal={totalFor(team.teamId)}
                    totalOutOf={rubric.totalOutOf}
                    onSelect={() => setOpenTeam(isSelected ? null : team.teamId)}
                  />
                  {isSelected && !isDesktop && (
                    <div className="border-t border-border-default px-4 py-5">
                      {detailFor(team)}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        {isDesktop && (
          <div className="relative hidden lg:block lg:h-[calc(100vh-14rem)] lg:overflow-y-auto lg:pr-1">
            {openRow ? (
              detailFor(openRow)
            ) : (
              <p className="pt-10 text-center text-[15px] text-text-dim">
                Pick a team from the list to score it.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
