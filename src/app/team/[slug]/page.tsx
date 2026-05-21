import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { notFound } from "next/navigation"
import { ArrowLeft, Github, Linkedin, Twitter, Globe, MapPin } from "lucide-react"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { getTeamMemberBySlug, getTeamMemberSlugs } from "@/lib/data"

export const revalidate = 1800

export async function generateStaticParams() {
  const slugs = await getTeamMemberSlugs().catch(() => [])
  return slugs.map((slug) => ({ slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: PageProps,
): Promise<Metadata> {
  const { slug } = await params
  const member = await getTeamMemberBySlug(slug)
  if (!member) return { title: "Member not found" }

  const title = `${member.name} — ${member.role} | Claude Community Kenya`
  const description = member.tagline ?? member.bio.slice(0, 160)
  const url = `https://www.claudekenya.org/team/${slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Claude Community Kenya",
      type: "profile",
      images: member.avatar ? [{ url: member.avatar }] : undefined,
    },
  }
}

export default async function TeamMemberPage({ params }: PageProps) {
  const { slug } = await params
  const member = await getTeamMemberBySlug(slug)
  if (!member) notFound()

  const paragraphs = (member.longBio ?? member.bio).split(/\n{2,}/)

  return (
    <main className="min-h-screen px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Team", url: "/team" },
          { name: member.name },
        ]}
      />

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

      <div className="relative mx-auto max-w-3xl">
        <Link
          href="/team"
          className="mb-10 inline-flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-[#b0aea5] transition-colors hover:text-[#faf9f5]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All team
        </Link>

        <header className="mb-10 flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
          <div className="relative mb-6 h-28 w-28 shrink-0 overflow-hidden rounded-full border border-[#2a2a28] bg-[#1e1e1d] sm:mb-0 sm:mr-8 sm:h-32 sm:w-32">
            {member.avatar ? (
              <Image
                src={member.avatar}
                alt={member.name}
                fill
                sizes="128px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[28px] font-medium text-[#b0aea5]">
                {initials(member.name)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1
              className="mb-3 text-[36px] font-medium leading-tight text-[#faf9f5] sm:text-[44px]"
              style={{
                fontFamily: 'var(--font-display), ui-serif, Georgia, serif',
                letterSpacing: "-0.02em",
              }}
            >
              {member.name}
            </h1>

            <p className="mb-3 text-[15px] text-[#d97757]">{member.role}</p>

            {member.tagline && (
              <p
                className="mb-4 text-[17px] leading-snug text-[#faf9f5]"
                style={{
                  fontFamily: 'var(--font-display), ui-serif, Georgia, serif',
                  fontStyle: "italic",
                }}
              >
                "{member.tagline}"
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-start">
              {member.location && (
                <span className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.14em] text-[#7a7870]">
                  <MapPin className="h-3 w-3" />
                  {member.location}
                </span>
              )}
              <Socials member={member} />
            </div>
          </div>
        </header>

        <section
          aria-label="Biography"
          className="card-elevated rounded-3xl p-8 sm:p-10"
        >
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="mb-4 text-[16px] leading-relaxed text-[#b0aea5] last:mb-0"
            >
              {p}
            </p>
          ))}
        </section>

        <section className="mt-12 text-center">
          <p className="mb-4 text-[12px] uppercase tracking-[0.14em] text-[#7a7870]">
            Want to join the team?
          </p>
          <Link
            href="/volunteer"
            className="inline-flex items-center gap-2 rounded-full bg-[#d97757] px-6 py-3 text-[14px] font-medium text-[#faf9f5] transition-transform hover:-translate-y-0.5 btn-primary-shadow"
          >
            Volunteer with CCK
          </Link>
        </section>
      </div>
    </main>
  )
}

function Socials({ member }: { member: NonNullable<Awaited<ReturnType<typeof getTeamMemberBySlug>>> }) {
  const links: Array<{ href: string; label: string; Icon: typeof Github }> = []
  if (member.github) links.push({ href: member.github, label: "GitHub", Icon: Github })
  if (member.linkedIn) links.push({ href: member.linkedIn, label: "LinkedIn", Icon: Linkedin })
  if (member.twitter) links.push({ href: member.twitter, label: "Twitter / X", Icon: Twitter })
  if (member.website) links.push({ href: member.website, label: "Website", Icon: Globe })
  if (links.length === 0) return null

  return (
    <div className="flex items-center gap-1">
      {links.map(({ href, label, Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${member.name} on ${label}`}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#b0aea5] transition-colors hover:bg-[#2a2a28] hover:text-[#faf9f5]"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
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
