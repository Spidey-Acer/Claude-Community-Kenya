"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { FOOTER_SECTIONS, SITE_CONFIG, CONTACT, SOCIAL_LINKS } from "@/lib/constants";
import { usePersona } from "@/contexts/PersonaContext";

export function Footer() {
  const { persona } = usePersona();
  const isPro = persona === "pro";
  const [exitHovered, setExitHovered] = useState(false);
  const [email, setEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "success" | "error">("idle");
  const [newsletterMsg, setNewsletterMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const [csrfToken, setCsrfToken] = useState("");
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setNewsletterStatus("idle");

    startTransition(async () => {
      try {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        if (!res.ok) {
          setNewsletterStatus("error");
          setNewsletterMsg(json.error || "Failed to subscribe.");
          return;
        }
        setNewsletterStatus("success");
        setNewsletterMsg(json.message);
        setEmail("");
      } catch {
        setNewsletterStatus("error");
        setNewsletterMsg("Network error. Please try again.");
      }
    });
  }

  return (
    <footer className="border-t border-border-default bg-bg-secondary" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Terminal window top bar — Dev only */}
        {!isPro && (
          <div className="flex items-center gap-2 border-b border-border-default py-3">
            <span className="h-3 w-3 rounded-full bg-red" />
            <span className="h-3 w-3 rounded-full bg-amber" />
            <span className="h-3 w-3 rounded-full bg-green-primary" />
            <span className="ml-3 font-mono text-xs text-text-dim">
              footer.tsx — claude-community-kenya
            </span>
          </div>
        )}

        {/* Footer content grid */}
        <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand section */}
          <div>
            <h3 className={isPro ? "text-sm font-semibold text-text-primary" : "font-mono text-sm font-bold text-green-primary"}>
              {isPro ? SITE_CONFIG.shortName : `┌── ${SITE_CONFIG.shortName}`}
            </h3>
            <p className="mt-3 text-sm text-text-secondary">
              {SITE_CONFIG.description}
            </p>
            <div className="mt-4 font-mono text-xs text-text-dim">
              <p>📍 {CONTACT.city}</p>
              <p>✉ {CONTACT.email}</p>
            </div>

            {/* Newsletter */}
            <form onSubmit={handleNewsletterSubmit} className="mt-5">
              <p className="font-mono text-[11px] text-text-dim mb-2">Stay updated:</p>
              <div className="flex gap-1.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  className="flex-1 min-w-0 bg-bg-card border border-border-default rounded px-2.5 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 transition-colors"
                  aria-label="Newsletter email"
                />
                <button
                  type="submit"
                  disabled={isPending || !csrfToken}
                  className="px-3 py-1.5 bg-green-primary/10 border border-green-primary/30 rounded font-mono text-xs font-semibold text-green-primary hover:bg-green-primary/20 transition-all disabled:opacity-50"
                >
                  {isPending ? "..." : "Subscribe"}
                </button>
              </div>
              {newsletterStatus !== "idle" && (
                <p className={`mt-1.5 font-mono text-[10px] ${newsletterStatus === "success" ? "text-green-primary" : "text-red"}`}>
                  {newsletterMsg}
                </p>
              )}
            </form>
          </div>

          {/* Link sections */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className={isPro ? "text-sm font-semibold text-text-primary" : "font-mono text-sm font-bold text-text-primary"}>
                {isPro ? section.title : `├── ${section.title}`}
              </h3>
              <ul className="mt-3 space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className={isPro
                        ? "text-sm text-text-secondary transition-colors hover:text-text-primary"
                        : "font-mono text-sm text-text-secondary transition-colors hover:text-green-primary"
                      }
                    >
                      {isPro ? link.label : `│ ${link.label}`}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar with box-drawing characters */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border-default py-6 sm:flex-row">
          <p className={isPro ? "text-xs text-text-dim" : "font-mono text-xs text-text-dim"}>
            {isPro
              ? `© ${currentYear} ${SITE_CONFIG.name}. Built with Claude.`
              : `└── © ${currentYear} ${SITE_CONFIG.name}. Built with ❤️ and Claude Code`}
          </p>

          {/* Social links */}
          <div className="flex items-center gap-4">
            <a
              href={SOCIAL_LINKS.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className={isPro ? "text-xs text-text-dim transition-colors hover:text-text-primary" : "font-mono text-xs text-text-dim transition-colors hover:text-cyan"}
              aria-label="Twitter"
            >
              Twitter
            </a>
            <a
              href={SOCIAL_LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className={isPro ? "text-xs text-text-dim transition-colors hover:text-text-primary" : "font-mono text-xs text-text-dim transition-colors hover:text-cyan"}
              aria-label="GitHub"
            >
              GitHub
            </a>
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              className={isPro ? "text-xs text-text-dim transition-colors hover:text-text-primary" : "font-mono text-xs text-text-dim transition-colors hover:text-cyan"}
              aria-label="Discord"
            >
              Discord
            </a>
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className={isPro ? "text-xs text-text-dim transition-colors hover:text-text-primary" : "font-mono text-xs text-text-dim transition-colors hover:text-cyan"}
              aria-label="WhatsApp"
            >
              WhatsApp
            </a>
          </div>

          {/* Exit easter egg — Dev only */}
          {!isPro && (
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
          )}
        </div>
      </div>
    </footer>
  );
}
