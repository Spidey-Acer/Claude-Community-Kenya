"use client";

import { useEffect, useState, useTransition } from "react";
import { Mail, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

export function VerifyEmailBanner() {
  const [csrfToken, setCsrfToken] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  function handleResend() {
    if (!csrfToken) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/resend-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setStatus("error");
          setMsg(json.error || "Failed to send.");
          return;
        }
        setStatus("sent");
        setMsg(json.message || "Verification email sent.");
      } catch {
        setStatus("error");
        setMsg("Network error.");
      }
    });
  }

  return (
    <div className="mb-8 rounded-lg border border-amber/30 bg-amber/5 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <Mail className="h-5 w-5 text-amber shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-semibold text-amber">
            Verify your email
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            We sent a verification link to your inbox. If you don&apos;t see it, check spam or resend.
          </p>
          {status === "sent" && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-green-primary">
              <CheckCircle2 className="h-3 w-3" /> {msg}
            </p>
          )}
          {status === "error" && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-red">
              <AlertTriangle className="h-3 w-3" /> {msg}
            </p>
          )}
        </div>
        <button
          onClick={handleResend}
          disabled={isPending || !csrfToken || status === "sent"}
          className="inline-flex items-center gap-1.5 rounded border border-amber/40 bg-amber/10 px-3 py-1.5 text-xs font-mono font-semibold text-amber hover:bg-amber/20 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {isPending ? "Sending..." : status === "sent" ? "Sent" : "Resend"}
        </button>
      </div>
    </div>
  );
}
