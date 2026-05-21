"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Calendar,
  Mic,
  Users,
  Sparkles,
  Handshake,
  Mail,
} from "lucide-react";
import { SOCIAL_LINKS, CONTACT } from "@/lib/constants";
import { HeroEmailCapture } from "@/components/sections/HeroEmailCapture";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface CommunityPulse {
  members: number;
  meetups: number;
  cities: number;
  resources: number;
}

const DEFAULT_PULSE: CommunityPulse = {
  members: 300,
  meetups: 2,
  cities: 2,
  resources: 33,
};

interface JoinPathway {
  icon: typeof MessageSquare;
  title: string;
  description: string;
  cta: string;
  href: string;
  external?: boolean;
  primary?: boolean;
}

const pathways: JoinPathway[] = [
  {
    icon: MessageSquare,
    title: "Discord Community",
    description:
      "Daily conversations, code reviews, project collaboration, and job sharing. Our most active hub.",
    cta: "Join Discord",
    href: SOCIAL_LINKS.discord,
    external: true,
    primary: true,
  },
  {
    icon: Calendar,
    title: "Attend a meetup",
    description:
      "Nothing beats meeting people in person. Nairobi and Mombasa events every month.",
    cta: "Browse events",
    href: "/events",
  },
  {
    icon: Users,
    title: "Create an account",
    description:
      "Save your favourite resources, comment on community submissions, and track your event RSVPs.",
    cta: "Sign up",
    href: "/signup",
  },
];

const contributeCards = [
  {
    icon: Mic,
    title: "Speak at a meetup",
    description:
      "Have a Claude project to share? Give a lightning talk or full presentation at one of our events.",
    href: "/speak",
  },
  {
    icon: Handshake,
    title: "Help organize",
    description:
      "We need co-organizers, especially in Mombasa. Help us bring the community to your city.",
    href: `mailto:${CONTACT.email}?subject=Help%20Organize%20CCK`,
  },
  {
    icon: Sparkles,
    title: "Submit a project",
    description:
      "Built something with Claude? Get it featured on our projects page and inspire other developers.",
    href: "/submit-project",
  },
  {
    icon: Mail,
    title: "Partner with us",
    description:
      "University, company, or venue? Let's collaborate and grow the AI developer community together.",
    href: `mailto:${CONTACT.email}?subject=Partnership%20with%20CCK`,
  },
];

