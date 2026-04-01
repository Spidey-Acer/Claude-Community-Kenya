"use client"

import type { TeamMemberView } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Linkedin, Github, Twitter, Globe } from "lucide-react";
import Image from "next/image";
import { usePersona } from "@/contexts/PersonaContext";

interface TeamMemberCardProps {
  member: TeamMemberView;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  const { persona } = usePersona()
  const isPro = persona === "pro"
  const hasSocials = member.linkedIn || member.github || member.twitter || member.website;

  if (isPro) {
    return (
      <div
        className="rounded-2xl border transition-all duration-300 hover:-translate-y-1 backdrop-blur-xl"
        style={{ borderColor: "#2a2a28", backgroundColor: "rgba(30,30,29,0.6)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#3a3a37"
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a28"
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = "none"
        }}
      >
        <div className="p-6">
          {/* Avatar + Name */}
          <div className="mb-4 flex items-center gap-4">
            {member.avatar ? (
              <div
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border"
                style={{ borderColor: "rgba(217,119,87,0.3)" }}
              >
                <Image src={member.avatar} alt={member.name} fill className="object-cover" />
              </div>
            ) : (
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border"
                style={{ borderColor: "rgba(217,119,87,0.3)", backgroundColor: "rgba(217,119,87,0.1)" }}
                aria-hidden="true"
              >
                <span className="text-lg font-bold" style={{ color: "#d97757" }}>
                  {getInitials(member.name)}
                </span>
              </div>
            )}

            <div>
              <h3 className="text-base font-semibold" style={{ color: "#faf9f5" }}>
                {member.name}
              </h3>
              <p className="text-xs" style={{ color: "#d97757" }}>{member.role}</p>
            </div>
          </div>

          {/* Bio */}
          <p className="mb-4 text-sm leading-relaxed" style={{ color: "#b0aea5" }}>
            {member.bio}
          </p>

          {/* Social links */}
          {hasSocials && (
            <div
              className="flex items-center gap-3 border-t pt-3"
              style={{ borderColor: "#2a2a28" }}
            >
              {member.linkedIn && (
                <a
                  href={member.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200"
                  style={{ color: "#7a7870" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#d97757")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#7a7870")}
                  aria-label={`${member.name} on LinkedIn`}
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
              {member.github && (
                <a
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200"
                  style={{ color: "#7a7870" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#d97757")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#7a7870")}
                  aria-label={`${member.name} on GitHub`}
                >
                  <Github className="h-4 w-4" />
                </a>
              )}
              {member.twitter && (
                <a
                  href={member.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200"
                  style={{ color: "#7a7870" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#d97757")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#7a7870")}
                  aria-label={`${member.name} on Twitter`}
                >
                  <Twitter className="h-4 w-4" />
                </a>
              )}
              {member.website && (
                <a
                  href={member.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors duration-200"
                  style={{ color: "#7a7870" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#d97757")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#7a7870")}
                  aria-label={`${member.name}'s website`}
                >
                  <Globe className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
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
          team/{member.name.toLowerCase().replace(/\s+/g, "-")}
        </span>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Avatar + Name */}
        <div className="mb-4 flex items-center gap-4">
          {/* Avatar */}
          {member.avatar ? (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-green-primary/30">
              <Image
                src={member.avatar}
                alt={member.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-green-primary/30 bg-green-primary/10"
              aria-hidden="true"
            >
              <span className="font-mono text-lg font-bold text-green-primary">
                {getInitials(member.name)}
              </span>
            </div>
          )}

          <div>
            <h3 className="font-mono text-base font-semibold text-green-primary">
              {member.name}
            </h3>
            <p className="font-mono text-xs text-amber">{member.role}</p>
          </div>
        </div>

        {/* Bio */}
        <p className="mb-4 text-sm text-text-secondary leading-relaxed">
          {member.bio}
        </p>

        {/* Social links */}
        {hasSocials && (
          <div className="flex items-center gap-3 border-t border-border-default pt-3">
            {member.linkedIn && (
              <a
                href={member.linkedIn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-dim hover:text-green-primary transition-colors duration-200"
                aria-label={`${member.name} on LinkedIn`}
              >
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            {member.github && (
              <a
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-dim hover:text-green-primary transition-colors duration-200"
                aria-label={`${member.name} on GitHub`}
              >
                <Github className="h-4 w-4" />
              </a>
            )}
            {member.twitter && (
              <a
                href={member.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-dim hover:text-green-primary transition-colors duration-200"
                aria-label={`${member.name} on Twitter`}
              >
                <Twitter className="h-4 w-4" />
              </a>
            )}
            {member.website && (
              <a
                href={member.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-dim hover:text-green-primary transition-colors duration-200"
                aria-label={`${member.name}'s website`}
              >
                <Globe className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
