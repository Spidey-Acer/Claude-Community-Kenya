"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { MediaFrame } from "@/components/ui/MediaFrame";
import type { Event } from "@/data/events";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Clock, Tag } from "lucide-react";
import { usePersona } from "@/contexts/PersonaContext";

interface EventCardProps {
  event: Event;
}

const statusLabels: Record<Event["status"], string> = {
  upcoming: "Upcoming",
  "registration-open": "Registration Open",
  completed: "Completed",
  "sold-out": "Sold Out",
};

const proStatusColors: Record<Event["status"], string> = {
  upcoming: "bg-[#4a9eff]",
  "registration-open": "bg-[#3ecf8e]",
  completed: "bg-[#7a7870]",
  "sold-out": "bg-[#d97757]",
};

export function EventCard({ event }: EventCardProps) {
  const { persona } = usePersona();
  const isPro = persona === "pro";

  const isActionable =
    event.status === "upcoming" || event.status === "registration-open";
  const ctaLabel = isActionable ? "Register" : "View Recap";

  if (isPro) {
    return (
      <Link
        href={`/events/${event.slug}`}
        className="group block"
        aria-label={`${event.title} — ${statusLabels[event.status]}`}
      >
        <div
          className={cn(
            "rounded-2xl border border-[#2a2a28] bg-[#1e1e1d]/60 backdrop-blur-xl",
            "transition-all duration-300",
            "hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]"
          )}
        >
          {/* Gradient accent bar */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#d97757]/30 to-transparent rounded-t-2xl" />

          {/* Poster */}
          {event.posterUrl && (
            <MediaFrame
              src={event.posterUrl}
              alt={`${event.title} poster`}
              variant="card"
              showTitleBar={false}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}

          {/* Content */}
          <div className="p-6">
            {/* Status badge — pill with colored dot */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2a2a28] bg-[#2a2a28]/60 px-2.5 py-1 text-xs text-[#b0aea5]">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    proStatusColors[event.status]
                  )}
                />
                {statusLabels[event.status]}
              </span>
            </div>

            {/* Title */}
            <h3 className="mb-3 text-lg font-semibold text-[#faf9f5] group-hover:text-[#d97757] transition-colors duration-200">
              {event.title}
            </h3>

            {/* Meta info */}
            <div className="mb-4 space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#7a7870]" aria-hidden="true" />
                <span className="text-[#b0aea5]">{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#7a7870]" aria-hidden="true" />
                <span className="text-[#b0aea5]">{event.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#7a7870]" aria-hidden="true" />
                <span className="text-[#b0aea5]">
                  {event.city} &mdash; {event.venue}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="mb-4 text-sm text-[#b0aea5] line-clamp-2">
              {event.description}
            </p>

            {/* Type tag */}
            <div className="mb-4 flex items-center gap-2">
              <Tag className="h-3.5 w-3.5 text-[#7a7870]" aria-hidden="true" />
              <span className="text-xs uppercase tracking-wider text-[#7a7870]">
                {event.type}
              </span>
            </div>

            {/* CTA */}
            <div className="text-sm font-medium text-[#d97757] transition-colors duration-200">
              {ctaLabel} &rarr;
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${event.slug}`}
      className="group block"
      aria-label={`${event.title} — ${statusLabels[event.status]}`}
    >
      <div
        className={cn(
          "border border-border-default bg-bg-card transition-all duration-300",
          "hover:border-border-hover hover:-translate-y-0.5",
          "hover:shadow-[0_4px_20px_rgba(0,255,65,0.08)]"
        )}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
          </div>
          <span className="ml-2 font-mono text-xs text-text-dim">
            event/{event.slug}
          </span>
        </div>

        {/* Poster */}
        {event.posterUrl && (
          <MediaFrame
            src={event.posterUrl}
            alt={`${event.title} poster`}
            variant="card"
            showTitleBar={false}
            glowColor="green"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}

        {/* Content */}
        <div className="p-6">
          {/* Status badge */}
          <div className="mb-3">
            <Badge variant={event.status}>{statusLabels[event.status]}</Badge>
          </div>

          {/* Title */}
          <h3 className="mb-3 font-mono text-lg font-semibold text-green-primary group-hover:text-amber transition-colors duration-200">
            {event.title}
          </h3>

          {/* Meta info */}
          <div className="mb-4 space-y-1.5 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-text-dim" aria-hidden="true" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-text-dim" aria-hidden="true" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-text-dim" aria-hidden="true" />
              <span>
                {event.city} &mdash; {event.venue}
              </span>
            </div>
          </div>

          {/* Description (2 lines truncated) */}
          <p className="mb-4 text-sm text-text-secondary line-clamp-2">
            {event.description}
          </p>

          {/* Type tag */}
          <div className="mb-4 flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-text-dim" aria-hidden="true" />
            <span className="font-mono text-xs uppercase tracking-wider text-text-dim">
              {event.type}
            </span>
          </div>

          {/* CTA */}
          <div className="font-mono text-sm font-medium text-green-primary group-hover:text-amber transition-colors duration-200">
            <span className="text-text-dim">&gt; </span>
            {ctaLabel} &rarr;
          </div>
        </div>
      </div>
    </Link>
  );
}
