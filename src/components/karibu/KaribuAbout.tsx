"use client";

/**
 * KaribuAbout — warm-light About page for the Karibu identity.
 *
 * Ports about.dc.html AND preserves every section the Terminal Noir About had
 * (stats strip, origin story, values, real team grid, past-events timeline) —
 * redesigned, not removed. All content is DB-backed (team + past events + stats).
 */

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { CommunityStats } from "@/components/sections/HeroTerminal";
import type { TeamMemberView } from "@/lib/data";
import { SOCIAL_LINKS } from "@/lib/constants";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

interface TimelineEntry {
  date: string;
  title: string;
  description: string;
  hash: string;
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

const VALUES = [
  { title: "Free, always", body: "No fees, no gatekeeping. The community stays open to everyone." },
  { title: "Hands-on", body: "We learn by building real things together, not by lecturing." },
  { title: "Warm & local", body: "Kenyan at heart, globally connected. Karibu means karibu." },
];

export function KaribuAbout({
  stats,
  team,
  timelineEntries,
}: {
  stats: CommunityStats;
  team: TeamMemberView[];
  timelineEntries: TimelineEntry[];
}) {
  const activeTeam = team.filter((m) => m.active !== false);

  return (
    <>
      {/* Header */}
      <section className={`${WRAP} pb-8 pt-16`} aria-label="About hero">
        <Reveal>
          <div className={`${KICKER} mb-4`}>About · Kuhusu sisi</div>
          <h1 className="max-w-[880px] font-newsreader text-[38px] font-normal leading-[1.12] tracking-[-0.02em] text-ink sm:text-[52px]">
            We&apos;re a free, founder-led community for anyone in Kenya{" "}
            <span className="italic text-clay">learning and building</span> with
            Claude — and we mean anyone.
          </h1>
          {/* Stats strip (preserved) */}
          <div className="mt-8 flex flex-wrap gap-x-12 gap-y-4">
            <Stat big={`${stats.eventsHeld}`} label="events hosted" />
            <Stat big={`${stats.totalMembers}+`} label="members & growing" />
            <Stat big={`${stats.citiesActive.length}`} label={stats.citiesActive.join(" · ")} />
          </div>
        </Reveal>
      </section>

      {/* How CCK started + photo */}
      <section className={`${WRAP} border-t border-sand py-10`} aria-label="Our story">
        <Reveal className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="mb-3.5 font-newsreader text-[26px] font-medium text-ink">
              How CCK started
            </h2>
            <p className="mb-4 font-inter text-[15.5px] leading-[1.7] text-ink-soft">
              It began with a handful of people in Nairobi swapping notes on what
              they were building with Claude. Word spread, the group filled up,
              and meetups followed in Mombasa and beyond. Today CCK is{" "}
              {stats.totalMembers}+ members strong — students, founders, marketers
              and engineers at every level.
            </p>
            <p className="font-inter text-[15.5px] leading-[1.7] text-ink-soft">
              We stayed free and volunteer-run on purpose. The point isn&apos;t to
              sell anything — it&apos;s to make sure that if you&apos;re in Kenya and
              curious about AI, there&apos;s a warm, capable room waiting for you.
            </p>
          </div>
          <div className="relative h-[280px] overflow-hidden rounded-[14px] border border-sand-2 md:h-[320px]">
            <Image
              src="/images/community/first-meetup.webp"
              alt="A Claude Community Kenya founding meetup"
              fill
              sizes="(max-width: 768px) 100vw, 560px"
              className="object-cover"
            />
          </div>
        </Reveal>
      </section>

      {/* Values */}
      <section className={`${WRAP} py-8`} aria-label="Our values">
        <Reveal className="grid gap-4 sm:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-sand bg-paper-card p-7">
              <h3 className="mb-2 font-newsreader text-[22px] text-ink">{v.title}</h3>
              <p className="font-inter text-sm leading-[1.55] text-ink-soft">{v.body}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Anthropic tie */}
      <section className={`${WRAP} py-8`} aria-label="Anthropic tie">
        <Reveal>
          <div className="grid items-center gap-6 rounded-2xl bg-ink p-8 text-paper sm:grid-cols-[90px_1fr] sm:p-10">
            <div className="flex h-[90px] w-[90px] items-center justify-center rounded-[14px] bg-paper-alt">
              <Image src="/images/cck-logo.webp" alt="CCK" width={70} height={70} className="h-[70px] w-[70px] rounded-full" />
            </div>
            <div>
              <div className="mb-2.5 font-inter text-xs font-semibold uppercase tracking-[0.18em] text-clay-light">
                Official Anthropic tie
              </div>
              <p className="max-w-[660px] font-newsreader text-[21px] leading-[1.4] text-paper sm:text-[23px]">
                CCK is backed by Kenya&apos;s{" "}
                <span className="italic text-clay-light">Claude Community Ambassador</span> — a
                real link to Anthropic through the Community Ambassador programme,
                kept firmly in service of the community, never a sales channel.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* The people (real team) */}
      {activeTeam.length > 0 && (
        <section className={`${WRAP} py-10`} aria-label="Our team">
          <Reveal>
            <div className="mb-6 border-t border-sand pt-6 font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#8A7F6E]">
              The people
            </div>
          </Reveal>
          <Reveal className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {activeTeam.slice(0, 8).map((m) => (
              <TeamCard key={m.name} member={m} />
            ))}
          </Reveal>
          <p className="mt-4 font-inter text-[13px] text-ink-muted">
            + dozens of volunteers who set up chairs, answer questions, and keep
            the rooms warm.{" "}
            <Link href="/team" className="font-semibold text-clay hover:underline">
              Meet the full team →
            </Link>
          </p>
        </section>
      )}

