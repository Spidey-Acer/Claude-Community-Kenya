"use client";

import { useState } from "react";
import { LinkIcon, Check } from "lucide-react";

interface CopyLinkButtonProps {
  url: string;
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      className={`inline-flex items-center gap-2 border px-4 py-2 font-mono text-xs transition-all duration-200 ${
        copied
          ? "border-green-primary/40 bg-green-primary/10 text-green-primary"
          : "border-border-default text-text-secondary hover:border-border-hover hover:text-text-primary"
      }`}
      onClick={handleCopy}
      aria-label="Copy link to clipboard"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied!
        </>
      ) : (
        <>
          <LinkIcon className="h-3.5 w-3.5" />
          Copy Link
        </>
      )}
    </button>
  );
}
