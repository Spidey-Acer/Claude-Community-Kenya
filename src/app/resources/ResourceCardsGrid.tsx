"use client";

import Link from "next/link";
import { Rocket, Terminal, GitBranch, Link as LinkIcon, GraduationCap, Code2, Zap } from "lucide-react";
import { ScrollReveal } from "@/components/terminal";
import { useSkin } from "@/contexts/SkinContext";

type IconKey = "rocket" | "terminal" | "git-branch" | "link" | "graduation" | "code" | "zap";

const ICON_MAP = {
  rocket: Rocket,
  terminal: Terminal,
  "git-branch": GitBranch,
  link: LinkIcon,
  graduation: GraduationCap,
  code: Code2,
  zap: Zap,
} as const;

export interface ResourceCardData {
  title: string;
  href: string;
  icon: IconKey;
  description: string;
}

export function ResourceCardsGrid({ cards }: { cards: readonly ResourceCardData[] }) {
  const { skin } = useSkin();
  const isPro = skin === "pro";

  return (
    <ScrollReveal stagger={100} className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {cards.map((card) => {
        const Icon = ICON_MAP[card.icon];

        if (isPro) {
          return (
            <Link
              key={card.href}
              href={card.href}
              className="card-elevated group block rounded-2xl p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#3a3a37] bg-gradient-to-br from-[#d97757]/15 to-[#6a9bcc]/10 transition-all duration-300 group-hover:border-[#d97757]/50">
                  <Icon className="h-5 w-5 text-[#d97757]" />
                </div>
                <h2 className="text-[18px] font-semibold text-[#faf9f5] transition-colors duration-300 group-hover:text-[#d97757]">
                  {card.title}
                </h2>
              </div>
              <p className="text-[14px] leading-relaxed text-[#b0aea5]">
                {card.description}
              </p>
              <div className="mt-4 text-[12px] font-medium text-[#7a7870] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                Read the guide →
              </div>
            </Link>
          );
        }

        // Dev / Terminal Noir variant
        return (
          <Link
            key={card.href}
            href={card.href}
            className="group block border border-border-default bg-bg-card transition-all duration-300 hover:-translate-y-1 hover:border-border-hover hover:shadow-[0_0_20px_rgba(0,255,65,0.1)]"
          >
            <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
              </div>
              <span className="ml-2 font-mono text-xs text-text-dim">
                {card.href}
              </span>
            </div>
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center border border-border-default bg-bg-elevated transition-colors duration-300 group-hover:border-green-primary/30 group-hover:bg-green-primary/10">
                  <Icon className="h-5 w-5 text-green-primary transition-colors duration-300 group-hover:text-amber" />
                </div>
                <h2 className="font-mono text-lg font-bold text-text-primary transition-colors duration-300 group-hover:text-green-primary">
                  {card.title}
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-text-secondary">
                {card.description}
              </p>
              <div className="mt-4 font-mono text-xs text-green-dim opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                cd {card.href} &amp;&amp; cat README.md
              </div>
            </div>
          </Link>
        );
      })}
    </ScrollReveal>
  );
}