      {/* Timeline (preserved, redesigned) */}
      {timelineEntries.length > 0 && (
        <section className={`${WRAP} py-10`} aria-label="Community timeline">
          <Reveal>
            <div className="mb-6 border-t border-sand pt-6 font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#8A7F6E]">
              How we got here
            </div>
          </Reveal>
          <Reveal>
            <ol className="relative border-l border-sand pl-6">
              {timelineEntries.map((t) => (
                <li key={t.hash} className="mb-7 last:mb-0">
                  <span className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-paper bg-clay" />
                  <div className="font-inter text-[12.5px] font-semibold uppercase tracking-[0.06em] text-clay">
                    {t.date}
                  </div>
                  <div className="font-newsreader text-[20px] text-ink">{t.title}</div>
                  {t.description && (
                    <p className="mt-1 max-w-2xl font-inter text-[14.5px] leading-[1.55] text-ink-soft">
                      {t.description}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Reveal>
        </section>
      )}

      {/* CTA */}
      <section className={`${WRAP} pb-16 pt-6`} aria-label="Join CTA">
        <Reveal>
          <div className="rounded-2xl bg-clay p-11 text-center text-paper-card">
            <h2 className="mb-5 font-newsreader text-[32px] font-normal sm:text-[36px]">
              Come build with us.
            </h2>
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full bg-ink px-8 py-4 font-inter text-[15.5px] font-semibold text-paper transition-colors hover:bg-black"
            >
              Join on WhatsApp
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div>
      <div className="font-newsreader text-[32px] font-medium text-ink">{big}</div>
      <div className="font-inter text-[13.5px] text-ink-muted">{label}</div>
    </div>
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
    <div>
      <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-sand">
        {member.avatar ? (
          <Image
            src={member.avatar}
            alt={member.name}
            width={220}
            height={220}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-newsreader text-[34px] text-ink-muted">{initials}</span>
        )}
      </div>
      <div className="font-inter text-[14.5px] font-semibold text-ink">{member.name}</div>
      <div className="font-inter text-[12.5px] text-ink-muted">{member.role}</div>
    </div>
  );
}
