"use client";

/**
 * KaribuTeam — warm-light /team page for the Karibu identity.
 *
 * Header + full team grid with avatars (real or initials fallback), role,
 * tagline, location, and social links. Data from getTeamMembers().
 */

import Image from "next/image";
import { Github, Linkedin, Twitter, Globe } from "lucide-react";
import type { TeamMemberView } from "@/lib/data";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { PageBanner } from "@/components/karibu/PageBanner";
import { CtaBand } from "@/components/karibu/CtaBand";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

export function KaribuTeam({ members }: { members: TeamMemberView[] }) {
  const active = members.filter((m) => m.active !== false);
  return (
    <>
      <PageBanner
        image="/images/community/group-standing.webp"
        imageAlt="A CCK community group photo"
        crumbs={["Home", "Team"]}
        title="The people behind CCK."
        subtitle="Organisers, ambassadors and contributors who keep the rooms warm and the community moving."
      />

      <section className={`${WRAP} py-16`} aria-label="Team">
        {active.length > 0 ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {active.map((m, i) => (
              // Keyed by slug, not name: two rows can share a name (production
              // rendered "Peter Kibet" twice until 2026-07-20) and duplicate
              // keys make React reuse the wrong card. See commit e8707cf.
              // Staggered grid (borrows africahackon's team-grid structure):
              // every other column shifts down at desktop width.
              <Reveal
                key={m.slug ?? `${m.name}-${i}`}
                index={i}
                className={i % 2 === 1 ? "lg:translate-y-8" : undefined}
              >
                <TeamCard member={m} />
              </Reveal>
            ))}
          </div>
        ) : (
          // "Coming soon" appears instantly — we never animate attention onto
          // an empty state.
          <p className="text-center font-inter text-ink-muted">Team coming soon.</p>
        )}
      </section>

      <section className={`${WRAP} pb-16`} aria-label="Join CTA">
        <CtaBand />
      </section>
    </>
  );
}

function TeamCard({ member }: { member: TeamMemberView }) {
  const initials = member.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="group h-full rounded-2xl border border-sand bg-paper-card p-5 text-center transition-transform duration-150 ease-[var(--ease-reversible)] hover:-translate-y-1">
      <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-sand">
        {member.avatar ? (
          <Image src={member.avatar} alt={member.name} width={96} height={96} className="h-full w-full object-cover transition-transform duration-300 ease-[var(--ease-reversible)] group-hover:scale-105" />
        ) : (
          <span className="font-newsreader text-[28px] text-ink-muted">{initials}</span>
        )}
      </div>
      <div className="font-inter text-[15px] font-semibold text-ink">{member.name}</div>
      <div className="font-inter text-[13px] text-clay">{member.role}</div>
      {member.location && (
        <div className="mt-0.5 font-inter text-[12px] text-ink-muted">{member.location}</div>
      )}
      {member.tagline && (
        <p className="mt-2 font-inter text-[12.5px] leading-[1.5] text-ink-soft">{member.tagline}</p>
      )}
      <div className="mt-3 flex items-center justify-center gap-3 text-ink-muted">
        {member.github && <Social href={member.github} label={`${member.name} on GitHub`}><Github className="h-4 w-4" /></Social>}
        {member.linkedIn && <Social href={member.linkedIn} label={`${member.name} on LinkedIn`}><Linkedin className="h-4 w-4" /></Social>}
        {member.twitter && <Social href={member.twitter} label={`${member.name} on Twitter`}><Twitter className="h-4 w-4" /></Social>}
        {member.website && <Social href={member.website} label={`${member.name} website`}><Globe className="h-4 w-4" /></Social>}
      </div>
    </div>
  );
}

function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="transition-colors hover:text-clay">
      {children}
    </a>
  );
}
