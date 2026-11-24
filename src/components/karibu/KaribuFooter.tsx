/**
 * KaribuFooter: dark footer for the warm-light "Karibu" identity.
 *
 * Spec S1: Get involved, FAQ, Code of conduct, Your data, a newsletter
 * sign-up, socials, and the line "an independent, volunteer-run community".
 * Link targets live in `footer-links.ts`. Social URLs come from
 * `useSocialLinks()` (admin-configured, falling back to constants); a
 * platform with no URL is omitted entirely, never a dead link.
 *
 * Always dark, in every theme and persona. It uses the fixed `--footer-*`
 * tokens from globals.css, not `--ink`/`--paper`/`--clay`, which flip in dark
 * mode. The footer is brand chrome, not page content, so its palette is pinned.
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { useSocialLinks } from "@/contexts/SocialLinksContext";
import { KaribuNewsletterForm } from "@/components/karibu/KaribuNewsletterForm";
import { FOOTER_EXPLORE, FOOTER_GET_INVOLVED } from "@/components/karibu/footer-links";

const LINK_CLASS = "transition-colors hover:text-footer-accent";
const ITEM_CLASS = "flex min-h-11 items-center";

export function KaribuFooter() {
  const links = useSocialLinks();
  const socials = [
    { label: "WhatsApp", href: links.whatsapp },
    { label: "Discord", href: links.discord },
    { label: "Twitter / X", href: links.twitter },
    { label: "LinkedIn", href: links.linkedin },
    { label: "Instagram", href: links.instagram },
    { label: "YouTube", href: links.youtube },
    { label: "GitHub", href: links.github },
  ].filter((social): social is { label: string; href: string } => Boolean(social.href));

  return (
    <footer className="bg-footer-bg text-footer-text">
      <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-8 px-6 pt-14 md:px-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div className="col-span-2 lg:col-span-1">
          <div className="mb-4 flex items-center gap-3">
            <Image
              src="/images/cck-logo.webp"
              alt="Claude Community Kenya"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full"
            />
            <span className="font-newsreader text-[19px] font-semibold text-footer-text">
              Claude Community Kenya
            </span>
          </div>
          <p className="max-w-[320px] font-inter text-[14.5px] leading-relaxed text-footer-text-muted">
            An independent, volunteer-run community for people in Kenya learning
            and building with Claude. Karibu.
          </p>
        </div>

        <FooterColumn title="Explore">
          {FOOTER_EXPLORE.map((link) => (
            <li key={link.href} className={ITEM_CLASS}>
              <Link href={link.href} className={LINK_CLASS}>{link.label}</Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Get involved">
          {FOOTER_GET_INVOLVED.map((link) => (
            <li key={link.href} className={ITEM_CLASS}>
              <Link href={link.href} className={LINK_CLASS}>{link.label}</Link>
            </li>
          ))}
        </FooterColumn>

        <FooterColumn title="Follow">
          {socials.map((social) => (
            <li key={social.label} className={ITEM_CLASS}>
              <a href={social.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                {social.label}
              </a>
            </li>
          ))}
        </FooterColumn>
      </div>

      <div className="mx-auto max-w-[1180px] px-6 pt-10 md:px-10">
        <KaribuNewsletterForm />
      </div>

      <div className="mx-auto max-w-[1180px] px-6 pb-9 pt-10 md:px-10">
        <p className="mb-5 max-w-[780px] font-inter text-[12.5px] leading-relaxed text-footer-text-faint">
          Independently operated. Anthropic-supported via the Claude Community
          Ambassadors program (event funding + API credits). Views expressed
          here are community-held, not Anthropic&apos;s positions. &ldquo;Claude&rdquo;
          is a trademark of Anthropic PBC.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-footer-border pt-6">
          <div className="font-inter text-[13px] text-footer-text-faint">
            © 2026 Claude Community Kenya · A community, not a product.
          </div>
          <div className="font-inter text-[13px] text-footer-text-faint">
            Built by the community, for the community.
          </div>
        </div>
      </div>
    </footer>
  );
}

/** One footer column: a heading over a real list; children are <li> items. */
function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3.5 font-inter text-xs font-bold uppercase tracking-[0.14em] text-footer-text-faint">
        {title}
      </div>
      <ul className="flex flex-col font-inter text-[14.5px] text-footer-text-soft">{children}</ul>
    </div>
  );
}
