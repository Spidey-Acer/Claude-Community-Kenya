"use client";

import { useEffect } from "react";

export function ConsoleWelcome() {
  useEffect(() => {
    console.log(
      `%c
┌──────────────────────────────────────────┐
│                                          │
│   Claude Community Kenya                 │
│   East Africa's Claude Dev Community     │
│                                          │
│   Built with Claude Code                 │
│   https://claudecommunitykenya.com       │
│                                          │
│   Join us: discord.gg/claude-community-ke│
│                                          │
└──────────────────────────────────────────┘
`,
      "color: #00ff41; font-family: monospace;"
    );
  }, []);

  return null;
}
