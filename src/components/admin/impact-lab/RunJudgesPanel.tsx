"use client"

/**
 * The organiser's editor for a run's published judge panel.
 *
 * Lives in the Runs tab because that is where the judges are stored: on the
 * final run's `result` JSON, beside the roster lock. The whole list is edited
 * as a local draft and saved in one PATCH — an organiser typing four bios at
 * 4pm should not be firing a request per keystroke, and a whole-list write is
 * the only shape that makes reordering atomic.
 *
 * Kept out of RunDetail.tsx so that file stays about the roster.
 */

import { useState } from "react"
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react"
import { apiSend } from "./api"
import {
  JUDGE_BIO_MAX,
  JUDGE_KIND_LABEL,
  JUDGE_LIST_MAX,
  JUDGE_NAME_MAX,
  JUDGE_ORGANISATION_MAX,
  JUDGE_TITLE_MAX,
  type Judge,
  type JudgeKind,
  type JudgeSignInMode,
} from "@/lib/impact-lab/roster"

const KINDS: JudgeKind[] = ["panel", "domain", "guest"]

const INPUT =
  "w-full px-2 py-1.5 bg-[#111] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#e0e0e0] placeholder:text-[#555] focus:border-[#00ff41]/40 focus:outline-none"
const LABEL = "block text-[10px] font-mono uppercase tracking-wider text-[#666] mb-1"
const MOVE_BUTTON =
  "px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[10px] font-mono text-[#aaa] disabled:opacity-30"

interface RunJudgesPanelProps {
  runId: string
  /** The list as currently stored on the run, from the parent's loaded detail. */
  initialJudges: Judge[]
  /** The sign-in mode as currently stored on the run. */
  initialSignIn: JudgeSignInMode
  /** Called with the saved list, so the parent's copy of the run stays current. */
  onSaved: (judges: Judge[]) => void
  /** Called with the saved mode, for the same reason. */
  onSignInSaved: (mode: JudgeSignInMode) => void
}

/** A blank row, with an id the server will accept and the browser can key on. */
function blankJudge(order: number): Judge {
  return {
    id: crypto.randomUUID(),
    name: "",
    title: "",
    organisation: "",
    bio: "",
    kind: "panel",
    order,
  }
}

/**
 * Renumber `order` to 1..N in array position, and drop the empty-string
 * optionals the form uses for "not filled in" — the API's schema rejects an
 * empty `photoUrl` as an invalid URL, and an empty organisation should be
 * absent rather than a blank line under every name.
 */
function forSave(draft: Judge[]): Judge[] {
  return draft.map((judge, index) => ({
    id: judge.id,
    name: judge.name.trim(),
    title: judge.title.trim(),
    bio: judge.bio.trim(),
    kind: judge.kind,
    order: index + 1,
    ...(judge.organisation?.trim() ? { organisation: judge.organisation.trim() } : {}),
    ...(judge.photoUrl?.trim() ? { photoUrl: judge.photoUrl.trim() } : {}),
  }))
}

