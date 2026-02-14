import Link from "next/link";
import { TerminalWindow, CommandPrefix } from "@/components/terminal";
import { SOCIAL_LINKS } from "@/lib/constants";

const navLinks = [
  { label: "HOME", href: "/" },
  { label: "EVENTS", href: "/events" },
  { label: "RESOURCES", href: "/resources" },
];

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <TerminalWindow title="bash — 404" variant="command" glowing>
          <div className="space-y-4">
            {/* Command attempt */}
            <div>
              <p className="text-text-primary">
                <CommandPrefix />
                cd /requested-page
              </p>
              <p className="text-red mt-1">
                bash: /requested-page: No such file or directory
              </p>
            </div>

            {/* Error message */}
            <div className="border-t border-border-default pt-4">
              <p className="text-amber font-bold text-lg">
                ERROR 404: Page not found.
              </p>
              <p className="text-text-secondary mt-2 font-sans">
                Looks like this route doesn&apos;t exist.
              </p>
              <p className="text-text-dim mt-1 font-sans">
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
                  className="flex items-center gap-2 text-green-primary hover:text-amber transition-colors group"
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
              <p className="text-text-dim font-sans text-sm">
                Or report this bug on{" "}
                <a
                  href={SOCIAL_LINKS.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan hover:text-green-primary transition-colors underline underline-offset-2"
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
