"use client";

import { useState } from "react";
import { TerminalWindow } from "@/components/terminal";
import { TypingAnimation } from "@/components/terminal";
import { SOCIAL_LINKS } from "@/lib/constants";

const heroLines = [
  "$ whoami",
  "> Claude Community Kenya \u{1F1F0}\u{1F1EA}",
  "",
  "$ cat mission.txt",
  "> Building East Africa's most vibrant",
  "  AI developer community",
  "",
  "$ status --check",
  "> \u{1F7E2} ACTIVE",
  "> Cities: Nairobi, Mombasa",
  "> Developers: 30+",
  "> Events: 3 held (Nairobi x2, Mombasa x1)",
  "> Resources: 33 curated",
  "> Next event: Hackathon · April 4, 2026",
  "",
  "$ join --now",
];

export function HeroTerminal() {
  const [typingComplete, setTypingComplete] = useState(false);

  return (
    <TerminalWindow
      variant="command"
      title="claude-community-kenya@nairobi:~$"
      glowing
      className="max-w-2xl"
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
