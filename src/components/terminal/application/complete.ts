import { CONTACT, SOCIAL_LINKS } from "@/lib/constants";
import { uid } from "./state";
import type { FormResponses, TerminalLine } from "./types";

const SUCCESS_BANNER = `+------------------------------------------+
|         APPLICATION SUBMITTED            |
+------------------------------------------+`;

const FAILURE_BANNER = `+------------------------------------------+
|         SUBMISSION FAILED                |
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

export function buildFailureLines(): TerminalLine[] {
  return [
    { id: uid(), type: "system", content: "", color: "dim" },
    { id: uid(), type: "ascii-art", content: FAILURE_BANNER, color: "red" },
    { id: uid(), type: "system", content: "", color: "dim" },
    {
      id: uid(),
      type: "feedback",
      content: "  [ERR] YOUR APPLICATION DID NOT GO THROUGH",
      color: "red",
    },
    { id: uid(), type: "system", content: "", color: "dim" },
    {
      id: uid(),
      type: "system",
      content: "  Something went wrong submitting this form. Please try again,",
      color: "amber",
    },
    {
      id: uid(),
      type: "system",
      content: "  or reach us directly so we don't lose your application:",
      color: "amber",
    },
    { id: uid(), type: "system", content: "", color: "dim" },
    {
      id: uid(),
      type: "system",
      content: `  Email   --> ${CONTACT.email}`,
      color: "cyan",
    },
    {
      id: uid(),
      type: "system",
      content: `  Discord --> ${SOCIAL_LINKS.discord}`,
      color: "cyan",
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

// Submits the application and reports whether it actually reached the server.
// Callers must await this and render success/failure state accordingly —
// never assume success before the request resolves.
export async function submitApplication(
  responses: FormResponses,
  csrfToken: string
): Promise<boolean> {
  if (!csrfToken) return false;
  try {
    const response = await fetch("/api/join", {
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
    });
    return response.ok;
  } catch {
    return false;
  }
}
