import type { Metadata } from "next";
import Link from "next/link";
import { TerminalWindow, CommandPrefix } from "@/components/terminal";
import { SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "404 — Page Not Found | Claude Community Kenya",
  description: "The page you're looking for doesn't exist. Navigate back to Claude Community Kenya.",
};

const navLinks = [
  { label: "HOME", href: "/" },
  { label: "EVENTS", href: "/events" },
  { label: "RESOURCES", href: "/resources" },
];

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-xl">
        <TerminalWindow title="bash — 404" variant="command" glowing>
          <div className="space-y-4">
            {/* Command attempt */}
            <div>
              <p className="text-text-primary">
                <CommandPrefix />
                cd /requested-page
              </p>
              <p className="mt-1 text-red">
                bash: /requested-page: No such file or directory
              </p>
            </div>

            {/* Error message */}
            <div className="border-t border-border-default pt-4">
              <p className="text-lg font-bold text-amber">
                ERROR 404: Page not found.
              </p>
              <p className="mt-2 font-sans text-text-secondary">
                Looks like this route doesn&apos;t exist.
              </p>
              <p className="mt-1 font-sans text-text-dim">
                Maybe try one of these:
              </p>
            </div>

            {/* Navigation links */}
            <nav
              className="space-y-2 pt-2"
              aria-label="Suggested pages"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-2 text-green-primary transition-colors hover:text-amber"
                >
                  <span className="text-green-dim group-hover:text-amber" aria-hidden="true">
                    &gt;
                  </span>
                  <span className="underline underline-offset-2">{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* Discord link */}
            <div className="border-t border-border-default pt-4">
              <p className="font-sans text-sm text-text-dim">
                Or report this bug on{" "}
                <a
                  href={SOCIAL_LINKS.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan underline underline-offset-2 transition-colors hover:text-green-primary"
                >
                  Discord
                </a>
                .
              </p>
            </div>
          </div>
        </TerminalWindow>
      </div>
    </main>
  );
}
