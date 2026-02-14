"use client";

import { useState } from "react";
import { events } from "@/data/events";
import { EventCard } from "@/components/sections/EventCard";
import { TerminalWindow, ScrollReveal, CommandPrefix } from "@/components/terminal";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "upcoming" | "past" | "nairobi" | "mombasa";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "nairobi", label: "Nairobi" },
  { key: "mombasa", label: "Mombasa" },
];

function filterEvents(key: FilterKey) {
  switch (key) {
    case "upcoming":
      return events.filter(
        (e) => e.status === "upcoming" || e.status === "registration-open"
      );
    case "past":
      return events.filter((e) => e.status === "completed");
    case "nairobi":
      return events.filter((e) => e.city === "Nairobi");
    case "mombasa":
      return events.filter((e) => e.city === "Mombasa");
    default:
      return events;
  }
}

export function EventsContent() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const filtered = filterEvents(activeFilter);

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <ScrollReveal>
          <section className="mb-12">
            <h1 className="mb-4 font-mono text-3xl font-bold text-green-primary sm:text-4xl">
              <CommandPrefix />
              ls events/ -la --sort=date
            </h1>
            <p className="max-w-2xl font-sans text-lg text-text-secondary">
              Meetups, workshops, hackathons, and career talks across Kenya.
              Find an event near you and join the community.
            </p>
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
                  "shrink-0 border px-4 py-2 font-mono text-sm transition-all duration-200",
                  activeFilter === filter.key
                    ? "border-green-primary text-green-primary bg-green-primary/10"
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
            <TerminalWindow title="search-results" variant="command">
              <p className="text-text-dim">
                <CommandPrefix symbol=">" />
                No events found for this filter.
              </p>
            </TerminalWindow>
          </ScrollReveal>
        )}
      </div>
    </main>
  );
}
