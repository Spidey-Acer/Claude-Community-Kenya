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
│   https://www.claudekenya.org       │
│                                          │
│   Join us: discord.gg/NSB9AsCm           │
│                                          │
└──────────────────────────────────────────┘
`,
      "color: #00ff41; font-family: monospace;"
    );
  }, []);

  return null;
}
