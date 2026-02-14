"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import type { Event } from "@/data/events";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Clock, Tag } from "lucide-react";

interface EventCardProps {
  event: Event;
}

const statusLabels: Record<Event["status"], string> = {
  upcoming: "Upcoming",
  "registration-open": "Registration Open",
  completed: "Completed",
  "sold-out": "Sold Out",
};

export function EventCard({ event }: EventCardProps) {
  const isActionable =
    event.status === "upcoming" || event.status === "registration-open";
  const ctaLabel = isActionable ? "Register" : "View Recap";

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
