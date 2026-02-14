"use client";

import { useState } from "react";
import { LinkIcon, Check } from "lucide-react";

interface EventDetailClientProps {
  eventUrl: string;
}

export function EventDetailClient({ eventUrl }: EventDetailClientProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing if clipboard API unavailable
    }
  }

  return (
    <button
      onClick={copyLink}
      className="inline-flex items-center gap-2 border border-border-default px-4 py-2 font-mono text-sm text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
      aria-label="Copy link to clipboard"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-primary" />
          Copied!
        </>
      ) : (
        <>
          <LinkIcon className="h-4 w-4" />
          Copy Link
        </>
      )}
    </button>
  );
}
