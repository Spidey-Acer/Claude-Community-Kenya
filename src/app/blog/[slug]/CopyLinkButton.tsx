"use client";

/**
 * CopyLinkButton: copies a post URL to the clipboard and confirms for two
 * seconds. Styled with the page kit's outline button.
 */

import { useState } from "react";
import { LinkIcon, Check } from "lucide-react";
import { BTN_OUTLINE } from "@/components/karibu/kit";

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
    <button type="button" className={BTN_OUTLINE} onClick={handleCopy} aria-label="Copy link to clipboard">
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Copied!
        </>
      ) : (
        <>
          <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Copy Link
        </>
      )}
    </button>
  );
}
