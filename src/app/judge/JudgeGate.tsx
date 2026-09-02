"use client";

import { useState } from "react";
import { FOCUS_RING, PRIMARY_BUTTON } from "./judge-ui";
import { JudgeEventPicker } from "./JudgeEventPicker";

/**
 * The code door. Once a judge is through, this stays mounted only to own the
 * session — the sign-out it hands down lives in the scoring screen's header,
 * and the scoring screen owns everything else.
 */
export function JudgeGate({ initialJudge }: { initialJudge: string | null }) {
  const [judge, setJudge] = useState<string | null>(initialJudge);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enter(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/impact-lab/judge-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code }),
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
        Enter your name and the access code from the organisers.
      </p>

      <form onSubmit={enter} className="mt-6 space-y-4">
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
            className={`mt-2 w-full rounded-lg border border-border-default bg-bg-card px-3 py-3 text-base text-text-primary ${FOCUS_RING} focus:border-green-primary`}
          />
          {/* Identity is the slug of this name, so "Jane D." and "Jane Doe"
              are two different judges with two separate sets of scores. */}
          <p id="judge-name-hint" className="mt-2 text-xs text-text-dim">
            Type your name exactly the same way every time you sign in.
          </p>
        </div>
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
            className={`mt-2 w-full rounded-lg border border-border-default bg-bg-card px-3 py-3 text-base tracking-[0.4em] text-text-primary ${FOCUS_RING} focus:border-green-primary`}
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