export function RunJudgesPanel({
  runId,
  initialJudges,
  initialSignIn,
  onSaved,
  onSignInSaved,
}: RunJudgesPanelProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Judge[]>(initialJudges)
  const [signIn, setSignIn] = useState<JudgeSignInMode>(initialSignIn)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  /**
   * The toggle saves on the spot rather than joining the judges draft: an
   * organiser flipping it thirty seconds before judging must not have to
   * remember to press "Save judges" as well, and the API takes the two as
   * separate branches anyway.
   */
  async function saveSignIn(next: JudgeSignInMode) {
    const previous = signIn
    setSignIn(next)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/runs/${runId}`, "PATCH", { judgeSignIn: next })
      onSignInSaved(next)
    } catch (e) {
      setSignIn(previous)
      setError(e instanceof Error ? e.message : "Failed to save the sign-in mode")
    }
  }

  /** Apply a partial edit to one row, leaving every other row untouched. */
  function update(index: number, patch: Partial<Judge>) {
    setSaved(false)
    setDraft((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  /** Swap a row with its neighbour. `delta` is -1 for up, +1 for down. */
  function reorder(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= draft.length) return
    setSaved(false)
    setDraft((rows) => {
      const next = [...rows]
      const held = next[index]
      next[index] = next[target]
      next[target] = held
      return next
    })
  }

  function remove(index: number) {
    setSaved(false)
    setDraft((rows) => rows.filter((_, i) => i !== index))
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    const judges = forSave(draft)
    // Caught here rather than by the API's 400 so the organiser gets a message
    // naming the row, not a zod issue list.
    const blank = judges.findIndex((judge) => !judge.name || !judge.title)
    if (blank >= 0) {
      setError("Judge " + (blank + 1) + " needs a name and a title")
      setSaving(false)
      return
    }
    try {
      await apiSend(`/api/admin/impact-lab/runs/${runId}`, "PATCH", { judges })
      setDraft(judges)
      onSaved(judges)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save the judges")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#888]">
          Judges ({draft.length})
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-[#555]" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[#555]" />
        )}
      </button>

      {open && (
        <div className="border-t border-[#1e1e1e] p-3 space-y-3">
          <p className="text-[10px] font-mono text-[#666]">
            Shown to participants on their dashboard, on the public event page, and
            in the judges&rsquo; brief. Save writes the whole list.
          </p>

          <label className="flex items-start gap-2 p-2.5 bg-[#111] border border-[#1e1e1e] rounded cursor-pointer">
            <input
              type="checkbox"
              checked={signIn === "roster"}
              onChange={(e) => void saveSignIn(e.target.checked ? "roster" : "open")}
              className="mt-0.5 accent-[#00ff41]"
            />
            <span className="text-[11px] font-mono text-[#aaa]">
              Judges pick themselves from this list; no free-text names
              <span className="block text-[10px] text-[#666]">
                Off: judges type their own name at the door, as before.
              </span>
            </span>
          </label>

          {draft.map((judge, index) => (
            <div key={judge.id} className="p-3 bg-[#111] border border-[#1e1e1e] rounded space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#666]">
                  Judge {index + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => reorder(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move judge ${index + 1} up`}
                    className={MOVE_BUTTON}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => reorder(index, 1)}
                    disabled={index === draft.length - 1}
                    aria-label={`Move judge ${index + 1} down`}
                    className={MOVE_BUTTON}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Remove judge ${index + 1}`}
                    className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#ff3333]/15 border border-[#1e1e1e] rounded text-[#888] hover:text-[#ff3333]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className={LABEL} htmlFor={`judge-name-${judge.id}`}>
                    Name
                  </label>
                  <input
                    id={`judge-name-${judge.id}`}
                    className={INPUT}
                    maxLength={JUDGE_NAME_MAX}
                    value={judge.name}
                    onChange={(e) => update(index, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor={`judge-title-${judge.id}`}>
                    Title
                  </label>
                  <input
                    id={`judge-title-${judge.id}`}
                    className={INPUT}
                    maxLength={JUDGE_TITLE_MAX}
                    value={judge.title}
                    onChange={(e) => update(index, { title: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor={`judge-org-${judge.id}`}>
                    Organisation
                  </label>
                  <input
                    id={`judge-org-${judge.id}`}
                    className={INPUT}
                    maxLength={JUDGE_ORGANISATION_MAX}
                    value={judge.organisation ?? ""}
                    onChange={(e) => update(index, { organisation: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor={`judge-kind-${judge.id}`}>
                    Kind
                  </label>
                  <select
                    id={`judge-kind-${judge.id}`}
                    className={INPUT}
                    value={judge.kind}
                    onChange={(e) => update(index, { kind: e.target.value as JudgeKind })}
                  >
                    {KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {JUDGE_KIND_LABEL[kind]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={LABEL} htmlFor={`judge-bio-${judge.id}`}>
                  Bio ({judge.bio.length}/{JUDGE_BIO_MAX})
                </label>
                <textarea
                  id={`judge-bio-${judge.id}`}
                  className={`${INPUT} min-h-[72px]`}
                  maxLength={JUDGE_BIO_MAX}
                  value={judge.bio}
                  onChange={(e) => update(index, { bio: e.target.value })}
                />
              </div>

              <div>
                <label className={LABEL} htmlFor={`judge-photo-${judge.id}`}>
                  Photo URL (https, optional)
                </label>
                <input
                  id={`judge-photo-${judge.id}`}
                  className={INPUT}
                  placeholder="https://"
                  value={judge.photoUrl ?? ""}
                  onChange={(e) => update(index, { photoUrl: e.target.value })}
                />
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSaved(false)
                setDraft((rows) => [...rows, blankJudge(rows.length + 1)])
              }}
              disabled={draft.length >= JUDGE_LIST_MAX}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#aaa] disabled:opacity-30"
            >
              <Plus className="w-3 h-3" />
              Add judge
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] disabled:opacity-40"
            >
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              Save judges
            </button>
            {saved && <span className="text-[10px] font-mono text-[#00ff41]">Saved</span>}
            {error && <span className="text-[10px] font-mono text-[#ff3333]">{error}</span>}
          </div>
        </div>
      )}
    </section>
  )
}
