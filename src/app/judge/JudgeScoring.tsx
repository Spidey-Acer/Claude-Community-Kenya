"use client";

import { useCallback, useEffect, useState } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import {
  scoreTotal,
  type JudgingCriterion,
  type JudgingRubric,
  type ScoreSheet,
} from "@/lib/impact-lab/judging";

interface TeamRow {
  teamId: string;
  teamName: string;
  /** The venue's physical table. Null on runs saved before tables existed. */
  table: number | null;
  /** The track this team was matched into, already resolved to its label. */
  track: string;
  memberCount: number;
  submission: {
    projectName: string;
    pitch: string;
    repoUrl: string;
    demoUrl: string | null;
    /** Who the project helps and with what — the team's own words. */
    problemTackled: string;
    /** What is really built versus what is stubbed for the demo. */
    worksVsMocked: string;
    /** Where Claude sits in the product, as opposed to in the build process. */
    claudeUsage: string;
  } | null;
}

/**
 * The three written answers, in the order a judge reads them at a table:
 * who it is for, what is actually real, and where the AI sits. Declared once
 * rather than repeated inline so the labels cannot drift from the fields.
 */
const WRITTEN_ANSWERS: {
  key: "problemTackled" | "worksVsMocked" | "claudeUsage";
  heading: string;
}[] = [
  { key: "problemTackled", heading: "Who it helps" },
  { key: "worksVsMocked", heading: "What works vs mocked" },
  { key: "claudeUsage", heading: "Where Claude sits" },
];

/**
 * A judge is told "table 12" over a microphone, so the search box has to
 * accept that as readily as a project name. Matches a bare number and the
 * word "table" in front of one; anything else is treated as free text.
 */
function tableNumberIn(query: string): number | null {
  const match = /^(?:table\s*)?(\d{1,4})$/.exec(query);
  return match ? Number(match[1]) : null;
}

/**
 * Table order, with unnumbered teams last.
 *
 * A judge works the room in table order; any other order makes them scan the
 * whole list for the table they were just sent to. Teams with no table (older
 * runs) keep their original relative order at the bottom rather than being
 * scattered through the numbered ones.
 */
function byTableNumber(a: TeamRow, b: TeamRow): number {
  if (a.table === b.table) return 0;
  if (a.table === null) return 1;
  if (b.table === null) return -1;
  return a.table - b.table;
}

interface AssistResult {
  readsAs: string;
  observations: { criterion: string; note: string }[];
  questionsToAsk: string[];
  watchFor: string;
}

interface Payload {
  teams: TeamRow[];
  mine: Record<string, { scores: ScoreSheet; feedback: string | null }>;
  /**
   * The rubric this cohort is judged on. Optional in the type only because it
   * arrives over the wire and a malformed response must be handled rather than
   * trusted — there is deliberately NO default. Scoring refuses to render
   * without it, because the wrong rubric produces a scorecard that looks
   * completely normal and is silently against the wrong criteria.
   */
  rubric?: JudgingRubric;
}

/** Every selectable value for one criterion, built from its own min/max. */
function scaleFor(criterion: JudgingCriterion): number[] {
  return Array.from(
    { length: criterion.max - criterion.min + 1 },
    (_, i) => criterion.min + i
  );
}

// A 1–5 scale fits one row. A 1–10 scale does not — capping at 5 columns
// wraps it into two rows of thumb-sized buttons instead of overflowing a
// phone screen sideways.
function gridColsClass(criterion: JudgingCriterion): string {
  return criterion.max - criterion.min + 1 <= 4 ? "grid-cols-4" : "grid-cols-5";
}

/**
 * One team at a time. A judge is standing up holding a phone between demos —
 * a long scrolling grid of every team is unusable in that posture, so the list
 * collapses to the team being scored.
 */
