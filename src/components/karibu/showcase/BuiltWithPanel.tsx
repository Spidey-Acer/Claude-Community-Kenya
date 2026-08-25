import type { BuiltWith } from "@/lib/showcase/queries"

interface BuiltWithPanelProps {
  builtWith: BuiltWith | null
}

/**
 * "Built with" spec panel — models, skills, MCPs and an optional
 * tokens-per-run figure.
 *
 * A group with no entries is omitted outright rather than rendered as an
 * empty heading, and the whole panel disappears if nothing was submitted.
 * Uses the fixed `--panel-dark` / `--on-panel-dark` pair (never `bg-ink`) so
 * this stays a dark card in both the light and dark Karibu themes, matching
 * the CTA panels in KaribuAbout/Faq/Home/Learn.
 */
export function BuiltWithPanel({ builtWith }: BuiltWithPanelProps) {
  if (!builtWith) return null

  const groups: Array<{ label: string; items: string[] }> = [
    { label: "Models", items: builtWith.models },
    { label: "Skills", items: builtWith.skills },
    { label: "MCPs", items: builtWith.mcps },
  ].filter((group) => group.items.length > 0)

  if (groups.length === 0 && builtWith.tokensPerRun == null) return null

  return (
    <div className="rounded-2xl bg-panel-dark p-6 text-on-panel-dark sm:p-7">
      <h2 className="mb-4 font-inter text-xs font-semibold uppercase tracking-[0.18em] text-on-panel-dark-muted">
        Built with
      </h2>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="mb-1.5 font-inter text-[11px] font-semibold uppercase tracking-wide text-on-panel-dark-muted">
              {group.label}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[#3B352D] px-2.5 py-1 font-inter text-[12.5px] text-on-panel-dark"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
        {builtWith.tokensPerRun != null && (
          <div>
            <div className="mb-1.5 font-inter text-[11px] font-semibold uppercase tracking-wide text-on-panel-dark-muted">
              Tokens per run
            </div>
            <p className="font-inter text-[14px] tabular-nums text-on-panel-dark">
              {builtWith.tokensPerRun.toLocaleString("en-KE")}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
