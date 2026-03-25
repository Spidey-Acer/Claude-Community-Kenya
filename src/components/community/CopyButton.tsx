"use client"

import { Copy } from "lucide-react"

export function CopyButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className="absolute right-2 top-2 rounded border border-border-default p-1.5 text-text-dim transition-colors hover:border-green-primary/50 hover:text-green-primary"
      aria-label="Copy to clipboard"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  )
}
