"use client";

import { useState, useEffect, useCallback } from "react";
import { TerminalWindow } from "@/components/terminal";
import { TypingAnimation } from "@/components/terminal";
import { SOCIAL_LINKS } from "@/lib/constants";

export interface CommunityStats {
  discordMembers: number;
  whatsappMembers: number;
  linkedinMembers: number;
  totalMembers: number;
  eventsHeld: number;
  citiesActive: string[];
  resourceCount: number;
}

export interface FeedItem {
  type: "blog" | "community" | "project" | "event";
  label: string;
  title: string;
  meta: string;
  href: string;
}

interface HeroTerminalProps {
  stats?: CommunityStats;
  feed?: FeedItem[];
}

const DEFAULT_STATS: CommunityStats = {
  discordMembers: 100,
  whatsappMembers: 120,
  linkedinMembers: 80,
  totalMembers: 300,
  eventsHeld: 5,
  citiesActive: ["Nairobi", "Mombasa"],
  resourceCount: 33,
};

const TYPE_COLORS: Record<string, string> = {
  blog: "text-amber",
  community: "text-cyan",
  project: "text-green-primary",
  event: "text-red",
};

const TYPE_LABELS: Record<string, string> = {
  blog: "BLOG",
  community: "RESOURCE",
  project: "PROJECT",
  event: "EVENT",
};

function buildHeroLines(): string[] {
  return [
    "$ whoami",
    "> Claude Community Kenya \u{1F1F0}\u{1F1EA}",
    "",
    "$ cat mission.txt",
    "> Building East Africa's most vibrant",
    "  AI developer community",
    "",
    "$ tail -f activity.log",
  ];
}

export function HeroTerminal({ stats, feed = [] }: HeroTerminalProps) {
  const [typingComplete, setTypingComplete] = useState(false);
  const [currentFeedIndex, setCurrentFeedIndex] = useState(0);
  const [feedVisible, setFeedVisible] = useState(true);
  const heroLines = buildHeroLines();
  const resolvedStats = stats ?? DEFAULT_STATS;

  const rotateFeed = useCallback(() => {
    if (feed.length <= 1) return;
    setFeedVisible(false);
    setTimeout(() => {
      setCurrentFeedIndex((prev) => (prev + 1) % feed.length);
      setFeedVisible(true);
    }, 300);
  }, [feed.length]);

  useEffect(() => {
    if (!typingComplete || feed.length <= 1) return;
    const interval = setInterval(rotateFeed, 4000);
    return () => clearInterval(interval);
  }, [typingComplete, feed.length, rotateFeed]);

  const currentItem = feed[currentFeedIndex];

  return (
    <TerminalWindow
      variant="command"
      title="claude-community-kenya@nairobi:~$"
      glowing
      className="w-full max-w-2xl"
    >
      <TypingAnimation
        text={heroLines}
        speed={35}
        showCursor={!typingComplete}
        onComplete={() => setTypingComplete(true)}
      />

      {/* Activity Feed — rotates after typing completes */}
      {typingComplete && currentItem && (
        <div
          className={`mt-1 transition-all duration-300 ${
            feedVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
          }`}
        >
          <a
            href={currentItem.href}
            className="group/feed block rounded border border-transparent px-2 py-1.5 -mx-2 transition-all duration-200 hover:border-green-primary/20 hover:bg-green-primary/5"
            style={{ boxShadow: "none" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 15px rgba(0,255,65,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <div className="flex items-start gap-2 font-mono text-sm">
              <span className="text-text-dim select-none">{">"}</span>
              <div className="min-w-0 flex-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${TYPE_COLORS[currentItem.type] ?? "text-text-dim"}`}>
                  [{TYPE_LABELS[currentItem.type] ?? currentItem.type}]
                </span>
                {" "}
                <span className="text-text-primary group-hover/feed:text-green-primary transition-colors">{currentItem.title}</span>
                <div className="text-[11px] text-text-dim mt-0.5">
                  {currentItem.meta}
                  <span className="ml-2 text-green-primary opacity-0 group-hover/feed:opacity-100 transition-opacity">&rarr;</span>
                </div>
              </div>
            </div>
          </a>

          {/* Feed dots indicator */}
          {feed.length > 1 && (
            <div className="flex items-center gap-1 mt-2 ml-4">
              {feed.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentFeedIndex
                      ? "w-4 bg-green-primary"
                      : "w-1 bg-text-dim/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick stats one-liner */}
      {typingComplete && (
        <div className="mt-3 font-mono text-[11px] text-text-dim border-t border-border-default/30 pt-2">
          <span className="text-green-primary">{resolvedStats.totalMembers}</span> members
          {" \u00B7 "}
          <span className="text-amber">{resolvedStats.eventsHeld}</span> events
          {" \u00B7 "}
          <span className="text-cyan">{resolvedStats.citiesActive.length}</span> cities
          {" \u00B7 "}
          <span className="text-green-primary">{resolvedStats.resourceCount}</span> resources
        </div>
      )}

      {/* Discord CTA */}
      {typingComplete && (
        <div className="mt-2 min-h-[1.5em]">
          <a
            href={SOCIAL_LINKS.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm text-green-primary hover:text-amber transition-colors duration-200"
            aria-label="Join Claude Community Kenya on Discord"
          >
            <span className="text-text-primary">{"> "}</span>
            <span className="underline underline-offset-4">
              [CLICK TO JOIN DISCORD]
            </span>
            <span className="cursor-blink ml-1">{"\u258A"}</span>
          </a>
        </div>
      )}
    </TerminalWindow>
  );
}
