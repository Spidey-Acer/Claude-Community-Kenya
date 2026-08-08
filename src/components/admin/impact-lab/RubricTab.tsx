"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Info,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react"
import { apiGet, apiSend, ApiError, type ApiIssue } from "./api"

/**
 * The rubric an organiser authors for a cohort.
 *
 * The screen exists because retyping eight criteria with eight different maxima
 * into a form is where a transposed max comes from, and a wrong max silently
 * rewrites every recorded total. So: paste the panel's rubric, let Claude propose
 * the structure, check it, save it.
 *
 * The frozen banner is not decoration. Once a cohort has scores, structure is
 * immutable server-side — this UI shows that on load rather than letting someone
 * type for ten minutes and then read a 409. Labels, guidance, anchors and order
 * stay editable, because they carry no arithmetic.
 */

type ScoringMode = "normalized" | "points"

interface CriterionDraft {
  key: string
  label: string
  guidance: string
  min: number
  max: number
  weight: number
}

interface RubricDraft {
  label: string
  scoring: ScoringMode
  criteria: CriterionDraft[]
  scoreLabels: Record<string, string> | null
}

interface RubricData {
  rubric: RubricDraft
  source: "database" | "built-in"
  builtInLabel: string
  provenance: { source: string; updatedByEmail: string; updatedAt: string } | null
  totalOutOf: number
  weightSum: number
  warnings: string[]
  frozen: boolean
  scorecardCount: number
  judgingClosedAt: string | null
}

interface ExtractData {
  draft: RubricDraft
  valid: boolean
  issues: ApiIssue[]
  warnings: string[]
  weightSum: number
  scoringReasoning: string
  notes: string[]
  model: string
}

/** Score anchors are stored string-keyed; the editor works in ordered rows. */
type AnchorRow = { value: string; text: string }

function anchorRows(labels: Record<string, string> | null): AnchorRow[] {
  return Object.entries(labels ?? {})
    .map(([value, text]) => ({ value, text }))
    .sort((a, b) => Number(a.value) - Number(b.value))
}

function anchorsToRecord(rows: AnchorRow[]): Record<string, string> | null {
  const entries = rows.filter((r) => r.value.trim() !== "" && r.text.trim() !== "")
  if (entries.length === 0) return null
  return Object.fromEntries(entries.map((r) => [r.value.trim(), r.text]))
}

const FIELD = "w-full rounded border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-[11px] font-mono text-[#e0e0e0] placeholder:text-[#444] focus:border-[#00ff41] focus:outline-none disabled:cursor-not-allowed disabled:text-[#666]"
const LEGEND = "text-[10px] font-mono uppercase tracking-wider text-[#555]"

