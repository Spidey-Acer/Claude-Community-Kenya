"use client"

import { useState, useTransition } from "react"
import {
  Link2,
  Save,
  Loader2,
  CheckCircle,
  MessageCircle,
  MessageSquare,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Github,
  Calendar,
} from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"
import { SOCIAL_PLATFORM_META, type SocialPlatformKey } from "@/lib/social-links-schema"

const PLATFORM_ICON: Record<SocialPlatformKey, typeof Link2> = {
  whatsapp: MessageCircle,
  discord: MessageSquare,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  github: Github,
  lumaNairobi: Calendar,
  lumaMombasa: Calendar,
}

type LinksState = Record<SocialPlatformKey, string>
type ErrorsState = Partial<Record<SocialPlatformKey, string>>

interface SocialLinksEditorProps {
  /** Raw DB values (empty string where the column is null / not configured). */
  initialLinks: LinksState
}

export function SocialLinksEditor({ initialLinks }: SocialLinksEditorProps) {
  const [links, setLinks] = useState<LinksState>(initialLinks)
  const [errors, setErrors] = useState<ErrorsState>({})
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleChange(key: SocialPlatformKey, value: string) {
    setLinks((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function handleSave() {
    setSaveError(null)
    setSaved(false)
    setErrors({})

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/settings/socials", {
          method: "PATCH",
          headers: await csrfHeaders(),
          body: JSON.stringify(links),
        })
        const json = await res.json()

        if (!json.success) {
          if (Array.isArray(json.details)) {
            const fieldErrors: ErrorsState = {}
            for (const issue of json.details) {
              const key = issue.path?.[0] as SocialPlatformKey | undefined
              if (key) fieldErrors[key] = issue.message
            }
            setErrors(fieldErrors)
          }
          setSaveError(json.error || "Failed to save")
          return
        }

        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } catch {
        setSaveError("Network error — please try again")
      }
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-4 h-4 text-[#00ff41]" />
        <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Social Links</h2>
        <span className="text-[10px] font-mono text-[#444] ml-auto">
          Empty = not configured, falls back to the site default
        </span>
      </div>

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SOCIAL_PLATFORM_META.map((meta) => {
            const Icon = PLATFORM_ICON[meta.key]
            const error = errors[meta.key]
            return (
              <div key={meta.key}>
                <label
                  htmlFor={`social-${meta.key}`}
                  className="text-[11px] font-mono text-[#666] mb-1 flex items-center gap-1.5"
                >
                  <Icon className="w-3 h-3 text-[#00ff41]" />
                  {meta.label}
                </label>
                <input
                  id={`social-${meta.key}`}
                  type="url"
                  value={links[meta.key]}
                  onChange={(e) => handleChange(meta.key, e.target.value)}
                  placeholder={meta.placeholder}
                  className={`w-full bg-[#0a0a0a] border rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:outline-none transition-colors ${
                    error ? "border-[#ff3333] focus:border-[#ff3333]" : "border-[#222] focus:border-[#00ff41]"
                  }`}
                />
                {error && <p className="mt-1 text-[10px] font-mono text-[#ff3333]">{error}</p>}
              </div>
            )
          })}
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#1a1a1a]">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-sm font-mono text-[#00ff41] hover:bg-[#00ff41]/20 disabled:opacity-50 transition-all"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isPending ? "Saving..." : saved ? "Saved!" : "Save Social Links"}
          </button>
          {saveError && <span className="text-[11px] font-mono text-[#ff3333]">{saveError}</span>}
        </div>
      </div>
    </div>
  )
}
