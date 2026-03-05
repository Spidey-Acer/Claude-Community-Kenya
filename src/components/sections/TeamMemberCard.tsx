import type { TeamMemberView } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Linkedin, Github, Twitter, Globe } from "lucide-react";

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
  const hasSocials = member.linkedIn || member.github || member.twitter || member.website;

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
          {/* Avatar placeholder with initials */}
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-green-primary/30 bg-green-primary/10"
            aria-hidden="true"
          >
            <span className="font-mono text-lg font-bold text-green-primary">
              {getInitials(member.name)}
            </span>
          </div>

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
