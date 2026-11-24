"use client";

/**
 * CopyLinkButton: copies a post URL to the clipboard and confirms for two
 * seconds. A polite status region announces the result; a clipboard failure
 * shows visible text. Styled with the page kit's outline button.
 */

import { useState } from "react";
import { LinkIcon, Check } from "lucide-react";
import { BTN_OUTLINE } from "@/components/karibu/kit";

interface CopyLinkButtonProps {
  url: string;
}

type CopyState = "idle" | "copied" | "failed";

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [state, setState] = useState<CopyState>("idle");

  function showResult(next: CopyState) {
    setState(next);
    setTimeout(() => setState("idle"), 2000);
  }

  function handleCopy() {
    navigator.clipboard.writeText(url).then(
      () => showResult("copied"),
      () => showResult("failed")
    );
  }

  return (
    <>
      <button type="button" className={`${BTN_OUTLINE} min-w-[9rem]`} onClick={handleCopy}>
        {state === "copied" ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {state === "copied" ? "Copied" : "Copy link"}
      </button>
      <span role="status" className={state === "failed" ? "font-inter text-[13px] text-error" : "sr-only"}>
        {state === "copied" && "Link copied to clipboard"}
        {state === "failed" && "Could not copy. Select the address bar link instead."}
      </span>
    </>
  );
}
