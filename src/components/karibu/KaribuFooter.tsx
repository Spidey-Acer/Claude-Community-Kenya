/**
 * KaribuFooter — dark footer for the warm-light "Karibu" identity.
 *
 * Rendered on converted routes only. Links resolve to real app routes and
 * the canonical social URLs in constants.ts. Cities reflect genuinely active
 * locations (Nairobi + Mombasa) — no inflated claims.
 */

import Link from "next/link";
import Image from "next/image";
import { SOCIAL_LINKS } from "@/lib/constants";

const EXPLORE = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Learn", href: "/resources" },
  { label: "Community", href: "/community" },
  { label: "About", href: "/about" },
];

const COMMUNITY = [
  { label: "WhatsApp", href: SOCIAL_LINKS.whatsapp },
  { label: "Discord", href: SOCIAL_LINKS.discord },
  { label: "Twitter / X", href: SOCIAL_LINKS.twitter },
  { label: "GitHub", href: SOCIAL_LINKS.github },
];

export function KaribuFooter() {
  return (
    <footer className="bg-ink text-[#E9E0D2]">
      <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-8 px-6 pt-14 md:px-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        {/* Brand */}
        <div className="col-span-2 lg:col-span-1">
          <div className="mb-4 flex items-center gap-3">
            <Image
              src="/images/cck-logo.webp"
              alt="Claude Community Kenya"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full"
            />
            <span className="font-newsreader text-[19px] font-semibold text-paper">
              Claude Community Kenya
            </span>
          </div>
          <p className="mb-5 max-w-[320px] font-inter text-[14.5px] leading-relaxed text-[#A79E90]">
            The free, founder-led community for people in Kenya learning and
            building with Claude. Karibu.
          </p>
          <a
            href={SOCIAL_LINKS.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-clay px-[22px] py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
          >
            Join the community
          </a>
        </div>

        <FooterColumn title="Explore">
          {EXPLORE.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-paper">
              {l.label}
            </Link>
          ))}
        </FooterColumn>

        <FooterColumn title="Community">
          {COMMUNITY.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-paper"
            >
              {l.label}
            </a>
          ))}
        </FooterColumn>

        <FooterColumn title="Cities">
          <span>Nairobi</span>
          <span>Mombasa</span>
        </FooterColumn>
      </div>

      <div className="mx-auto max-w-[1180px] px-6 pb-9 pt-10 md:px-10">
        <p className="mb-5 max-w-[780px] font-inter text-[12.5px] leading-relaxed text-[#8A7F6E]">
          Independently operated. Anthropic-supported via the Claude Community
          Ambassadors program (event funding + API credits). Views expressed
          here are community-held, not official Anthropic positions. &ldquo;Claude&rdquo;
          is a trademark of Anthropic PBC.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#3B352D] pt-6">
          <div className="font-inter text-[13px] text-[#8A7F6E]">
            © 2026 Claude Community Kenya · A community, not a product.
          </div>
          <div className="font-inter text-[13px] text-[#8A7F6E]">
            Built by the community, for the community.
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3.5 font-inter text-xs font-bold uppercase tracking-[0.14em] text-[#8A7F6E]">
        {title}
      </div>
      <div className="flex flex-col gap-2 font-inter text-[14.5px] leading-[2.1] text-[#C7BEB0]">
        {children}
      </div>
    </div>
  );
}
