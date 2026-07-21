import type { Metadata } from "next";
import Link from "next/link";
import { SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "404 — Page Not Found | Claude Community Kenya",
  description: "The page you're looking for doesn't exist. Navigate back to Claude Community Kenya.",
};

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Learn", href: "/resources" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-paper px-6 py-24">
      <div className="w-full max-w-xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-clay">
          404 · Pole sana
        </p>
        <h1 className="mt-4 font-newsreader text-4xl leading-tight text-ink sm:text-5xl">
          This page wandered off.
        </h1>
        <p className="mt-4 font-inter text-[15.5px] leading-[1.7] text-ink-soft">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Try one of these instead:
        </p>

        <nav className="mt-8 flex flex-wrap gap-3" aria-label="Suggested pages">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-sand bg-paper-card px-5 py-2.5 font-inter text-sm font-semibold text-ink transition-colors hover:border-clay hover:text-clay"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="mt-10 border-t border-sand pt-6 font-inter text-sm text-ink-muted">
          Think this is a broken link?{" "}
          <a
            href={SOCIAL_LINKS.discord}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-clay underline underline-offset-2 hover:text-clay-dark"
          >
            Tell us on Discord
          </a>
          .
        </p>
      </div>
    </div>
  );
}
