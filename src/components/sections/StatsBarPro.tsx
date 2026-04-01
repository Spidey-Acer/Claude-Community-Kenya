"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
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

function AnimatedNumber({ value }: { value: number }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {value}
    </motion.span>
  );
}

export function StatsBarPro({ stats }: { stats?: CommunityStats }) {
  const s = stats ?? DEFAULT_STATS;
  const [expanded, setExpanded] = useState(false);

  const highlights = [
    { value: s.totalMembers, suffix: "+", label: "Community Members", color: "#d97757" },
    { value: s.eventsHeld, suffix: "", label: "Events Hosted", color: "#6a9bcc" },
    { value: s.citiesActive.length, suffix: "", label: "Active Cities", color: "#788c5d" },
  ];

  const details = [
    { value: s.discordMembers, label: "Discord", color: "#6a9bcc" },
    { value: s.whatsappMembers, label: "WhatsApp", color: "#788c5d" },
    { value: s.linkedinMembers, label: "LinkedIn", color: "#d97757" },
    { value: s.resourceCount, label: "Resources", color: "#b0aea5" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      {/* Main stats — always visible */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-center gap-8 sm:gap-16"
      >
        {highlights.map((item, i) => (
          <div key={item.label} className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: item.color }}
            >
              <AnimatedNumber value={item.value} />{item.suffix}
            </motion.div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-[#7a7870]">
              {item.label}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Expand/collapse toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex justify-center"
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="group flex items-center gap-2 rounded-full border border-[#2a2a28] bg-[#1e1e1d]/80 px-5 py-2 text-xs font-medium text-[#b0aea5] backdrop-blur-sm transition-all duration-300 hover:border-[#d97757]/30 hover:text-[#e8e6dc]"
          aria-expanded={expanded}
          aria-controls="stats-details"
        >
          {expanded ? "Less detail" : "See the breakdown"}
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown size={14} />
          </motion.span>
        </button>
      </motion.div>

      {/* Detailed breakdown — expandable */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            id="stats-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {details.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                  className="group rounded-xl border border-[#2a2a28] bg-[#1e1e1d]/60 p-4 text-center backdrop-blur-sm transition-all duration-300 hover:border-[#3a3a37]"
                >
                  <div
                    className="text-xl font-bold"
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium text-[#7a7870]">
                    {item.label}
                  </div>
                  {/* Color accent bar */}
                  <div
                    className="mx-auto mt-2 h-0.5 w-8 rounded-full opacity-40 transition-opacity duration-300 group-hover:opacity-80"
                    style={{ backgroundColor: item.color }}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
