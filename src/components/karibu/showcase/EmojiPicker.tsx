"use client"

import { useEffect, useRef, useState } from "react"
import { Smile } from "lucide-react"

/**
 * EmojiPicker — small popover for the composer's full-description field.
 *
 * A static character list rather than a library: showcase posts need a
 * handful of common emoji, not a full Unicode picker, and this avoids
 * shipping a picker dependency for that.
 */

const EMOJI_GROUPS: { label: string; emoji: string[] }[] = [
  { label: "Reactions", emoji: ["😀", "😂", "😍", "🤔", "😅", "🙌", "👏", "🎉"] },
  { label: "Gestures", emoji: ["👍", "👎", "🙏", "✌️", "🤝", "💪", "👀", "🔥"] },
  { label: "Build", emoji: ["🚀", "🛠️", "🐛", "✅", "⚡", "🧠", "💡", "📦"] },
  { label: "Symbols", emoji: ["❤️", "⭐", "🎯", "📈", "🔗", "🗓️", "📣", "🏆"] },
]

const ALL_EMOJI = EMOJI_GROUPS.flatMap((g) => g.emoji)

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
}

/**
 * Trigger button + popover. Keyboard nav (arrow keys, Escape) is handled
 * against a flat index over every group so it feels like one grid.
 */
export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  useEffect(() => {
    if (open) buttonRefs.current[activeIndex]?.focus()
  }, [open, activeIndex])

  function handleGridKeyDown(e: React.KeyboardEvent) {
    const columns = 8
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, ALL_EMOJI.length - 1))
        break
      case "ArrowLeft":
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
        break
      case "ArrowDown":
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + columns, ALL_EMOJI.length - 1))
        break
      case "ArrowUp":
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - columns, 0))
        break
      case "Escape":
        e.preventDefault()
        setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => {
          setActiveIndex(0)
          setOpen((v) => !v)
        }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Insert emoji"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sand-2 text-ink-soft transition-colors hover:border-clay hover:text-clay"
      >
        <Smile className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Emoji picker"
          className="absolute z-20 mt-1 w-64 rounded-lg border border-sand-2 bg-paper-card p-3 shadow-lg"
        >
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              <p className="mb-1 font-inter text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                {group.label}
              </p>
              <div className="grid grid-cols-8 gap-1" onKeyDown={handleGridKeyDown}>
                {group.emoji.map((char) => {
                  const index = ALL_EMOJI.indexOf(char)
                  return (
                    <button
                      key={char}
                      ref={(el) => {
                        buttonRefs.current[index] = el
                      }}
                      type="button"
                      tabIndex={index === activeIndex ? 0 : -1}
                      onClick={() => {
                        onSelect(char)
                        setOpen(false)
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded text-base transition-colors hover:bg-clay/10 focus:bg-clay/10 focus:outline-none"
                    >
                      {char}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
