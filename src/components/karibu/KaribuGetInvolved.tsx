"use client";

/**
 * KaribuGetInvolved — one page for the speaker, volunteer and idea forms.
 *
 * A three-way segmented control picks the panel; only the active panel is
 * mounted so form field ids never collide. Each panel keeps the submission
 * contract of the form it came from (CSRF token, its own API route and
 * validation); this component only switches between them.
 */

import { useState } from "react";
import type { Role } from "@/lib/get-involved";
import { SpeakPanel } from "@/components/karibu/get-involved/SpeakPanel";
import { VolunteerPanel } from "@/components/karibu/get-involved/VolunteerPanel";
import { IdeaPanel } from "@/components/karibu/get-involved/IdeaPanel";

const OPTIONS: ReadonlyArray<{ role: Role; label: string }> = [
  { role: "speak", label: "Speak" },
  { role: "volunteer", label: "Volunteer" },
  { role: "idea", label: "Submit an idea" },
];

export function KaribuGetInvolved({ initialRole }: { initialRole: Role }) {
  const [role, setRole] = useState<Role>(initialRole);

  function selectRole(next: Role) {
    setRole(next);
    window.history.replaceState(null, "", `/get-involved?role=${next}`);
  }

  return (
    <>
      <div className="mx-auto max-w-[880px] px-6 pt-10 md:px-10">
        <div role="tablist" aria-label="Ways to get involved" className="inline-flex rounded-full border border-sand-2 bg-paper-card p-1">
          {OPTIONS.map(({ role: optionRole, label }) => (
            <button
              key={optionRole}
              type="button"
              role="tab"
              aria-selected={role === optionRole}
              onClick={() => selectRole(optionRole)}
              className={`rounded-full px-4 py-2 font-inter text-sm font-semibold transition-colors ${
                role === optionRole ? "bg-band-bg text-on-band" : "text-ink hover:text-clay"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel">
        {role === "speak" && <SpeakPanel />}
        {role === "volunteer" && <VolunteerPanel />}
        {role === "idea" && <IdeaPanel />}
      </div>
    </>
  );
}
