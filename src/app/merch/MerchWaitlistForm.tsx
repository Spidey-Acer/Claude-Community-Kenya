"use client";

import { useEffect, useState, useTransition } from "react";

export function MerchWaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("idle");

    startTransition(async () => {
      try {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        if (!res.ok) {
          setStatus("error");
          setMsg(json.error || "Failed to join waitlist.");
          return;
        }
        setStatus("success");
        setMsg("You're on the list. We'll let you know when the first drop ships.");
        setEmail("");
      } catch {
        setStatus("error");
        setMsg("Network error. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="font-mono text-xs text-text-dim">
        $ echo &quot;notify-me@email.com&quot; &gt;&gt; ./waitlist.txt
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
          className="flex-1 min-w-0 bg-bg-card border border-border-default rounded px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 transition-colors"
          aria-label="Email for merch waitlist"
        />
        <button
          type="submit"
          disabled={isPending || !csrfToken}
          className="px-4 py-2 bg-green-primary/10 border border-green-primary/30 rounded font-mono text-sm font-semibold text-green-primary hover:bg-green-primary/20 transition-all disabled:opacity-50"
        >
          {isPending ? "Adding..." : "Join Waitlist"}
        </button>
      </div>
      {status !== "idle" && (
        <p className={`font-mono text-xs ${status === "success" ? "text-green-primary" : "text-red"}`}>
          {msg}
        </p>
      )}
    </form>
  );
}
