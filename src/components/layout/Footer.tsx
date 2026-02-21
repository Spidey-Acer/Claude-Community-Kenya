"use client";

import { useState } from "react";
import Link from "next/link";
import { FOOTER_SECTIONS, SITE_CONFIG, CONTACT, SOCIAL_LINKS } from "@/lib/constants";

export function Footer() {
  const [exitHovered, setExitHovered] = useState(false);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border-default bg-bg-secondary" role="contentinfo">
      {/* Terminal window top bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 border-b border-border-default py-3">
          <span className="h-3 w-3 rounded-full bg-red" />
          <span className="h-3 w-3 rounded-full bg-amber" />
          <span className="h-3 w-3 rounded-full bg-green-primary" />
          <span className="ml-3 font-mono text-xs text-text-dim">
            footer.tsx — claude-community-kenya
          </span>
        </div>

        {/* Footer content grid */}
        <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand section */}
          <div>
            <h3 className="font-mono text-sm font-bold text-green-primary">
              ┌── {SITE_CONFIG.shortName}
            </h3>
            <p className="mt-3 text-sm text-text-secondary">
              {SITE_CONFIG.description}
            </p>
            <div className="mt-4 font-mono text-xs text-text-dim">
              <p>📍 {CONTACT.city}</p>
              <p>✉ {CONTACT.email}</p>
            </div>
          </div>

          {/* Link sections */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="font-mono text-sm font-bold text-text-primary">
                ├── {section.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="font-mono text-sm text-text-secondary transition-colors hover:text-green-primary"
                    >
                      │ {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar with box-drawing characters */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border-default py-6 sm:flex-row">
          <p className="font-mono text-xs text-text-dim">
            └── © {currentYear} {SITE_CONFIG.name}. Built with ❤️ and Claude
            Code
          </p>

          {/* Social links */}
          <div className="flex items-center gap-4">
            <a
              href={SOCIAL_LINKS.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-text-dim transition-colors hover:text-cyan"
              aria-label="Twitter"
            >
              Twitter
            </a>
            <a
              href={SOCIAL_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-text-dim transition-colors hover:text-cyan"
              aria-label="GitHub"
            >
              GitHub
            </a>
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-text-dim transition-colors hover:text-cyan"
              aria-label="Discord"
            >
              Discord
            </a>
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-text-dim transition-colors hover:text-cyan"
              aria-label="WhatsApp"
            >
              WhatsApp
            </a>
          </div>

          {/* Exit easter egg */}
          <span
            className="cursor-pointer font-mono text-xs text-text-dim transition-colors hover:text-amber"
            onMouseEnter={() => setExitHovered(true)}
            onMouseLeave={() => setExitHovered(false)}
            role="presentation"
            title="You can check out any time you like, but you can never leave."
          >
            {exitHovered
              ? "You can check out any time you like, but you can never leave."
              : "$ exit"}
          </span>
        </div>
      </div>
    </footer>
  );
}
