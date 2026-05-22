import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Github, Linkedin, Twitter, Globe } from "lucide-react"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { getTeamMembers, type TeamMemberView } from "@/lib/data"

export const revalidate = 1800

export const metadata: Metadata = {
  title: "The team behind CCK | Claude Community Kenya",
  description:
    "Meet the organizers, ambassadors, and contributors who run Claude Community Kenya — Africa's first Claude developer community.",
  alternates: { canonical: "https://www.claudekenya.org/team" },
  openGraph: {
    title: "The team behind CCK | Claude Community Kenya",
    description:
      "Meet the organizers and ambassadors running Africa's first Claude developer community.",
    url: "https://www.claudekenya.org/team",
    siteName: "Claude Community Kenya",
    type: "website",
  },
}

export default async function TeamPage() {
  const members = await getTeamMembers().catch(() => [])

  return (
    <main className="min-h-screen px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Team" }]} />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 35% at 50% -10%, rgba(217, 119, 87, 0.08), transparent 60%),
            radial-gradient(ellipse 50% 40% at 90% 60%, rgba(106, 155, 204, 0.05), transparent 65%)
          `,
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <section className="mb-14 text-center">
          <div className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#2a2a28] bg-[#1e1e1d]/60 px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[#b0aea5] backdrop-blur-sm">
              <img src="/images/claude-sparkle.svg" alt="" className="h-3 w-3" />
              <span>The Team</span>
            </span>
          </div>

          <h1
            className="mb-5 text-[42px] font-medium text-[#faf9f5] sm:text-[56px] lg:text-[64px]"
            style={{
              fontFamily: 'var(--font-display), ui-serif, Georgia, serif',
              letterSpacing: "-0.025em",
            }}
          >
            The people behind CCK
          </h1>

          <p className="mx-auto max-w-xl text-[17px] leading-relaxed text-[#b0aea5]">
            Organisers, ambassadors, and contributors making Africa's first
            Claude developer community real — one meetup at a time.
          </p>
        </section>

        {members.length === 0 ? (
          <EmptyState />
        ) : (
          <section
            aria-label="Team members"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {members.map((m) => (
              <MemberCard key={m.slug ?? m.name} member={m} />
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

function MemberCard({ member }: { member: TeamMemberView }) {
  const inner = (
    <article className="card-elevated group flex h-full flex-col gap-4 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[#2a2a28] bg-[#1e1e1d]">
          {member.avatar ? (
            <Image
              src={member.avatar}
              alt={member.name}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[20px] font-medium text-[#b0aea5]">
              {initials(member.name)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-medium text-[#faf9f5]">
            {member.name}
          </h2>
          <p className="truncate text-[13px] text-[#b0aea5]">{member.role}</p>
        </div>
      </div>

      {member.tagline && (
        <p
          className="text-[15px] leading-snug text-[#faf9f5]"
          style={{
            fontFamily: 'var(--font-display), ui-serif, Georgia, serif',
            fontStyle: "italic",
          }}
        >
          "{member.tagline}"
        </p>
      )}

      <p className="line-clamp-3 text-[14px] leading-relaxed text-[#b0aea5]">
        {member.bio}
      </p>

      <div className="mt-auto flex items-center justify-between pt-2">
        <SocialIcons member={member} />
        {member.location && (
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#7a7870]">
            {member.location}
          </span>
        )}
      </div>
    </article>
  )

  return member.slug ? (
    <Link
      href={`/team/${member.slug}`}
      aria-label={`Read more about ${member.name}`}
      className="rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]"
    >
      {inner}
    </Link>
  ) : (
    inner
  )
}

function SocialIcons({ member }: { member: TeamMemberView }) {
  const links: Array<{ href: string; label: string; Icon: typeof Github }> = []
  if (member.github) links.push({ href: member.github, label: "GitHub", Icon: Github })
  if (member.linkedIn) links.push({ href: member.linkedIn, label: "LinkedIn", Icon: Linkedin })
  if (member.twitter) links.push({ href: member.twitter, label: "Twitter / X", Icon: Twitter })
  if (member.website) links.push({ href: member.website, label: "Website", Icon: Globe })

  if (links.length === 0) {
    return <span className="text-[11px] uppercase tracking-[0.14em] text-[#3a3a37]">—</span>
  }

  return (
    <div className="flex items-center gap-1">
      {links.map(({ href, label, Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${member.name} on ${label}`}
          onClick={(e) => e.stopPropagation()}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#b0aea5] transition-colors hover:bg-[#2a2a28] hover:text-[#faf9f5]"
        >
          <Icon className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-[#2a2a28] bg-[#1e1e1d]/40 p-10 text-center">
      <p className="text-[15px] text-[#b0aea5]">
        Team profiles ship soon. In the meantime, follow along on{" "}
        <a
          href="https://discord.gg/CkD9QWjsHm"
          target="_blank"
          rel="noopener noreferrer"
          className="link-refined"
        >
          Discord
        </a>
        .
      </p>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
