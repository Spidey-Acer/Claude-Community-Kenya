"use client";

import { useEffect, useState, useTransition } from "react";
import { Pencil, Save, X, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ProfileEditorProps {
  initialFirstName: string;
  initialLastName: string;
  initialPhone: string | null;
  initialImageUrl: string | null;
  email: string;
}

export function ProfileEditor({
  initialFirstName,
  initialLastName,
  initialPhone,
  initialImageUrl,
  email,
}: ProfileEditorProps) {
  const [editing, setEditing] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  function reset() {
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setPhone(initialPhone ?? "");
    setImageUrl(initialImageUrl ?? "");
    setError(null);
    setEditing(false);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || "Failed to update profile.");
          return;
        }
        setSuccess(true);
        setEditing(false);
        // Server-rendered dashboard greeting won't update without a fresh load
        setTimeout(() => window.location.reload(), 800);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-start gap-4 rounded-lg border border-border-default bg-bg-secondary p-5">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
            // ./profile
          </p>
          <p className="font-mono text-sm text-text-primary">
            {initialFirstName} {initialLastName}
          </p>
          <p className="mt-1 font-mono text-xs text-text-dim">{email}</p>
          {initialPhone && (
            <p className="mt-1 font-mono text-xs text-text-dim">{initialPhone}</p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-card px-3 py-1.5 text-xs font-mono text-text-secondary hover:border-green-primary/40 hover:text-green-primary transition-colors"
        >
          <Pencil className="h-3 w-3" />
          Edit profile
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-lg border border-green-primary/30 bg-bg-secondary p-5"
    >
      <p className="font-mono text-[11px] uppercase tracking-wider text-green-primary mb-4">
        $ vim ./profile
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="profile-firstName"
            className="block text-[11px] font-mono text-text-dim mb-1.5"
          >
            First name
          </label>
          <input
            id="profile-firstName"
            type="text"
            required
            maxLength={60}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full bg-bg-card border border-border-default rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-green-primary/50"
          />
        </div>
        <div>
          <label
            htmlFor="profile-lastName"
            className="block text-[11px] font-mono text-text-dim mb-1.5"
          >
            Last name
          </label>
          <input
            id="profile-lastName"
            type="text"
            required
            maxLength={60}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full bg-bg-card border border-border-default rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-green-primary/50"
          />
        </div>
        <div>
          <label
            htmlFor="profile-phone"
            className="block text-[11px] font-mono text-text-dim mb-1.5"
          >
            Phone (optional)
          </label>
          <input
            id="profile-phone"
            type="tel"
            maxLength={20}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-bg-card border border-border-default rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-green-primary/50"
            placeholder="+254 7XX XXX XXX"
          />
        </div>
        <div>
          <label
            htmlFor="profile-imageUrl"
            className="block text-[11px] font-mono text-text-dim mb-1.5"
          >
            Avatar URL (optional)
          </label>
          <input
            id="profile-imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full bg-bg-card border border-border-default rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-green-primary/50"
            placeholder="https://..."
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] font-mono text-text-dim">
        Email cannot be changed here. Contact us if you need to update it.
      </p>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded border border-red/30 bg-red/10 p-2 text-[11px] font-mono text-red">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mt-3 flex items-center gap-2 rounded border border-green-primary/30 bg-green-primary/10 p-2 text-[11px] font-mono text-green-primary">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Profile updated.
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={isPending || !csrfToken}
          className="inline-flex items-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-4 py-1.5 text-xs font-mono font-semibold text-green-primary hover:bg-green-primary/20 transition-colors disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          {isPending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-card px-4 py-1.5 text-xs font-mono text-text-secondary hover:border-red/40 hover:text-red transition-colors disabled:opacity-50"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </form>
  );
}
