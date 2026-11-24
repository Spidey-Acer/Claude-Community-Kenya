"use client";

/**
 * KaribuAbout: the About page on the page kit. Origin story, values, who runs
 * the community, the real team, community photos and the past-events timeline.
 * The site shows no member, attendee or city counts, so none appear here.
 */

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { Github, Linkedin, Twitter, Globe } from "lucide-react";
import type { PhotoView, TeamMemberView } from "@/lib/data";
import { communityLifePhotos } from "@/components/karibu/photos";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { CtaBand } from "@/components/karibu/CtaBand";
import { FramedPhoto } from "@/components/karibu/FramedPhoto";
import { SupporterWall } from "@/components/karibu/SupporterWall";
import { SUPPORTERS } from "@/components/karibu/supporters";
import { Masthead, PANEL_DARK, Section, WRAP } from "@/components/karibu/kit";

interface TimelineEntry {
  date: string;
  title: string;
  description: string;
  hash: string;
}

/** Supporter roster minus Anthropic: About makes no Anthropic-backing claim. */
const VENUE_PARTNERS = SUPPORTERS.filter((supporter) => supporter.name !== "Anthropic");

const VALUES = [
  { title: "Free, always", body: "No fees, no gatekeeping. The community stays open to everyone." },
  { title: "Hands-on", body: "We learn by building real things together, not by lecturing." },
  { title: "Warm & local", body: "Kenyan at heart, globally connected. Everyone is welcome here." },
];

