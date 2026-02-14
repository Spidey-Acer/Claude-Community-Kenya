"use client";

import { useState } from "react";

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
      className="border border-border-default px-4 py-2 font-mono text-xs text-text-secondary transition-all duration-200 hover:border-border-hover hover:text-text-primary"
      onClick={handleCopy}
      aria-label="Copy link to clipboard"
    >
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}
