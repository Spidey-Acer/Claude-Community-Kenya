"use client";

import { useState } from "react";
import { csrfToken } from "@/lib/csrf-client";

/**
 * Takedown request for one album.
 *
 * Collapsed to a single line by default — this must be findable without
 * competing with the photos for attention. The mailto stays as the fallback
 * so the path still works with JS disabled or if the endpoint is down; the
 * form exists so the request lands in the admin queue where it can be seen to
 * have been handled, instead of only in somebody's inbox.
 */
export function TakedownRequest({
  albumSlug,
  contactEmail,
}: {
  albumSlug: string;
  contactEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/gallery/takedown", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": await csrfToken() },
        body: JSON.stringify({
          email: form.get("email"),
          albumSlug,
          photoRef: form.get("photoRef") || "",
          message: form.get("message"),
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? "Request failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <p className="max-w-[720px] font-inter text-[12.5px] leading-relaxed text-ink-soft" role="status">
        Thanks — we&apos;ve got it and we&apos;ll take the photo down. No need to
        follow up.
      </p>
    );
  }

  return (
    <div className="max-w-[720px]">
      <p className="font-inter text-[12.5px] leading-relaxed text-ink-muted">
        Photographed with consent at the event. If you&apos;d like a photo of you
        removed,{" "}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="text-clay underline underline-offset-2 transition-colors hover:text-clay-dark"
        >
          ask us here
        </button>{" "}
        or email{" "}
        <a
          href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Photo removal request — ${albumSlug}`)}`}
          className="text-clay underline underline-offset-2 hover:text-clay-dark"
        >
          {contactEmail}
        </a>
        . No explanation needed.
      </p>

      {open && (
        <form onSubmit={onSubmit} className="mt-4 grid gap-3 rounded-xl border border-sand bg-paper-card p-5 sm:grid-cols-2">
          <div>
            <label htmlFor="td-email" className="mb-1 block font-inter text-[12px] font-medium text-ink-soft">
              Your email
            </label>
            <input
              id="td-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-sand bg-paper px-3 py-2 font-inter text-sm text-ink transition-colors placeholder:text-ink-muted/70 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
            />
          </div>
          <div>
            <label htmlFor="td-ref" className="mb-1 block font-inter text-[12px] font-medium text-ink-soft">
              Which photo? <span className="text-ink-muted">(optional)</span>
            </label>
            <input
              id="td-ref"
              name="photoRef"
              type="text"
              placeholder="e.g. third row, blue shirt"
              className="w-full rounded-lg border border-sand bg-paper px-3 py-2 font-inter text-sm text-ink transition-colors placeholder:text-ink-muted/70 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="td-msg" className="mb-1 block font-inter text-[12px] font-medium text-ink-soft">
              Anything else we should know
            </label>
            <textarea
              id="td-msg"
              name="message"
              required
              minLength={10}
              rows={3}
              className="w-full rounded-lg border border-sand bg-paper px-3 py-2 font-inter text-sm text-ink transition-colors placeholder:text-ink-muted/70 focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
            />
          </div>
          {error && (
            <p role="alert" className="font-inter text-[12.5px] text-red sm:col-span-2">
              {error}
            </p>
          )}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={sending}
              className="rounded-full bg-clay px-5 py-2.5 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
