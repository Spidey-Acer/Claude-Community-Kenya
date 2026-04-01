"use client";

import { motion } from "framer-motion";
import type { CommunityStats } from "@/components/sections/HeroTerminal";

const DEFAULT_STATS: CommunityStats = {
  discordMembers: 100,
  whatsappMembers: 120,
  linkedinMembers: 80,
  totalMembers: 300,
  eventsHeld: 5,
  citiesActive: ["Nairobi", "Mombasa"],
  resourceCount: 33,
};

export function StatsBarPro({ stats }: { stats?: CommunityStats }) {
  const s = stats ?? DEFAULT_STATS;

  const items = [
    { value: `${s.discordMembers}`, label: "Discord Members", icon: "💬" },
    { value: `${s.whatsappMembers}`, label: "WhatsApp Members", icon: "📱" },
    { value: `${s.linkedinMembers}`, label: "LinkedIn Followers", icon: "💼" },
    { value: `${s.eventsHeld}`, label: "Events Hosted", icon: "📅" },
    { value: `${s.citiesActive.length}`, label: "Active Cities", icon: "📍" },
    { value: `${s.resourceCount}`, label: "Resources", icon: "📚" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-800/50 hover:-translate-y-0.5"
        >
          {/* Subtle gradient on hover */}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: "radial-gradient(ellipse at center, rgba(120,119,198,0.06), transparent 70%)",
            }}
          />
          <div className="relative">
            <span className="text-lg" aria-hidden="true">{item.icon}</span>
            <div className="mt-2 text-2xl font-bold tracking-tight text-white">
              {item.value}
            </div>
            <div className="mt-0.5 text-xs font-medium text-zinc-500">
              {item.label}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