export function RubricTab({ cohort }: { cohort: string }) {
  const [data, setData] = useState<RubricData | null>(null)
  const [draft, setDraft] = useState<RubricDraft | null>(null)
  const [anchors, setAnchors] = useState<AnchorRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<ApiIssue[]>([])
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const [paste, setPaste] = useState("")
  const [extracting, setExtracting] = useState(false)
  const [extract, setExtract] = useState<ExtractData | null>(null)
  const [extractError, setExtractError] = useState<string | null>(null)
  /** True once a draft on screen came from an extraction, for save provenance. */
  const [fromExtraction, setFromExtraction] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const next = await apiGet<RubricData>(`/api/admin/impact-lab/rubric?cohort=${cohort}`)
      setData(next)
      setDraft(next.rubric)
      setAnchors(anchorRows(next.rubric.scoreLabels))
      setFromExtraction(false)
      setIssues([])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the rubric")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  const frozen = data?.frozen ?? false

  const weightSum = useMemo(
    () => (draft ? Math.round(draft.criteria.reduce((s, c) => s + (c.weight || 0), 0) * 100) / 100 : 0),
    [draft]
  )
  const maxTotal = draft?.scoring === "points" ? weightSum : 100
  const weightsOff = draft?.scoring === "normalized" && Math.abs(weightSum - 100) > 0.001

  const issueFor = (path: string): string | undefined =>
    issues.find((i) => i.path.join(".") === path)?.message

  const setCriterion = (index: number, patch: Partial<CriterionDraft>) => {
    setDraft((prev) => {
      if (!prev) return prev
      const criteria = prev.criteria.map((c, i) => {
        if (i !== index) return c
        const next = { ...c, ...patch }
        // Under points scoring the raw score IS the points, so weight must equal
        // max. Binding them here satisfies the invariant by construction instead
        // of by a rejection the organiser has to read and interpret.
        if (prev.scoring === "points") next.weight = next.max
        return next
      })
      return { ...prev, criteria }
    })
  }

  const setScoring = (scoring: ScoringMode) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            scoring,
            criteria:
              scoring === "points"
                ? prev.criteria.map((c) => ({ ...c, weight: c.max }))
                : prev.criteria,
          }
        : prev
    )
  }

  const move = (index: number, delta: number) => {
    setDraft((prev) => {
      if (!prev) return prev
      const target = index + delta
      if (target < 0 || target >= prev.criteria.length) return prev
      const criteria = [...prev.criteria]
      const [row] = criteria.splice(index, 1)
      criteria.splice(target, 0, row)
      return { ...prev, criteria }
    })
  }

  const addCriterion = () => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            criteria: [
              ...prev.criteria,
              { key: "", label: "", guidance: "", min: 1, max: 5, weight: prev.scoring === "points" ? 5 : 10 },
            ],
          }
        : prev
    )
  }

  const removeCriterion = (index: number) => {
    setDraft((prev) =>
      prev ? { ...prev, criteria: prev.criteria.filter((_, i) => i !== index) } : prev
    )
  }

  const runExtract = async () => {
    setExtracting(true)
    setExtractError(null)
    try {
      const result = await apiSend<ExtractData>(
        `/api/admin/impact-lab/rubric/extract?cohort=${cohort}`,
        "POST",
        { text: paste }
      )
      setExtract(result)
      setDraft(result.draft)
      setAnchors(anchorRows(result.draft.scoreLabels))
      setIssues(result.issues)
      setFromExtraction(true)
      setNotice(null)
    } catch (e) {
      setExtractError(e instanceof Error ? e.message : "Extraction failed")
    } finally {
      setExtracting(false)
    }
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setIssues([])
    setNotice(null)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/rubric?cohort=${cohort}`, "PUT", {
        rubric: { ...draft, scoreLabels: anchorsToRecord(anchors) },
        source: fromExtraction ? "extracted" : "manual",
      })
      setNotice("Saved. Judges scoring this cohort now see this rubric.")
      setExtract(null)
      await load()
    } catch (e) {
      if (e instanceof ApiError) {
        setIssues(e.issues)
        setError(e.message)
      } else {
        setError(e instanceof Error ? e.message : "Save failed")
      }
    } finally {
      setSaving(false)
    }
  }

  const revert = async () => {
    setSaving(true)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/rubric?cohort=${cohort}`, "DELETE")
      setNotice("Reverted. This cohort is back on its built-in rubric.")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revert")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
      </div>
    )
  }

  if (!data || !draft) {
    return (
      <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]">
        {error ?? "No data"}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Frozen state ──────────────────────────────────────────────────── */}
      {frozen ? (
        <div className="flex items-start gap-2 rounded-lg border border-[#ffb000]/40 bg-[#ffb000]/10 p-4 text-[11px] font-mono text-[#ffb000]">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold uppercase tracking-wider">Structure locked</p>
            <p className="text-[#e0c080]">
              {data.scorecardCount > 0
                ? `${data.scorecardCount} scorecard${data.scorecardCount === 1 ? " has" : "s have"} been recorded for this cohort.`
                : "Judging is closed for this cohort."}{" "}
              Totals are recalculated from the rubric every time anyone reads a score, so changing a
              scale, a weight or the scoring mode would silently rewrite scores that judges already
              gave. Those fields are read-only.
            </p>
            <p className="text-[#e0c080]">
              Labels, guidance, score anchors and the display order are still editable — they carry
              no arithmetic.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded border border-[#00d4ff]/30 bg-[#00d4ff]/10 p-3 text-[11px] font-mono text-[#00d4ff]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No scores recorded yet, so the whole rubric is editable. It locks to labels-only the
            moment the first judge saves a card.
          </span>
        </div>
      )}

      {/* ── Source ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-4">
        <div className="space-y-1">
          <p className={LEGEND}>Live rubric for {cohort}</p>
          <p className="text-[12px] font-mono text-[#e0e0e0]">
            {data.source === "database" ? (
              <>
                Custom rubric
                {data.provenance && (
                  <span className="text-[#555]">
                    {" "}
                    · saved by {data.provenance.updatedByEmail} ·{" "}
                    {new Date(data.provenance.updatedAt).toLocaleString("en-KE", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    {data.provenance.source === "extracted" && " · drafted from a paste"}
                  </span>
                )}
              </>
            ) : (
              <>
                Built-in rubric &mdash; <span className="text-[#888]">{data.builtInLabel}</span>
                <span className="text-[#555]"> · saving below overrides it for this cohort</span>
              </>
            )}
          </p>
        </div>
        {data.source === "database" && (
          <button
            onClick={revert}
            disabled={saving || frozen}
            title={
              frozen
                ? "Reverting would recalculate recorded totals against different criteria."
                : `Revert to the built-in rubric (${data.builtInLabel})`
            }
            className="flex items-center gap-1.5 rounded border border-[#1e1e1e] px-3 py-1.5 text-[11px] font-mono text-[#888] hover:border-[#ff3333]/40 hover:text-[#ff3333] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" /> Revert to built-in
          </button>
        )}
      </div>

      {/* ── Paste and extract ─────────────────────────────────────────────── */}
      <div className="space-y-3 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-4">
        <p className={LEGEND}>Paste the panel&apos;s rubric</p>
        <p className="text-[11px] font-mono text-[#666]">
          A Google Form, a table from a doc, an email. Claude proposes the structure; nothing is
          saved until you press Save below.
        </p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={5}
          placeholder="Problem Definition & User Insight — 10 points. Clear articulation of a specific, high-value problem…"
          className={`${FIELD} resize-y font-mono`}
        />
        <div className="flex items-center gap-3">
          <button
            onClick={runExtract}
            disabled={extracting || paste.trim().length < 20}
            className="flex items-center gap-1.5 rounded border border-[#00ff41]/40 bg-[#00ff41]/10 px-3 py-1.5 text-[11px] font-mono text-[#00ff41] hover:bg-[#00ff41]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {extracting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {extracting ? "Reading…" : "Extract criteria"}
          </button>
          <span className="text-[10px] font-mono text-[#444]">
            {paste.length.toLocaleString()} characters
          </span>
        </div>

        {extractError && (
          <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]">
            {extractError}
          </div>
        )}

        {extract && (
          <div className="space-y-2 rounded border border-[#00d4ff]/30 bg-[#00d4ff]/5 p-3 text-[11px] font-mono">
            <p className="text-[#00d4ff]">
              Scoring mode read as <span className="font-semibold">{extract.draft.scoring}</span> —{" "}
              <span className="text-[#88c8d8]">{extract.scoringReasoning}</span>
            </p>
            {extract.notes.length > 0 && (
              <ul className="ml-4 list-disc space-y-0.5 text-[#888]">
                {extract.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
            {!extract.valid && (
              <p className="text-[#ffb000]">
                The draft below needs fixing before it will save — the problems are marked on the
                fields.
              </p>
            )}
            <p className="text-[#444]">
              Drafted by {extract.model}. Check every number against the paste before saving.
            </p>
          </div>
        )}
      </div>

      {/* ── The rubric ────────────────────────────────────────────────────── */}
      <div className="space-y-4 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div className="space-y-1">
            <label className={LEGEND} htmlFor="rubric-label">
              Rubric label (shown to judges)
            </label>
            <input
              id="rubric-label"
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              className={FIELD}
            />
            {issueFor("label") && (
              <p className="text-[10px] font-mono text-[#ff3333]">{issueFor("label")}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className={LEGEND} htmlFor="rubric-scoring">
              Scoring
            </label>
            <select
              id="rubric-scoring"
              value={draft.scoring}
              disabled={frozen}
              onChange={(e) => setScoring(e.target.value as ScoringMode)}
              className={FIELD}
            >
              <option value="normalized">normalized — weights out of 100</option>
              <option value="points">points — raw score is the points</option>
            </select>
            <p className="text-[10px] font-mono text-[#555]">
              {draft.scoring === "points"
                ? "Weight is locked to max: the raw score is the points."
                : "Bottom of each scale earns zero."}
            </p>
          </div>
        </div>

        {/* Live preview */}
        <div className="flex flex-wrap items-center gap-4 rounded border border-[#1e1e1e] bg-[#111] px-3 py-2 text-[11px] font-mono">
          <span className="text-[#888]">
            Maximum total:{" "}
            <span className="font-semibold text-[#00ff41]">{maxTotal}</span>
          </span>
          <span className={weightsOff ? "text-[#ffb000]" : "text-[#888]"}>
            Weights sum to <span className="font-semibold">{weightSum}</span>
            {draft.scoring === "normalized" && " (target 100)"}
          </span>
          <span className="text-[#555]">
            {draft.criteria.length} criteri{draft.criteria.length === 1 ? "on" : "a"}
          </span>
        </div>

        {weightsOff && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded border border-[#ffb000]/40 bg-[#ffb000]/10 p-3 text-[11px] font-mono text-[#ffb000]"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Weights sum to {weightSum}, not 100. Totals are still quoted out of 100, so full marks
              everywhere would reach {weightSum}. This will save — an intentional {weightSum} is a
              legitimate rubric, and only you can tell that from a typo.
            </span>
          </div>
        )}

        {/* Criteria */}
        <div className="space-y-2">
          {draft.criteria.map((c, i) => (
            <div key={i} className="space-y-2 rounded border border-[#1e1e1e] bg-[#111] p-3">
              <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
                <div className="space-y-1">
                  <label className={LEGEND}>Key</label>
                  <input
                    value={c.key}
                    disabled={frozen}
                    onChange={(e) => setCriterion(i, { key: e.target.value })}
                    placeholder="problem"
                    className={FIELD}
                  />
                </div>
                <div className="space-y-1">
                  <label className={LEGEND}>Label</label>
                  <input
                    value={c.label}
                    onChange={(e) => setCriterion(i, { label: e.target.value })}
                    className={FIELD}
                  />
                </div>
                <div className="flex items-end gap-1">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${c.label || c.key} up`}
                    className="rounded border border-[#1e1e1e] p-1.5 text-[#666] hover:text-[#00ff41] disabled:opacity-30"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => move(i, 1)}
                    disabled={i === draft.criteria.length - 1}
                    aria-label={`Move ${c.label || c.key} down`}
                    className="rounded border border-[#1e1e1e] p-1.5 text-[#666] hover:text-[#00ff41] disabled:opacity-30"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => removeCriterion(i)}
                    disabled={frozen}
                    aria-label={`Remove ${c.label || c.key}`}
                    title={frozen ? "Removing a criterion would orphan recorded scores." : "Remove"}
                    className="rounded border border-[#1e1e1e] p-1.5 text-[#666] hover:text-[#ff3333] disabled:opacity-30"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className={LEGEND}>Guidance (what the judge looks at)</label>
                <textarea
                  value={c.guidance}
                  rows={2}
                  onChange={(e) => setCriterion(i, { guidance: e.target.value })}
                  className={`${FIELD} resize-y`}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["min", "Min"],
                    ["max", "Max"],
                    ["weight", draft.scoring === "points" ? "Points (= max)" : "Weight"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="space-y-1">
                    <label className={LEGEND}>{label}</label>
                    <input
                      type="number"
                      value={c[field]}
                      disabled={frozen || (field === "weight" && draft.scoring === "points")}
                      onChange={(e) => setCriterion(i, { [field]: Number(e.target.value) })}
                      className={FIELD}
                    />
                    {issueFor(`criteria.${i}.${field}`) && (
                      <p className="text-[10px] font-mono text-[#ff3333]">
                        {issueFor(`criteria.${i}.${field}`)}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {issueFor(`criteria.${i}.key`) && (
                <p className="text-[10px] font-mono text-[#ff3333]">{issueFor(`criteria.${i}.key`)}</p>
              )}
              {issueFor(`criteria.${i}.label`) && (
                <p className="text-[10px] font-mono text-[#ff3333]">
                  {issueFor(`criteria.${i}.label`)}
                </p>
              )}
            </div>
          ))}

          <button
            onClick={addCriterion}
            disabled={frozen}
            title={frozen ? "A new criterion has no value on any existing scorecard." : "Add a criterion"}
            className="flex items-center gap-1.5 rounded border border-dashed border-[#1e1e1e] px-3 py-2 text-[11px] font-mono text-[#666] hover:border-[#00ff41]/40 hover:text-[#00ff41] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Plus className="h-3 w-3" /> Add criterion
          </button>
        </div>

        {/* Score anchors */}
        <div className="space-y-2 border-t border-[#1e1e1e] pt-3">
          <p className={LEGEND}>Score anchors (optional)</p>
          <p className="text-[11px] font-mono text-[#666]">
            Text shown beside each score so judges calibrate the same way. Leave empty for a long
            scale — ten anchors on a 1&ndash;10 scale is noise.
          </p>
          {anchors.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="number"
                value={row.value}
                aria-label="Score value"
                onChange={(e) =>
                  setAnchors(anchors.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))
                }
                className={`${FIELD} w-20`}
              />
              <input
                value={row.text}
                aria-label="Anchor text"
                placeholder="Not shown / insufficient"
                onChange={(e) =>
                  setAnchors(anchors.map((r, j) => (j === i ? { ...r, text: e.target.value } : r)))
                }
                className={FIELD}
              />
              <button
                onClick={() => setAnchors(anchors.filter((_, j) => j !== i))}
                aria-label="Remove anchor"
                className="rounded border border-[#1e1e1e] p-1.5 text-[#666] hover:text-[#ff3333]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => setAnchors([...anchors, { value: "", text: "" }])}
            className="flex items-center gap-1.5 rounded border border-dashed border-[#1e1e1e] px-3 py-1.5 text-[11px] font-mono text-[#666] hover:border-[#00ff41]/40 hover:text-[#00ff41]"
          >
            <Plus className="h-3 w-3" /> Add anchor
          </button>
          {issues
            .filter((i) => i.path[0] === "scoreLabels")
            .map((i) => (
              <p key={i.path.join(".")} className="text-[10px] font-mono text-[#ff3333]">
                {i.message}
              </p>
            ))}
        </div>
      </div>

      {/* ── Save ──────────────────────────────────────────────────────────── */}
      {error && (
        <div
          role="alert"
          className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-3 text-[11px] font-mono text-[#ff3333]"
        >
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded border border-[#00ff41]/30 bg-[#00ff41]/10 p-3 text-[11px] font-mono text-[#00ff41]">
          {notice}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 rounded border border-[#00ff41]/40 bg-[#00ff41]/10 px-4 py-2 text-[11px] font-mono text-[#00ff41] hover:bg-[#00ff41]/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save rubric
        </button>
        <button
          onClick={load}
          disabled={saving}
          className="rounded border border-[#1e1e1e] px-3 py-2 text-[11px] font-mono text-[#666] hover:text-[#e0e0e0] disabled:opacity-40"
        >
          Discard changes
        </button>
      </div>
    </div>
  )
}
