import { uid } from "./state";
import type { TerminalLine } from "./types";

export const BOOT_LINES: TerminalLine[] = [
  { id: uid(), type: "input", content: "./apply.sh" },
  {
    id: uid(),
    type: "system",
    content: "Initializing Claude Community Kenya application...",
    color: "dim",
  },
  { id: uid(), type: "system", content: "", color: "dim" },
  {
    id: uid(),
    type: "ascii-art",
    content: `  ____  ____  _  __
 / ___\|/ ___|| |/ /
| |    | |    | ' /
| |___ | |___ | . \\
 \\____| \\____||_|\\_\\  APPLY`,
    color: "green",
  },
  { id: uid(), type: "system", content: "", color: "dim" },
];

export const BOOT_INTRO_TEXT = [
  "East Africa's first Claude developer community.",
  "Want in? Let's go.",
];

export const RETURNING_USER_ASCII = `  ____  ____  _  __
 / ___\|/ ___|| |/ /
| |    | |    | ' /
| |___ | |___ | . \\
 \\____| \\____||_|\\_\\  APPLY`;
