"use client"

import { useEffect, useRef, useState } from "react"

/**
 * "Copy link" for the public result card: writes the page's own URL to the
 * clipboard and reads "Copied" for two seconds. Client-side only because
 * the clipboard is; everything else on the page is server-rendered. The
 * button's width and focus ring match the download buttons beside it.
 */
export function CopyLinkButton({ url, className }: { url: string; className: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard denied (insecure context, permissions): the URL is still
      // in the address bar, so there is nothing more useful to say here.
      setCopied(false)
    }
  }

  return (
    <button type="button" onClick={() => void copy()} className={className} aria-live="polite">
      {copied ? "Copied" : "Copy link"}
    </button>
  )
}
