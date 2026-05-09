import { uid } from "./state";
import type { FormResponses, TerminalLine } from "./types";

const SUCCESS_BANNER = `+------------------------------------------+
|         APPLICATION SUBMITTED            |
+------------------------------------------+`;

export function buildCompleteLines(
  responses: FormResponses,
  easterEggsFound: number
): TerminalLine[] {
  return [
    { id: uid(), type: "system", content: "", color: "dim" },
    { id: uid(), type: "ascii-art", content: SUCCESS_BANNER, color: "green" },
    { id: uid(), type: "system", content: "", color: "dim" },
    {
      id: uid(),
      type: "feedback",
      content: `  Welcome to Claude Community Kenya, ${responses.name}.`,
      color: "green",
    },
    { id: uid(), type: "system", content: "", color: "dim" },
    {
      id: uid(),
      type: "feedback",
      content: "  [OK] APPLICATION RECEIVED",
      color: "green",
    },
    { id: uid(), type: "system", content: "", color: "dim" },
    { id: uid(), type: "system", content: "  Next steps:", color: "primary" },
    { id: uid(), type: "system", content: "", color: "dim" },
    {
      id: uid(),
      type: "system",
      content: "  1. Join Discord --> discord.gg/CkD9QWjsHm",
      color: "cyan",
    },
    {
      id: uid(),
      type: "system",
      content: "  2. Follow us --> @ClaudeCommunityKE",
      color: "cyan",
    },
    {
      id: uid(),
      type: "system",
      content: "  3. Upcoming events --> /events",
      color: "cyan",
    },
    { id: uid(), type: "system", content: "", color: "dim" },
    {
      id: uid(),
      type: "system",
      content: `  Easter Eggs: ${easterEggsFound}/5`,
      color: "amber",
    },
    {
      id: uid(),
      type: "system",
      content: "  HINT: Try some shell commands...",
      color: "dim",
    },
  ];
}

export function persistApplication(responses: FormResponses): void {
  try {
    localStorage.setItem(
      "cck-application",
      JSON.stringify({ ...responses, submittedAt: new Date().toISOString() })
    );
  } catch {
    // ignore
  }
}

// Fire-and-forget submission. Errors are swallowed because the user has already
// seen the success state — surfacing failures here is worse UX than silent retry on next visit.
export function submitApplication(
  responses: FormResponses,
  csrfToken: string
): void {
  if (!csrfToken) return;
  fetch("/api/join", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({
      name: responses.name,
      email: responses.email,
      experience: responses.experience || "Not specified",
      interests: [responses.role, responses.city].filter(Boolean),
      reason: responses.why || "Joined via terminal application",
      heardFrom: responses.referral || undefined,
    }),
  }).catch(() => {});
}
