const EASTER_EGGS: Record<string, { response: string; egg: string }> = {
  help: {
    response:
      "Commands: name, email, city, role, experience, why, referral. Just answer the prompts.",
    egg: "help",
  },
  ls: {
    response:
      "name/ email/ city/ role/ experience/ why/ referral/ -> submit",
    egg: "ls",
  },
  clear: {
    response: "You can't clear your destiny. Keep going.",
    egg: "clear",
  },
  exit: {
    response: "No escape. You're one of us now.",
    egg: "exit",
  },
  pwd: {
    response: "~/claude-community-kenya/applications/your-future",
    egg: "pwd",
  },
};

export function checkEasterEgg(
  input: string
): { response: string; egg: string } | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.startsWith("sudo")) {
    return { response: "Nice try. No root access here.", egg: "sudo" };
  }
  return EASTER_EGGS[trimmed] || null;
}
