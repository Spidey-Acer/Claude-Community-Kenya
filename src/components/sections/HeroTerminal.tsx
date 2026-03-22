"use client";

import { useState } from "react";
import { TerminalWindow } from "@/components/terminal";
import { TypingAnimation } from "@/components/terminal";
import { SOCIAL_LINKS } from "@/lib/constants";

export interface CommunityStats {
  discordMembers: number;
  whatsappMembers: number;
  linkedinMembers: number;
  totalMembers: number;
  eventsHeld: number;
  citiesActive: string[];
  resourceCount: number;
}

function buildHeroLines(stats: CommunityStats): string[] {
  return [
    "$ whoami",
    "> Claude Community Kenya \u{1F1F0}\u{1F1EA}",
    "",
    "$ cat mission.txt",
    "> Building East Africa's most vibrant",
    "  AI developer community",
    "",
    "$ status --check",
    "> \u{1F7E2} ACTIVE",
    `> Cities: ${stats.citiesActive.join(", ")}`,
    `> Discord: ${stats.discordMembers} \u00B7 WhatsApp: ${stats.whatsappMembers} \u00B7 LinkedIn: ${stats.linkedinMembers}`,
    `> Events: ${stats.eventsHeld} held \u00B7 ${stats.citiesActive.join(" & ")}`,
    `> Resources: ${stats.resourceCount} curated`,
    "",
    "$ join --now",
  ];
}

const DEFAULT_STATS: CommunityStats = {
  discordMembers: 71,
  whatsappMembers: 70,
  linkedinMembers: 59,
  totalMembers: 200,
  eventsHeld: 2,
  citiesActive: ["Nairobi", "Mombasa"],
  resourceCount: 33,
};

export function HeroTerminal({ stats }: { stats?: CommunityStats }) {
  const [typingComplete, setTypingComplete] = useState(false);
  const heroLines = buildHeroLines(stats ?? DEFAULT_STATS);

  return (
    <TerminalWindow
      variant="command"
      title="claude-community-kenya@nairobi:~$"
      glowing
      className="w-full max-w-2xl"
    >
      <TypingAnimation
        text={heroLines}
        speed={35}
        showCursor={!typingComplete}
        onComplete={() => setTypingComplete(true)}
      />
      {typingComplete && (
        <div className="min-h-[1.5em]">
          <a
            href={SOCIAL_LINKS.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-green-primary hover:text-amber transition-colors duration-200"
            aria-label="Join Claude Community Kenya on Discord"
          >
            <span className="text-text-primary">{"> "}</span>
            <span className="underline underline-offset-4">
              [CLICK TO JOIN DISCORD]
            </span>
            <span className="cursor-blink ml-1">{"\u258A"}</span>
          </a>
        </div>
      )}
    </TerminalWindow>
  );
}