export function KaribuAbout({
  team,
  timelineEntries,
  photos,
}: {
  team: TeamMemberView[];
  timelineEntries: TimelineEntry[];
  photos: PhotoView[];
}) {
  const activeTeam = team.filter((m) => m.active !== false);
  const lifePhotos = communityLifePhotos(photos);

  return (
    <>
      <Masthead
        eyebrow="About"
        title="We're a free, founder-led community."
        lead="Anyone in Kenya learning and building with Claude, and we mean anyone."
        media={
          <Image
            src="/images/community/founder-talk.webp"
            alt="Peter Kibet speaking at a CCK event"
            fill
            priority
            sizes="(min-width: 1024px) 440px, 100vw"
            className="object-cover"
          />
        }
      />

      <Section eyebrow="Our story" title="How CCK started">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <p className="mb-4 font-inter text-[15.5px] leading-[1.7] text-ink-soft">
              It began with a handful of people in Nairobi swapping notes on what
              they were building with Claude. Word spread, the group filled up,
              and meetups followed in Mombasa and beyond. Today CCK brings together
              builders across WhatsApp, Discord and socials: students, founders,
              marketers and engineers at every level.
            </p>
            <p className="font-inter text-[15.5px] leading-[1.7] text-ink-soft">
              We stayed free and volunteer-run on purpose. The point isn&apos;t to
              sell anything. It&apos;s to make sure that if you&apos;re in Kenya and
              curious about AI, there&apos;s a warm, capable room waiting for you.
            </p>
          </div>
          <FramedPhoto
            src="/images/community/first-meetup.webp"
            alt="A Claude Community Kenya founding meetup"
            caption="First meetup · Jan 2026"
          />
        </div>
      </Section>

      <Section eyebrow="Our values" title="What we stand for">
        <div className="grid gap-4 sm:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl border border-sand bg-paper-card p-7">
              <h3 className="mb-2 font-newsreader text-[22px] text-ink">{v.title}</h3>
              <p className="font-inter text-sm leading-[1.55] text-ink-soft">{v.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <section className={`${WRAP} py-8`} aria-label="Who runs CCK">
        <Reveal>
          <div className={`grid items-center gap-6 p-8 sm:grid-cols-[90px_1fr] sm:p-10 ${PANEL_DARK}`}>
            <div className="flex h-[90px] w-[90px] items-center justify-center rounded-[14px] bg-paper-alt">
              <Image src="/images/cck-logo.webp" alt="CCK" width={70} height={70} className="h-[70px] w-[70px] rounded-full" />
            </div>
            <div>
              <div className="mb-2.5 font-inter text-xs font-semibold uppercase tracking-[0.18em] text-clay-light">
                Who runs CCK
              </div>
              <p className="max-w-[660px] font-newsreader text-[21px] leading-[1.4] text-on-panel-dark sm:text-[23px]">
                CCK is an independent, volunteer-run community, led by Kenya&apos;s{" "}
                <span className="italic text-clay-light">Claude Community Ambassador</span>,
                kept firmly in service of the community, never a sales channel.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {activeTeam.length > 0 && (
        <Section id="team" eyebrow="The people" title="Who you will meet">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {activeTeam.map((m, i) => (
              <div key={m.slug ?? `${m.name}-${i}`} className={i % 2 === 1 ? "lg:translate-y-8" : ""}>
                <TeamCard member={m} />
              </div>
            ))}
          </div>
          <p className="mt-4 font-inter text-[13px] text-ink-muted">
            Plus the volunteers who set up chairs, answer questions, and keep
            the rooms warm.
          </p>
        </Section>
      )}

      {lifePhotos.length > 0 && (
        <Section eyebrow="Community life" title="In the room">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {lifePhotos.map((photo) => (
              <div key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-paper-alt">
                <Image
                  src={photo.thumbnailUrl ?? photo.url}
                  alt={photo.alt ?? ""}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  unoptimized={photo.fromR2}
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </Section>
      )}

      {timelineEntries.length > 0 && (
        <Section eyebrow="Timeline" title="How we got here">
          <Timeline entries={timelineEntries} />
        </Section>
      )}

      <section className={`${WRAP} py-10`} aria-label="Venue partners">
        <Reveal>
          <SupporterWall
            supporters={VENUE_PARTNERS}
            caption="The venues and partners that open their doors to us"
          />
        </Reveal>
      </section>

      <section className={`${WRAP} pb-16 pt-6`} aria-label="Join CTA">
        <Reveal>
          <CtaBand />
        </Reveal>
      </section>
    </>
  );
}

/**
 * Community timeline with a scroll-linked clay line-draw. The static sand
 * border is the always-visible track (degrade-safe); the clay overlay draws
 * as the list scrolls through the viewport and is omitted under reduced
 * motion. Each milestone reveals once via the shared degrade-safe Reveal.
 */
function Timeline({ entries }: { entries: TimelineEntry[] }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 85%", "end 55%"],
  });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <ol ref={ref} className="relative border-l border-sand pl-6">
      {!reduce && (
        <motion.span
          aria-hidden="true"
          style={{ scaleY, transformOrigin: "top" }}
          className="pointer-events-none absolute -left-px top-0 h-full w-px bg-clay"
        />
      )}
      {entries.map((t, i) => (
        <li key={t.hash} className="mb-7 last:mb-0">
          <span className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-paper bg-clay" />
          <Reveal index={i}>
            <div className="font-inter text-[12.5px] font-semibold uppercase tracking-[0.06em] text-clay">
              {t.date}
            </div>
            <div className="font-newsreader text-[20px] text-ink">{t.title}</div>
            {t.description && (
              <p className="mt-1 max-w-2xl font-inter text-[14.5px] leading-[1.55] text-ink-soft">
                {t.description}
              </p>
            )}
          </Reveal>
        </li>
      ))}
    </ol>
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
    <div className="group">
      <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-sand">
        {member.avatar ? (
          <Image
            src={member.avatar}
            alt={member.name}
            width={220}
            height={220}
            className="h-full w-full object-cover transition-transform duration-300 ease-[var(--ease-reversible)] group-hover:scale-105"
          />
        ) : (
          <span className="font-newsreader text-[34px] text-ink-muted">{initials}</span>
        )}
      </div>
      <div className="font-inter text-[14.5px] font-semibold text-ink">{member.name}</div>
      <div className="font-inter text-[12.5px] text-ink-muted">{member.role}</div>
      <div className="mt-2 flex items-center gap-2.5 text-ink-muted">
        {member.github && (
          <SocialLink href={member.github} label={`${member.name} on GitHub`}>
            <Github className="h-3.5 w-3.5" />
          </SocialLink>
        )}
        {member.linkedIn && (
          <SocialLink href={member.linkedIn} label={`${member.name} on LinkedIn`}>
            <Linkedin className="h-3.5 w-3.5" />
          </SocialLink>
        )}
        {member.twitter && (
          <SocialLink href={member.twitter} label={`${member.name} on Twitter`}>
            <Twitter className="h-3.5 w-3.5" />
          </SocialLink>
        )}
        {member.website && (
          <SocialLink href={member.website} label={`${member.name} website`}>
            <Globe className="h-3.5 w-3.5" />
          </SocialLink>
        )}
      </div>
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="transition-colors hover:text-clay">
      {children}
    </a>
  );
}
