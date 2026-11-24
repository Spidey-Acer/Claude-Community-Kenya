"use client"

/**
 * Download, share-sheet, LinkedIn and caption buttons for the finished card.
 *
 * LinkedIn cannot take an image by URL, so the page says so plainly: download
 * the card first, then attach it to the post. Nothing here sends the card
 * anywhere; the share sheet is the device's own.
 */

import { useState, useSyncExternalStore } from "react"
import { Download, Linkedin, Copy, Share2 } from "lucide-react"

interface ShareButtonsProps {
  /** Renders the card at the chosen size and returns the PNG. */
  getCardBlob: () => Promise<Blob>
  caption: string
  eventUrl: string
}

const FILE_NAME = "claude-community-attending.png"
const BUTTON =
  "inline-flex items-center gap-2 rounded-full border border-sand-2 bg-paper-card px-5 py-2.5 font-inter text-[13.5px] font-semibold text-ink transition-colors hover:border-ink"

function linkedInShareUrl(eventUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`
}

/** Browser capability, read after hydration; the server render assumes no share sheet. */
function canShareFilesNow(): boolean {
  const probe = new File([""], FILE_NAME, { type: "image/png" })
  return typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] })
}
const subscribeNever = () => () => undefined

export function ShareButtons({ getCardBlob, caption, eventUrl }: ShareButtonsProps) {
  const canShareFiles = useSyncExternalStore(subscribeNever, canShareFilesNow, () => false)
  const [status, setStatus] = useState<string | null>(null)

  async function download() {
    const url = URL.createObjectURL(await getCardBlob())
    const link = document.createElement("a")
    link.href = url
    link.download = FILE_NAME
    link.click()
    URL.revokeObjectURL(url)
    setStatus("Card downloaded. Attach it to your LinkedIn post.")
  }

  async function shareSheet() {
    const file = new File([await getCardBlob()], FILE_NAME, { type: "image/png" })
    try {
      await navigator.share({ files: [file], text: caption })
    } catch {
      setStatus("Sharing was cancelled.")
    }
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption)
      setStatus("Caption copied. You can edit it after pasting.")
    } catch {
      setStatus("Could not copy. Select the caption text and copy it by hand.")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={download} className={BUTTON}>
          <Download className="h-4 w-4" aria-hidden /> Download PNG
        </button>
        {canShareFiles && (
          <button type="button" onClick={shareSheet} className={BUTTON}>
            <Share2 className="h-4 w-4" aria-hidden /> Share
          </button>
        )}
        <a href={linkedInShareUrl(eventUrl)} target="_blank" rel="noopener noreferrer" className={BUTTON}>
          <Linkedin className="h-4 w-4" aria-hidden /> Post on LinkedIn
        </a>
        <button type="button" onClick={copyCaption} className={BUTTON}>
          <Copy className="h-4 w-4" aria-hidden /> Copy caption
        </button>
      </div>
      <p className="font-inter text-[13.5px] text-ink-soft">
        Download your card first, then attach it to your post.
      </p>
      <p className="font-inter text-[13.5px] text-ink-muted">Suggested caption: {caption}</p>
      {status && (
        <p role="status" className="font-inter text-[13.5px] text-ink-soft">
          {status}
        </p>
      )}
    </div>
  )
}
