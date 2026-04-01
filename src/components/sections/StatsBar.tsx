"use client";

import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { TypingAnimation } from "@/components/terminal/TypingAnimation";
import { ScrollReveal } from "@/components/terminal";
import { useState } from "react";
import { TypingCursor } from "@/components/terminal/TypingCursor";
import type { CommunityStats } from "@/components/sections/HeroTerminal";

function buildStatsLines(stats: CommunityStats): string[] {
  return [
    "$ git log --stat --community",
    "",
    `  Discord: ${stats.discordMembers} · WhatsApp: ${stats.whatsappMembers} · LinkedIn: ${stats.linkedinMembers}`,
    `  ${stats.eventsHeld} meetups held · ${stats.citiesActive.join(" & ")}`,
    `  ${stats.resourceCount} curated resources & tutorials`,
    "  Growing every week...",
    "",
    "  $ ",
  ];
}

const DEFAULT_STATS: CommunityStats = {
  discordMembers: 100,
  whatsappMembers: 120,
  linkedinMembers: 80,
  totalMembers: 300,
  eventsHeld: 5,
  citiesActive: ["Nairobi", "Mombasa"],
  resourceCount: 33,
};

export function StatsBar({ stats }: { stats?: CommunityStats }) {
  const [typingDone, setTypingDone] = useState(false);
  const statsLines = buildStatsLines(stats ?? DEFAULT_STATS);

  return (
    <ScrollReveal>
      <TerminalWindow
        title="community-stats"
        variant="command"
        className="mx-auto max-w-2xl"
      >
        <TypingAnimation
          text={statsLines}
          speed={30}
          showCursor={!typingDone}
          onComplete={() => setTypingDone(true)}
        />
        {typingDone && (
          <span className="inline-flex items-center">
            <TypingCursor />
          </span>
        )}
      </TerminalWindow>
    </ScrollReveal>
  );
}