export function JudgeScoring({
  cohort,
  onDirtyChange,
  onScoredChange,
}: {
  cohort: string;
  /** Reports whether any open team has scores edited since the last save, so
   *  an event switcher one level up can warn before discarding them. */
  onDirtyChange?: (dirty: boolean) => void;
  /**
   * Reports whether this judge has any score at all for this event — saved
   * earlier or entered just now. Called only once the teams have loaded, so a
   * caller can tell "no scores" from "not known yet" and does not act on the
   * empty state this component holds before its fetch resolves.
   */
  onScoredChange?: (hasScored: boolean) => void;
}) {
  const [data, setData] = useState<Payload | null>(null);
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const [sheets, setSheets] = useState<Record<string, ScoreSheet>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // "Unscored" first, because the failure at 5 AM is a team nobody reached —
  // and that is invisible on a list sorted by table number.
  const [filter, setFilter] = useState<"all" | "unscored" | "scored">("all");
  const [assist, setAssist] = useState<Record<string, AssistResult>>({});
  const [assisting, setAssisting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/impact-lab/judging?cohort=${encodeURIComponent(cohort)}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not load the teams.");
        return;
      }
      const payload = json.data as Payload;
      setData(payload);
      setSheets(
        Object.fromEntries(
          Object.entries(payload.mine).map(([id, v]) => [id, v.scores])
        )
      );
      setFeedback(
        Object.fromEntries(
          Object.entries(payload.mine).map(([id, v]) => [id, v.feedback ?? ""])
        )
      );
      // Scores already on the server are not "unsaved" the moment the page
      // loads — only mark a team dirty once its sheet is edited locally.
      setSaved(
        Object.fromEntries(Object.keys(payload.mine).map((id) => [id, true]))
      );
    } catch {
      setError("Could not load the teams. Check your connection.");
    }
  }, [cohort]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = Object.entries(sheets).some(
    ([id, sheet]) => Object.keys(sheet ?? {}).length > 0 && saved[id] === false
  );

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

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

  function setScore(teamId: string, key: string, value: number) {
    setSheets((prev) => ({ ...prev, [teamId]: { ...prev[teamId], [key]: value } }));
    // A new edit means the previous "saved" confirmation no longer describes
    // what is on screen.
    setSaved((prev) => ({ ...prev, [teamId]: false }));
  }

  // Optional reading help. Returns observations and questions, never scores —
  // a suggested number would anchor the judge before they had formed a view.
  async function askClaude(teamId: string) {
    setAssisting(teamId);
    setError(null);
    try {
      const res = await fetch("/api/admin/impact-lab/judging/assist", {
        method: "POST",
        headers: await csrfHeaders(),
        body: JSON.stringify({ teamId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "Could not read that submission.");
        return;
      }
      setAssist((prev) => ({ ...prev, [teamId]: json.data as AssistResult }));
    } catch {
      setError("Could not read that submission. Check your connection.");
    } finally {
      setAssisting(null);
    }
  }

  async function save(teamId: string) {
    setSaving(teamId);
    setError(null);
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
        setError(json.error || "That did not save.");
        return;
      }
      setSaved((prev) => ({ ...prev, [teamId]: true }));
    } catch {
      setError("That did not save. Check your connection.");
    } finally {
      setSaving(null);
    }
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red/30 bg-red/5 p-5">
        <p className="text-sm text-red">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 rounded-lg border border-border-default px-3 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-text-dim">Loading teams…</p>;
  }

  if (data.teams.length === 0) {
    return <p className="text-sm text-text-dim">No teams are published yet.</p>;
  }

  // No fallback rubric on purpose. The server always sends one, and guessing
  // the Impact Lab rubric here would silently show a judge five criteria out of
  // 100 for an event scored on eight out of 50 — a wrong scorecard that looks
  // entirely normal. Refusing to render is the safe failure.
  const rubric = data.rubric;
  if (!rubric) {
    return (
      <p className="text-sm text-red" role="alert">
        This event&apos;s judging rubric did not load, so scoring is disabled
        rather than risk scoring on the wrong criteria. Reload the page; if it
        keeps happening, tell an organiser before scoring anything.
      </p>
    );
  }

  const scoredIds = new Set(
    Object.entries(sheets)
      .filter(([, sheet]) => Object.keys(sheet ?? {}).length > 0)
      .map(([id]) => id)
  );

  const needle = query.trim().toLowerCase();
  const wantedTable = tableNumberIn(needle);
  // Sorted on a copy: `data.teams` is state and must not be reordered in place.
  const visible = [...data.teams]
    .filter((team) => {
      if (filter === "scored" && !scoredIds.has(team.teamId)) return false;
      if (filter === "unscored" && scoredIds.has(team.teamId)) return false;
      if (!needle) return true;
      // "12" and "table 12" find table 12. The number still falls through to
      // the text match as well, so a project called "Shamba 12" is findable.
      if (wantedTable !== null && team.table === wantedTable) return true;
      return (
        team.teamName.toLowerCase().includes(needle) ||
        team.track.toLowerCase().includes(needle) ||
        (team.submission?.projectName ?? "").toLowerCase().includes(needle)
      );
    })
    .sort(byTableNumber);

  const FILTERS: { key: "all" | "unscored" | "scored"; label: string }[] = [
    { key: "all", label: `All ${data.teams.length}` },
    { key: "unscored", label: `Not scored ${data.teams.length - scoredIds.size}` },
    { key: "scored", label: `Scored ${scoredIds.size}` },
  ];

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 -mx-1 space-y-2 bg-bg-primary px-1 pb-2 pt-1">
        <label htmlFor="judge-team-search" className="sr-only">
          Search teams
        </label>
        <input
          id="judge-team-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search table number or project"
          autoComplete="off"
          className="w-full rounded-lg border border-border-default bg-bg-card px-3 py-3 text-base text-text-primary placeholder:text-text-dim focus:border-green-primary focus:outline-none"
        />
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={`flex-1 rounded-lg border px-2 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                filter === f.key
                  ? "border-green-primary bg-green-primary/15 text-green-primary"
                  : "border-border-default bg-bg-card text-text-secondary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && (
        <p className="py-6 text-center text-sm text-text-dim">
          No team matches that.
        </p>
      )}

      {visible.map((team) => {
        const sheet = sheets[team.teamId] ?? {};
        const total = scoreTotal(sheet, rubric);
        const scoredCount = rubric.criteria.filter(
          (c) => typeof sheet[c.key] === "number"
        ).length;
        const isOpen = openTeam === team.teamId;

        return (
          <section
            key={team.teamId}
            className="overflow-hidden rounded-xl border border-border-default bg-bg-card"
          >
            <button
              type="button"
              onClick={() => setOpenTeam(isOpen ? null : team.teamId)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  {team.table !== null && (
                    <span className="font-mono text-base font-bold text-text-primary">
                      Table {team.table}
                    </span>
                  )}
                  <span className="truncate rounded-full border border-border-default px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-dim">
                    {team.track}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm text-text-primary">
                  {team.submission?.projectName ?? "No submission yet"}
                </span>
                <span className="block truncate font-mono text-[11px] text-text-dim">
                  {team.teamName}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={`block font-mono text-sm ${
                    scoredCount > 0 ? "text-green-primary" : "text-text-dim"
                  }`}
                >
                  {scoredCount > 0 ? `${total}/${rubric.totalOutOf}` : "—"}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  {scoredCount}/{rubric.criteria.length} scored
                </span>
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-border-default px-4 py-5">
                {team.submission && (
                  <div className="mb-5 rounded-lg border border-border-default bg-bg-primary p-3">
                    <p className="text-sm text-text-secondary">
                      {team.submission.pitch}
                    </p>

                    {/* The team's own written answers, above the criteria: a
                        judge who reads them before scoring asks better
                        questions than one who scores first and reads after. */}
                    <div className="mt-4 space-y-3">
                      {WRITTEN_ANSWERS.map((answer) => {
                        const text = team.submission?.[answer.key]?.trim();
                        if (!text) return null;
                        return (
                          <div key={answer.key}>
                            <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                              {answer.heading}
                            </p>
                            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-text-secondary">
                              {text}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-3 font-mono text-xs">
                      <a
                        href={team.submission.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan underline"
                      >
                        repo
                      </a>
                      {team.submission.demoUrl && (
                        <a
                          href={team.submission.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan underline"
                        >
                          demo
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  {!assist[team.teamId] ? (
                    <button
                      type="button"
                      onClick={() => void askClaude(team.teamId)}
                      disabled={assisting === team.teamId || !team.submission}
                      className="w-full rounded-lg border border-cyan/30 bg-cyan/5 px-3 py-2.5 font-mono text-xs uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-40"
                    >
                      {assisting === team.teamId
                        ? "Reading the submission…"
                        : team.submission
                          ? "Ask Claude to read this submission"
                          : "Nothing submitted to read"}
                    </button>
                  ) : (
                    <div className="rounded-lg border border-cyan/30 bg-cyan/5 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-cyan">
                        Reading help · not a score
                      </p>
                      <p className="mt-2 text-sm text-text-primary">
                        {assist[team.teamId].readsAs}
                      </p>
                      <ul className="mt-3 space-y-2">
                        {assist[team.teamId].observations.map((o) => (
                          <li key={o.criterion} className="text-xs leading-relaxed">
                            <span className="text-text-dim">{o.criterion}: </span>
                            <span className="text-text-secondary">{o.note}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-text-dim">
                        Ask them
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {assist[team.teamId].questionsToAsk.map((q) => (
                          <li key={q} className="text-xs text-text-secondary">
                            {q}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-xs text-amber">
                        Watch for: {assist[team.teamId].watchFor}
                      </p>
                      <p className="mt-3 text-[11px] text-text-dim">
                        Claude read only what this team wrote. The score is yours.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {rubric.criteria.map((criterion) => (
                    <fieldset key={criterion.key}>
                      <legend className="font-mono text-xs uppercase tracking-wider text-text-primary">
                        {criterion.label}{" "}
                        <span className="text-text-dim">
                          · {criterion.weight} pts
                        </span>
                      </legend>
                      <p className="mt-1 text-xs leading-relaxed text-text-dim">
                        {criterion.guidance}
                      </p>
                      <div
                        className={`mt-3 grid ${gridColsClass(criterion)} gap-2`}
                      >
                        {scaleFor(criterion).map((value) => {
                          const active = sheet[criterion.key] === value;
                          const anchor = rubric.scoreLabels?.[value];
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setScore(team.teamId, criterion.key, value)
                              }
                              aria-pressed={active}
                              aria-label={
                                anchor
                                  ? `${criterion.label}: ${value} — ${anchor}`
                                  : `${criterion.label}: ${value} of ${criterion.max}`
                              }
                              className={`rounded-lg border px-2 py-3 font-mono text-base transition-colors ${
                                active
                                  ? "border-green-primary bg-green-primary/15 text-green-primary"
                                  : "border-border-default bg-bg-primary text-text-secondary"
                              }`}
                            >
                              {value}
                            </button>
                          );
                        })}
                      </div>
                      {/* Anchor text only where the rubric supplies one — on a
                          scale too long to anchor per-value (Afretec), the
                          guidance above is the only calibration, not a fake
                          "1 = … · 5 = …" string that would not describe it. */}
                      {rubric.scoreLabels && (
                        <p className="mt-2 text-[11px] text-text-dim">
                          {sheet[criterion.key]
                            ? rubric.scoreLabels[sheet[criterion.key]]
                            : `${criterion.min} = ${rubric.scoreLabels[criterion.min]} · ${criterion.max} = ${rubric.scoreLabels[criterion.max]}`}
                        </p>
                      )}
                    </fieldset>
                  ))}
                </div>

                <div className="mt-6">
                  <label
                    htmlFor={`fb-${team.teamId}`}
                    className="font-mono text-xs uppercase tracking-wider text-text-dim"
                  >
                    What should this team hear? (optional)
                  </label>
                  <textarea
                    id={`fb-${team.teamId}`}
                    rows={3}
                    value={feedback[team.teamId] ?? ""}
                    onChange={(e) => {
                      setFeedback((prev) => ({
                        ...prev,
                        [team.teamId]: e.target.value,
                      }));
                      setSaved((prev) => ({ ...prev, [team.teamId]: false }));
                    }}
                    className="mt-2 w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-green-primary focus:outline-none"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void save(team.teamId)}
                    disabled={saving === team.teamId}
                    className="rounded-lg border border-green-primary/40 bg-green-primary/10 px-4 py-3 font-mono text-sm uppercase tracking-wider text-green-primary hover:bg-green-primary/20 disabled:opacity-50"
                  >
                    {saving === team.teamId ? "Saving…" : "Save score"}
                  </button>
                  <span className="font-mono text-sm text-text-secondary">
                    {total}/{rubric.totalOutOf}
                  </span>
                  {saved[team.teamId] && (
                    <span role="status" className="text-sm text-green-primary">
                      Saved
                    </span>
                  )}
                </div>

                {error && (
                  <p role="alert" className="mt-3 text-sm text-red">
                    {error}
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
