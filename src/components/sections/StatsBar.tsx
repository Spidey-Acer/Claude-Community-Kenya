"use client";

import { CountUp } from "@/components/ui/CountUp";
import { ScrollReveal } from "@/components/terminal";
import { Card } from "@/components/ui/Card";

interface Stat {
  target: number;
  suffix: string;
  label: string;
}

const stats: Stat[] = [
  { target: 30, suffix: "+", label: "Developers" },
  { target: 3, suffix: "", label: "Events Hosted" },
  { target: 2, suffix: "", label: "Cities" },
  { target: 33, suffix: "", label: "Resources Curated" },
];

export function StatsBar() {
  return (
    <ScrollReveal
      stagger={100}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat) => (
        <Card
          key={stat.label}
          showDots={false}
          padding="sm"
          className="text-center"
        >
          <div
            className="py-2"
            aria-label={`${stat.target}${stat.suffix} ${stat.label}`}
          >
            <CountUp
              target={stat.target}
              suffix={stat.suffix}
              className="block font-mono text-3xl font-bold text-green-primary"
              aria-hidden="true"
            />
            <span className="mt-1 block font-mono text-xs uppercase tracking-wider text-text-dim" aria-hidden="true">
              {stat.label}
            </span>
          </div>
        </Card>
      ))}
    </ScrollReveal>
  );
}
