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
  { target: 30, suffix: "+", label: "Members" },
  { target: 2, suffix: "", label: "Cities" },
  { target: 1, suffix: "", label: "Events Hosted" },
  { target: 4, suffix: "", label: "Team Members" },
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
          <div className="py-2">
            <CountUp
              target={stat.target}
              suffix={stat.suffix}
              className="block font-mono text-3xl font-bold text-green-primary"
            />
            <span className="mt-1 block font-mono text-xs uppercase tracking-wider text-text-dim">
              {stat.label}
            </span>
          </div>
        </Card>
      ))}
    </ScrollReveal>
  );
}
