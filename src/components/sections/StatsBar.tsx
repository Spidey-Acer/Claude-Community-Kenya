"use client";

import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { TypingAnimation } from "@/components/terminal/TypingAnimation";
import { ScrollReveal } from "@/components/terminal";
import { useState } from "react";
import { TypingCursor } from "@/components/terminal/TypingCursor";

const statsLines = [
  "$ git log --stat --community",
  "",
  "  50+ members joined across Kenya",
  "  3 meetups held \u00B7 Nairobi & Mombasa",
  "  33 curated resources & tutorials",
  "  Growing every week...",
  "",
  "  $ ",
];

export function StatsBar() {
  const [typingDone, setTypingDone] = useState(false);

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
