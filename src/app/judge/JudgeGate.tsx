"use client";

import { useState } from "react";
import { JudgeScoring } from "./JudgeScoring";

/**
 * The code door. Once a judge is through, this stays mounted only to hold the
 * "not you?" escape hatch — the scoring screen owns everything else.
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

  if (judge) {
    return (
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-green-primary">
              Impact Lab · judging
            </p>
            <h1 className="mt-1 font-mono text-2xl font-bold text-text-primary">
              Scoring as {judge}
            </h1>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-border-default px-3 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary hover:border-green-primary/40 hover:text-green-primary"
          >
            Not you?
          </button>
        </header>
        <JudgeScoring />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-green-primary">
        Impact Lab · AI Mashinani
      </p>
      <h1 className="mt-2 font-mono text-2xl font-bold text-text-primary">
        Judging
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
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
            className="mt-2 w-full rounded-lg border border-border-default bg-bg-card px-3 py-3 text-base text-text-primary focus:border-green-primary focus:outline-none"
          />
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
            className="mt-2 w-full rounded-lg border border-border-default bg-bg-card px-3 py-3 text-base tracking-[0.4em] text-text-primary focus:border-green-primary focus:outline-none"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg border border-green-primary/40 bg-green-primary/10 px-4 py-3 font-mono text-sm uppercase tracking-wider text-green-primary hover:bg-green-primary/20 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Start judging"}
        </button>
      </form>
    </div>
  );
}
