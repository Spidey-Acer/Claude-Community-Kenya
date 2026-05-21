"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/terminal";
import { PersonaHeading } from "@/components/persona/PersonaHeading";
import { PersonaText } from "@/components/persona/PersonaText";
import { useSkin } from "@/contexts/SkinContext";

export function CommunityHeader() {
  const { skin } = useSkin();
  const isPro = skin === "pro";

  return (
    <ScrollReveal>
      <section className="mb-12">
        <PersonaHeading
          page="community"
          section="hero"
          as="h1"
          className={isPro
            ? "mb-4 text-4xl font-medium text-[#faf9f5] sm:text-5xl"
            : "mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl"}
        />
        <PersonaText
          page="community"
          section="hero"
          field="subtitle"
          className={isPro
            ? "max-w-2xl text-lg text-[#b0aea5]"
            : "max-w-2xl font-sans text-lg text-text-secondary"}
        />
        <Link
          href="/community/submit"
          className={isPro
            ? "btn-primary-shadow mt-6 inline-flex items-center gap-2 rounded-full bg-[#d97757] px-6 py-3 text-[14px] font-semibold text-[#faf9f5] transition-all hover:bg-[#c06848]"
            : "mt-6 inline-flex items-center gap-2 border border-green-primary bg-green-primary/10 px-6 py-3 font-mono text-sm font-medium text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary"}
        >
          {!isPro && <span aria-hidden="true">&gt;</span>}
          Submit a Resource
          {isPro && <span aria-hidden="true">→</span>}
        </Link>
      </section>
    </ScrollReveal>
  );
}

export function CommunityEmpty({ type }: { type?: string }) {
  const { skin } = useSkin();
  const isPro = skin === "pro";

  return (
    <div
      className={isPro
        ? "card-elevated rounded-2xl p-10 text-center"
        : "rounded border border-border-default bg-bg-card p-8 text-center"}
    >
      <p className={isPro ? "text-[15px] text-[#b0aea5]" : "font-mono text-sm text-text-dim"}>
        No resources found{type ? ` for type "${type}"` : ""}.
      </p>
      <Link
        href="/community/submit"
        className={isPro
          ? "mt-4 inline-block text-[14px] font-medium text-[#d97757] transition-colors hover:text-[#e89576]"
          : "mt-4 inline-block font-mono text-sm text-green-primary hover:text-amber transition-colors"}
      >
        Be the first to submit one →
      </Link>
    </div>
  );
}

export function CommunityCountChip({ total }: { total: number }) {
  const { skin } = useSkin();
  const isPro = skin === "pro";
  return (
    <p
      className={isPro
        ? "mb-6 text-[12px] font-medium uppercase tracking-[0.14em] text-[#7a7870]"
        : "mb-6 font-mono text-xs text-text-dim"}
    >
      {total} {total === 1 ? "resource" : "resources"} found
    </p>
  );
}
