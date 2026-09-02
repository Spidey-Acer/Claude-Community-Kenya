"use client";

import { useEffect, useState } from "react";
import { FOCUS_RING, PRIMARY_BUTTON, TAP } from "./judge-ui";
import { JudgeEventPicker } from "./JudgeEventPicker";

/** One live cohort's sign-in list, as GET /api/impact-lab/judge-roster returns it. */
interface RosterCohort {
  cohort: string;
  eventName: string;
  mode: "open" | "roster";
  judges: { id: string; name: string; title: string }[];
}

/** Option value for the picker — judge ids are unique per run, not globally. */
function optionValue(cohort: string, judgeId: string): string {
  return `${cohort}::${judgeId}`;
}

/**
 * The code door. Once a judge is through, this stays mounted only to own the
 * session — the sign-out it hands down lives in the scoring screen's header,
 * and the scoring screen owns everything else.
 *
 * Two doors, one form. When an organiser has switched a live cohort to roster
 * sign-in, the name field is replaced by a picker of that cohort's published
 * panel, so a judge cannot misspell their way into a second scorecard. Every
 * other case — including the moment before the roster has loaded — is the
 * typed-name form exactly as it was.
 */
export function JudgeGate({ initialJudge }: { initialJudge: string | null }) {
  const [judge, setJudge] = useState<string | null>(initialJudge);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rosterCohorts, setRosterCohorts] = useState<RosterCohort[]>([]);
  /** The chosen option, `cohort::judgeId`. Empty until a judge picks. */
  const [picked, setPicked] = useState("");

  // Fetched rather than server-rendered: an organiser may publish the panel or
  // flip the mode minutes before judging, by which time this page is already
  // open on the judges' phones. A failed fetch leaves the list empty, which
  // falls back to the typed-name form rather than blocking anyone at the door.
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await fetch("/api/impact-lab/judge-roster");
        const json = await res.json();
        if (!live || !json?.success) return;
        setRosterCohorts(
          (json.cohorts as RosterCohort[]).filter(
            (c) => c.mode === "roster" && c.judges.length > 0
          )
        );
      } catch {
        // Keep the typed-name form; the code still works.
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const useRoster = rosterCohorts.length > 0;

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const [pickedCohort, pickedJudgeId] = picked.split("::");
      const body = useRoster
        ? { judgeId: pickedJudgeId, cohort: pickedCohort, code }
        : { name, code };
      const res = await fetch("/api/impact-lab/judge-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || "That did not work.");
        return;
      }
      setJudge(json.judge as string);
    } catch {
      setError("That did not work. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/impact-lab/judge-access", { method: "DELETE" });
    setJudge(null);
    setName("");
    setCode("");
    setPicked("");
  }

  // Once through the door the picker owns the whole screen, header included:
  // its sticky header carries the judge's name and this sign-out, so a phone
  // never has two stacked headers competing for the top of the viewport.
  if (judge) {
    return <JudgeEventPicker judgeName={judge} onSignOut={() => void signOut()} />;
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-green-primary">
        Impact Lab · AI Mashinani
      </p>
      <h1 className="mt-2 font-mono text-2xl font-bold text-text-primary">
        Judging
      </h1>
      <p className="mt-2 text-[15px] text-text-secondary">
        {useRoster
          ? "Find yourself on the list and enter the access code from the organisers."
          : "Enter your name and the access code from the organisers."}
      </p>

      <form onSubmit={enter} className="mt-6 space-y-4">
        {useRoster ? (
          <div>
            <label
              htmlFor="judge-pick"
              className="font-mono text-xs uppercase tracking-wider text-text-dim"
            >
              Who are you?
            </label>
            {/* A native select on purpose: it is the one picker that behaves
                the same on every phone in the room. Grouped by event only when
                there is more than one, so a single-event night is a flat list. */}
            <select
              id="judge-pick"
              value={picked}
              onChange={(e) => setPicked(e.target.value)}
              required
              className={`mt-2 w-full ${TAP} rounded-lg border border-border-default bg-bg-card px-3 py-3 text-base text-text-primary ${FOCUS_RING} focus:border-green-primary`}
            >
              <option value="">Select your name</option>
              {rosterCohorts.length === 1
                ? rosterCohorts[0].judges.map((entry) => (
                    <option
                      key={entry.id}
                      value={optionValue(rosterCohorts[0].cohort, entry.id)}
                    >
                      {entry.name} — {entry.title}
                    </option>
                  ))
                : rosterCohorts.map((cohortEntry) => (
                    <optgroup key={cohortEntry.cohort} label={cohortEntry.eventName}>
                      {cohortEntry.judges.map((entry) => (
                        <option
                          key={`${cohortEntry.cohort}-${entry.id}`}
                          value={optionValue(cohortEntry.cohort, entry.id)}
                        >
                          {entry.name} — {entry.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
            </select>
            <p className="mt-2 text-xs text-text-dim">
              Not on the list? Ask an organiser to add you.
            </p>
          </div>
        ) : (
          <div>
            <label
              htmlFor="judge-name"
              className="font-mono text-xs uppercase tracking-wider text-text-dim"
            >
              Your name
            </label>
            <input
              id="judge-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              aria-describedby="judge-name-hint"
              className={`mt-2 w-full ${TAP} rounded-lg border border-border-default bg-bg-card px-3 py-3 text-base text-text-primary ${FOCUS_RING} focus:border-green-primary`}
            />
            {/* Identity is the slug of this name, so "Jane D." and "Jane Doe"
                are two different judges with two separate sets of scores. */}
            <p id="judge-name-hint" className="mt-2 text-xs text-text-dim">
              Type your name exactly the same way every time you sign in.
            </p>
          </div>
        )}
        <div>
          <label
            htmlFor="judge-code"
            className="font-mono text-xs uppercase tracking-wider text-text-dim"
          >
            Access code
          </label>
          <input
            id="judge-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            // Numeric keypad on a phone: judges are standing up, one-handed.
            inputMode="numeric"
            autoComplete="off"
            required
            className={`mt-2 w-full ${TAP} rounded-lg border border-border-default bg-bg-card px-3 py-3 text-base tracking-[0.4em] text-text-primary ${FOCUS_RING} focus:border-green-primary`}
          />
        </div>

        {error && (
          <p role="alert" className="text-[15px] text-red">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className={PRIMARY_BUTTON}
        >
          {busy ? "Checking…" : "Start judging"}
        </button>
      </form>
    </div>
  );
}
