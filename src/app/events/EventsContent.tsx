"use client";

import { useState } from "react";
import type { Event } from "@/lib/types";
import { EventCard } from "@/components/sections/EventCard";
import { TerminalWindow, ScrollReveal, CommandPrefix } from "@/components/terminal";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { cn } from "@/lib/utils";
import { PersonaHeading } from "@/components/persona/PersonaHeading";
import { PersonaText } from "@/components/persona/PersonaText";
import { useSkin } from "@/contexts/SkinContext";

type FilterKey = "all" | "upcoming" | "past" | "nairobi" | "mombasa";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "nairobi", label: "Nairobi" },
  { key: "mombasa", label: "Mombasa" },
];

function applyFilter(allEvents: Event[], key: FilterKey) {
  switch (key) {
    case "upcoming":
      return allEvents.filter(
        (e) => e.status === "upcoming" || e.status === "registration-open"
      );
    case "past":
      return allEvents.filter((e) => e.status === "completed");
    case "nairobi":
      return allEvents.filter((e) => e.city === "Nairobi");
    case "mombasa":
      return allEvents.filter((e) => e.city === "Mombasa");
    default:
      return allEvents;
  }
}

export function EventsContent({ events }: { events: Event[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const filtered = applyFilter(events, activeFilter);
  const { skin } = useSkin();
  const isPro = skin === "pro";

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Events" }]} />
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <ScrollReveal>
          <section className="mb-12">
            <PersonaHeading
              page="events"
              section="hero"
              as="h1"
              className={isPro
                ? "mb-4 text-4xl font-medium text-[#faf9f5] sm:text-5xl"
                : "mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl"}
            />
            <PersonaText
              page="events"
              section="hero"
              field="subtitle"
              className={isPro
                ? "max-w-2xl text-lg text-[#b0aea5]"
                : "max-w-2xl font-sans text-lg text-text-secondary"}
            />
          </section>
        </ScrollReveal>

        {/* Filter bar */}
        <ScrollReveal delay={100}>
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={cn(
                  isPro
                    ? "shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-200"
                    : "shrink-0 border px-4 py-2 font-mono text-sm transition-all duration-200",
                  activeFilter === filter.key
                    ? isPro
                      ? "border-[#d97757] bg-[#d97757]/15 text-[#d97757]"
                      : "border-green-primary text-green-primary bg-green-primary/10"
                    : isPro
                      ? "border-[#2a2a28] text-[#b0aea5] hover:border-[#3a3a37] hover:text-[#e8e6dc]"
                      : "border-border-default text-text-dim hover:border-border-hover hover:text-text-secondary"
                )}
                aria-pressed={activeFilter === filter.key}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Events grid */}
        {filtered.length > 0 ? (
          <ScrollReveal
            stagger={100}
            className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filtered.map((event) => (
              <EventCard key={event.slug} event={event} />
            ))}
          </ScrollReveal>
        ) : (
          <ScrollReveal>
            {isPro ? (
              <div className="card-elevated rounded-2xl p-10 text-center">
                <p className="text-[15px] text-[#b0aea5]">No events found for this filter.</p>
                <p className="mt-2 text-[13px] text-[#7a7870]">Try switching filters above.</p>
              </div>
            ) : (
              <TerminalWindow title="search-results" variant="command">
                <p className="text-text-dim">
                  <CommandPrefix symbol=">" />
                  No events found for this filter.
                </p>
              </TerminalWindow>
            )}
          </ScrollReveal>
        )}
      </div>
    </main>
  );
}