export function ProJoinContent({ pulse = DEFAULT_PULSE }: { pulse?: CommunityPulse }) {
  return (
    <main className="min-h-screen px-4 py-16 sm:px-6 lg:px-8">
      {/* Ambient gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 35% at 50% -10%, rgba(217, 119, 87, 0.10), transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 50%, rgba(106, 155, 204, 0.06), transparent 65%)
          `,
        }}
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="mb-16 text-center"
        >
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2a2a28] bg-[#1e1e1d]/60 px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#b0aea5] backdrop-blur-sm">
              <img src="/images/claude-sparkle.svg" alt="" className="h-3 w-3" />
              <span>You belong here</span>
            </span>
          </div>

          <h1
            className="mb-6 text-[42px] font-medium leading-[1.05] text-[#faf9f5] sm:text-[64px] lg:text-[76px]"
            style={{
              fontFamily: 'var(--font-display), ui-serif, Georgia, serif',
              letterSpacing: "-0.025em",
            }}
          >
            Join the community
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-[17px] leading-relaxed text-[#b0aea5] sm:text-[19px]">
            Whether you write code, run a business, study, or just love building — there&apos;s a
            place for you here. No application, no gatekeeping. Pick how you want to start.
          </p>

          {/* Community pulse */}
          <div className="mx-auto mb-12 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12px] font-medium uppercase tracking-[0.14em] text-[#7a7870]">
            <span className="tabular-nums">
              <span className="text-[#d97757]">{pulse.members}+</span> members
            </span>
            <span className="text-[#3a3a37]">·</span>
            <span className="tabular-nums">
              <span className="text-[#6a9bcc]">{pulse.meetups}</span> meetups
            </span>
            <span className="text-[#3a3a37]">·</span>
            <span className="tabular-nums">
              <span className="text-[#788c5d]">{pulse.cities}</span> cities
            </span>
            <span className="text-[#3a3a37]">·</span>
            <span className="tabular-nums">
              <span className="text-[#b0aea5]">{pulse.resources}</span> resources
            </span>
          </div>

          {/* Email capture */}
          <div className="mx-auto max-w-md">
            <HeroEmailCapture
              label="Or just get the monthly digest"
              buttonLabel="Sign me up"
            />
          </div>
        </motion.section>

        {/* Pathways */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="mb-20"
          aria-labelledby="pathways-heading"
        >
          <h2
            id="pathways-heading"
            className="mb-3 text-center text-[28px] font-medium text-[#faf9f5] sm:text-[32px]"
            style={{ fontFamily: 'var(--font-display), ui-serif, Georgia, serif', letterSpacing: "-0.02em" }}
          >
            Three ways to get started
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-[15px] text-[#b0aea5]">
            All free. Pick the one that fits you today — you can always add the others later.
          </p>

          <div className="grid gap-5 md:grid-cols-3">
            {pathways.map((p, i) => {
              const Icon = p.icon;
              const Wrapper: React.ElementType = p.external ? "a" : Link;
              const wrapperProps = p.external
                ? { href: p.href, target: "_blank", rel: "noopener noreferrer" }
                : { href: p.href };
              return (
                <motion.div
                  key={p.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: EASE_OUT }}
                >
                  <Wrapper
                    {...wrapperProps}
                    className={
                      p.primary
                        ? "card-featured group flex h-full flex-col rounded-2xl p-7"
                        : "card-elevated group flex h-full flex-col rounded-2xl p-7"
                    }
                  >
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-[#3a3a37] bg-gradient-to-br from-[#d97757]/20 to-[#d97757]/5">
                      <Icon className="h-5 w-5 text-[#d97757]" aria-hidden="true" />
                    </div>
                    <h3 className="mb-2 text-[18px] font-semibold text-[#faf9f5]">{p.title}</h3>
                    <p className="mb-6 flex-1 text-[14px] leading-relaxed text-[#b0aea5]">
                      {p.description}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#d97757] transition-all group-hover:gap-2">
                      {p.cta}
                      <span aria-hidden="true">→</span>
                    </span>
                  </Wrapper>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Contribute */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          id="contribute"
          className="mb-12 scroll-mt-24"
          aria-labelledby="contribute-heading"
        >
          <h2
            id="contribute-heading"
            className="mb-3 text-center text-[28px] font-medium text-[#faf9f5] sm:text-[32px]"
            style={{ fontFamily: 'var(--font-display), ui-serif, Georgia, serif', letterSpacing: "-0.02em" }}
          >
            Want to give back?
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-[15px] text-[#b0aea5]">
            The community runs on people who show up. Here&apos;s how you can help shape it.
          </p>

          <div className="grid gap-5 md:grid-cols-2">
            {contributeCards.map((c, i) => {
              const Icon = c.icon;
              const isExternal = c.href.startsWith("mailto:");
              const Wrapper: React.ElementType = isExternal ? "a" : Link;
              return (
                <motion.div
                  key={c.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: EASE_OUT }}
                >
                  <Wrapper
                    href={c.href}
                    className="card-elevated group flex h-full flex-col rounded-2xl p-6"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#252524] border border-[#3a3a37]">
                      <Icon className="h-4 w-4 text-[#d97757]" aria-hidden="true" />
                    </div>
                    <h3 className="mb-2 text-[16px] font-semibold text-[#faf9f5]">{c.title}</h3>
                    <p className="text-[13.5px] leading-relaxed text-[#b0aea5]">
                      {c.description}
                    </p>
                  </Wrapper>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Contact strip */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          className="mb-8 text-center"
        >
          <p className="text-[13px] text-[#7a7870]">
            Or reach out directly:{" "}
            <a
              href={`mailto:${CONTACT.email}`}
              className="text-[#d97757] underline decoration-[#d97757]/40 underline-offset-2 transition-colors hover:decoration-[#d97757]"
            >
              {CONTACT.email}
            </a>
            <span className="mx-2 text-[#3a3a37]">·</span>
            <a
              href={`tel:${CONTACT.phone.replace(/\s/g, "")}`}
              className="text-[#d97757] underline decoration-[#d97757]/40 underline-offset-2 transition-colors hover:decoration-[#d97757]"
            >
              {CONTACT.phone}
            </a>
          </p>
        </motion.section>
      </div>
    </main>
  );
}
