"use client"

import { useState, useEffect } from "react"
import { MessageSquare, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSocialLinks } from "@/contexts/SocialLinksContext"

export function FloatingDiscordCTA() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const { discord } = useSocialLinks()

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 400)
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (dismissed || !visible || !discord) return null

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
      <a
        href={discord}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-full",
          "bg-green-primary/10 border border-green-primary/30 backdrop-blur-sm",
          "font-mono text-xs font-semibold text-green-primary",
          "hover:bg-green-primary/20 hover:border-green-primary/50 transition-all",
          "shadow-[0_0_20px_rgba(0,255,65,0.1)]"
        )}
      >
        <MessageSquare className="h-4 w-4" />
        Ask on Discord
      </a>
      <button
        onClick={() => setDismissed(true)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-bg-card border border-border-default text-text-dim hover:text-text-secondary transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
