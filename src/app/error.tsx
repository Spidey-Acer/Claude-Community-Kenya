"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg rounded-lg border border-red/40 bg-bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border-default bg-bg-secondary px-4 py-2">
          <span className="h-3 w-3 rounded-full bg-red" />
          <span className="h-3 w-3 rounded-full bg-amber" />
          <span className="h-3 w-3 rounded-full bg-green-primary" />
          <span className="ml-2 font-mono text-xs text-text-dim">claude-community-kenya — error</span>
        </div>
        <div className="p-6 font-mono text-sm">
          <p className="text-red mb-2">[ERROR] Something went wrong.</p>
          <p className="text-text-secondary mb-6 leading-relaxed break-words">
            {error.message || "An unexpected error occurred while loading this page."}
          </p>
          {error.digest && (
            <p className="text-xs text-text-dim mb-6">Digest: {error.digest}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={reset}
              className="rounded border border-green-primary px-4 py-2 text-green-primary hover:bg-green-primary/10 transition-colors"
            >
              $ retry
            </button>
            <Link
              href="/"
              className="rounded border border-border-default px-4 py-2 text-text-secondary hover:border-border-hover hover:text-text-primary transition-colors"
            >
              cd /home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
