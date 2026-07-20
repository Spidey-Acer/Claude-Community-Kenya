/**
 * Seed script — Claude Community Kenya
 * Migrates existing static data files into the database.
 * Run: npx prisma db seed
 */

import { PrismaClient, EventType, EventStatus, BlogStatus } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import "dotenv/config"
import { TEAM_ROSTER } from "./team-roster"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Seeding Claude Community Kenya database...")

  // ─── Admin User ───────────────────────────────────────────────────────────
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "changeme123!"
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  const admin = await prisma.user.upsert({
    where: { email: "claudecommunitykenya@gmail.com" },
    update: {},
    create: {
      email: "claudecommunitykenya@gmail.com",
      passwordHash,
      role: "SUPER_ADMIN",
      firstName: "Peter",
      lastName: "Kibet",
      active: true,
      emailVerified: true,
    },
  })
  console.log(`✅ Admin user: ${admin.email}`)

  // ─── Events ───────────────────────────────────────────────────────────────
  const eventsData = [
    {
      slug: "kenyas-first-claude-code-meetup",
      title: "Kenya's First Claude Code Meetup",
      date: new Date("2026-01-24T14:00:00+03:00"),
      time: "2:00 PM - 5:00 PM EAT",
      venue: "iHiT Events Space, Westlands",
      city: "Nairobi",
      type: EventType.MEETUP,
      status: EventStatus.COMPLETED,
      description:
        "The one that started it all. 30 developers in a room, one CLI, and a lot of curiosity.",
      fullDescription:
        "On January 24, 2026, history was made as Kenya hosted its very first Claude Code meetup. Over 30 developers from across Nairobi gathered at iHiT Events Space in Westlands for an afternoon of networking, interaction, and a live Claude Code demo.\n\nThe event was a community gathering where members talked, connected, and explored the possibilities of AI-assisted development. Peter Kibet showcased his Claude Code workflow with a live project demo — showing what developers can build with these tools.\n\nThis meetup marked the birth of Claude Community Kenya and set the foundation for what would become Africa's most vibrant AI developer community.",
      agenda: [
        "2:00 PM — Doors Open & Registration",
        "2:30 PM — Welcome & Community Introduction",
        "3:00 PM — Claude Code Workflow Demo",
        "3:45 PM — Open Discussion & Q&A",
        "4:15 PM — Lightning Talks & Open Floor",
        "4:45 PM — Networking",
        "5:00 PM — Close",
      ],
      lumaUrl: "https://luma.com/sbsa789m",
      host: "Peter Kibet",
      highlights: [
        "30+ developers attended",
        "First-ever Claude Code demo in Africa",
        "Community connections and collaborations formed",
      ],
      attendeeCount: 30,
      featured: true,
    },
    {
      slug: "nairobi-meetup-2-deep-dive",
      title: "Nairobi Meetup #2 — Deep Dive",
      date: new Date("2026-02-20T14:00:00+03:00"),
      time: "2:00 PM - 5:00 PM EAT",
      venue: "Nairobi",
      city: "Nairobi",
      type: EventType.MEETUP,
      status: EventStatus.COMPLETED,
      description:
        "Our second Nairobi meetup! Deep dive into Claude Code workflows, multi-instance development, and community project updates.",
      fullDescription:
        "The second Claude Community Kenya meetup in Nairobi brought developers together for a deeper look at Claude Code workflows, multi-instance development, and agentic patterns.\n\nBuilding on the momentum from the first meetup, this session featured hands-on exploration and real-world project discussions from community members.",
      agenda: [
        "2:00 PM — Doors Open & Networking",
        "2:30 PM — Welcome & Community Updates",
        "3:00 PM — Workshop: Multi-Instance Claude Code Development",
        "4:00 PM — Community Project Showcases",
        "4:30 PM — Open Networking & Collaboration",
        "5:00 PM — Close",
      ],
      lumaUrl: "https://luma.com/sbsa789m",
      host: "Peter Kibet",
      highlights: [
        "Second CCK Nairobi meetup",
        "Deep dive into Claude Code workflows",
        "Community project showcases",
      ],
      featured: false,
    },
    {
      slug: "mombasa-ai-career-talk",
      title: "Mombasa AI & Career Talk",
      date: new Date("2026-02-28T10:00:00+03:00"),
      time: "10:00 AM - 1:00 PM EAT",
      venue: "Assembly Hall, Institute of Computing and Informatics",
      city: "Mombasa",
      type: EventType.CAREER_TALK,
      status: EventStatus.COMPLETED,
      description:
        "Our first university event! A career talk at Technical University of Mombasa exploring AI opportunities, Claude Code, and how students can start building with AI today.",
      fullDescription:
        "Claude Community Kenya headed to Mombasa for our very first university event! In partnership with the Technical University of Mombasa and Swahilipot Hub Foundation, we brought an inspiring career talk on AI and development opportunities.\n\nThis event was designed specifically for university students and early-career developers. We covered what AI means for the future of software development in Kenya, how to get started with Claude and Claude Code, and the career opportunities emerging in the AI space.",
      agenda: [
        "10:00 AM — Registration & Welcome",
        "10:30 AM — Keynote: AI & The Future of Software Development in Kenya",
        "11:15 AM — Demo: Getting Started with Claude Code",
        "12:00 PM — Panel: Career Opportunities in AI",
        "12:30 PM — Q&A & Open Discussion",
        "1:00 PM — Close & Networking",
      ],
      registrationUrl: "https://luma.com/vsf5re14",
      lumaUrl: "https://luma.com/vsf5re14",
      host: "Dr. Fullgence Mwakondo & Joshua Wekesa",
      partnerOrg: "Technical University of Mombasa, Swahilipot Hub Foundation",
      featured: false,
    },
    {
      slug: "claude-code-hackathon-nairobi-1",
      title: "Claude Code Hackathon — Nairobi",
      date: new Date("2026-04-04T08:00:00+03:00"),
      time: "8:00 AM – 6:00 PM EAT",
      venue: "TBA — Nairobi",
      city: "Nairobi",
      type: EventType.HACKATHON,
      status: EventStatus.UPCOMING,
      description:
        "Africa's first Claude hackathon — build anything with Claude in one day, solo or as a team of up to three.",
      fullDescription:
        "Claude Community Kenya presents its first-ever hackathon — a full-day, in-person building sprint for developers across Nairobi. Whether you're coming solo or with a team of up to three, this is your chance to ship something real using Claude's API and Claude Code in a single day.\n\nThe build is open — no prescribed theme, no prescribed industry. If you can use Claude to solve a problem, tell a story, automate a workflow, or create something entirely new, it qualifies. Projects will be judged on real-world impact, technical execution, innovation, and how well teams demo their work.\n\nThe winner walks away with a Claude Code Max subscription. All registered participants receive CCK T-shirts and stickers.",
      agenda: [
        "08:00 AM — Registration & Check-in",
        "08:30 AM — Opening Remarks + Rules Briefing",
        "09:00 AM — Claude API / Claude Code Quick-Start Orientation",
        "09:15 AM — Build Sprint Part 1 Begins",
        "02:00 PM — Lunch Break",
        "02:30 PM — Build Sprint Part 2",
        "04:30 PM — Project Submission Cutoff",
        "05:00 PM — Live Demos & Judging",
        "06:00 PM — Awards, Closing Remarks & Networking",
      ],
      host: "Peter Kibet",
      highlights: [
        "Africa's first Claude hackathon",
        "Open build format — any domain, as long as Claude powers it",
        "Winner takes home a Claude Code Max subscription",
      ],
      prizes: [
        "1st Place — Claude Code Max subscription",
        "All Participants — CCK T-shirt + stickers",
      ],
      rules: [
        "All projects must use the Claude API or Claude Code",
        "Solo participants or teams of up to 3 people",
        "Projects must be demoed live at the end of the day",
        "All intellectual property remains fully owned by the builder(s)",
        "CCK Code of Conduct applies — respectful behaviour, zero harassment",
      ],
      featured: true,
    },
  ]

  for (const event of eventsData) {
    await prisma.event.upsert({
      where: { slug: event.slug },
      update: {},
      create: event,
    })
  }
  console.log(`✅ Events: ${eventsData.length} seeded`)

  // ─── Meetup Photos ────────────────────────────────────────────────────────
  // Placeholder photos using Unsplash community / tech imagery. Replace with
  // real meetup photos by writing rows directly to the meetup_photos table or
  // through the admin UI once the photos manager ships.
  const firstMeetup = await prisma.event.findUnique({
    where: { slug: "kenyas-first-claude-code-meetup" },
    select: { id: true },
  })
  const secondMeetup = await prisma.event.findUnique({
    where: { slug: "claude-for-everyone-nairobi" },
    select: { id: true },
  })

  const photosData: Array<{
    eventId: string | null
    url: string
    thumbnailUrl: string | null
    alt: string
    caption: string
    photographer: string | null
    featured: boolean
    order: number
  }> = []

  if (firstMeetup) {
    const meetupOnePhotos = [
      { url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80", caption: "Packed room at iHiT Events Space.", featured: true },
      { url: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?auto=format&fit=crop&w=1600&q=80", caption: "Demo time — Claude Code on the big screen.", featured: false },
      { url: "https://images.unsplash.com/photo-1559223607-a43c990c692c?auto=format&fit=crop&w=1600&q=80", caption: "Pair-programming with Claude in the corner.", featured: false },
      { url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80", caption: "First-meetup networking over chai.", featured: false },
      { url: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1600&q=80", caption: "Q&A on agentic patterns.", featured: false },
      { url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80", caption: "Group photo after the closing demo.", featured: true },
    ]
    meetupOnePhotos.forEach((p, i) => {
      photosData.push({
        eventId: firstMeetup.id,
        url: p.url,
        thumbnailUrl: p.url.replace("w=1600", "w=600"),
        alt: p.caption,
        caption: p.caption,
        photographer: "Peter Kibet",
        featured: p.featured,
        order: i,
      })
    })
  }

  if (secondMeetup) {
    const meetupTwoPhotos = [
      { url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1600&q=80", caption: "316 Kenyans registered. Rain couldn't stop us.", featured: true },
      { url: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?auto=format&fit=crop&w=1600&q=80", caption: "Live demo: Claude Code shipping a real feature.", featured: false },
      { url: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=1600&q=80", caption: "Lightning talks from community builders.", featured: false },
      { url: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1600&q=80", caption: "Audience Q&A — sharp questions all night.", featured: false },
    ]
    meetupTwoPhotos.forEach((p, i) => {
      photosData.push({
        eventId: secondMeetup.id,
        url: p.url,
        thumbnailUrl: p.url.replace("w=1600", "w=600"),
        alt: p.caption,
        caption: p.caption,
        photographer: "Community contributor",
        featured: p.featured,
        order: i,
      })
    })
  }

  // Wipe + re-seed photos so the sample set stays clean across re-runs. Safe
  // until the admin photo manager ships and real photos start landing — at
  // that point this block should switch to upserts keyed on url.
  if (photosData.length > 0) {
    await prisma.meetupPhoto.deleteMany({})
    await prisma.meetupPhoto.createMany({ data: photosData })
    console.log(`✅ Meetup photos: ${photosData.length} seeded`)
  } else {
    console.log(`⚠ No events found to attach sample photos to — skipped.`)
  }

  // ─── Blog Posts ───────────────────────────────────────────────────────────
  const blogData = [
    {
      slug: "getting-started-with-claude-code",
      title: "Getting Started with Claude Code: A Developer's Guide",
      publishedAt: new Date("2026-02-10"),
      author: "Claude Community Kenya",
      tags: ["claude-code", "tutorial", "getting-started"],
      excerpt:
        "A practical, hands-on guide to installing Claude Code, setting up your first project, and understanding the workflows that make AI-assisted development so powerful.",
      status: BlogStatus.PUBLISHED,
      readingTime: 6,
      featured: false,
    },
    {
      slug: "what-is-claude-community-kenya",
      title: "What is Claude Community Kenya?",
      publishedAt: new Date("2026-02-01"),
      author: "Claude Community Kenya",
      tags: ["community", "introduction", "kenya"],
      excerpt:
        "An introduction to Claude Community Kenya — who we are, what we do, and why we are building Africa's first Claude developer community.",
      status: BlogStatus.PUBLISHED,
      readingTime: 5,
      featured: false,
    },
    {
      slug: "ai-developer-communities-shaping-kenyas-tech-scene",
      title: "How AI Developer Communities Are Shaping Kenya's Tech Scene",
      publishedAt: new Date("2026-02-14"),
      author: "Claude Community Kenya",
      tags: ["ai", "kenya", "developer-community", "tech-ecosystem"],
      excerpt:
        "AI is transforming software development worldwide. In Kenya, developer communities are playing a critical role in making sure local developers are not left behind.",
      status: BlogStatus.PUBLISHED,
      readingTime: 7,
      featured: false,
    },
  ]

  // Blog content is long — store a placeholder; admin can update via dashboard
  for (const post of blogData) {
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        ...post,
        content: `[Content seeded from static data — update via admin dashboard]`,
      },
    })
  }
  console.log(`✅ Blog posts: ${blogData.length} seeded`)

  // ─── Projects ─────────────────────────────────────────────────────────────
  const projectsData = [
    {
      name: "Claude Community Kenya Website",
      builder: "Claude Community Kenya",
      description:
        "This website. Built entirely with Claude Code as a showcase of AI-assisted development. Terminal-noir design, interactive animations, and community content.",
      stack: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
      status: "live",
      demoUrl: "https://www.claudekenya.org",
      repoUrl: "https://github.com/Spidey-Acer/Claude-Community-Kenya",
      featured: true,
    },
    {
      name: "Community Discord Bot",
      builder: "Claude Community Kenya",
      description:
        "An AI-powered Discord bot for the community server. Handles FAQs, event reminders, and resource lookups.",
      stack: ["Node.js", "Discord.js", "Claude API"],
      status: "in-development",
      repoUrl: "https://github.com/Spidey-Acer/CCK-Discord-Bot",
      featured: true,
    },
  ]

  for (const project of projectsData) {
    const existing = await prisma.project.findFirst({
      where: { name: project.name },
    })
    if (!existing) await prisma.project.create({ data: project })
  }
  console.log(`✅ Projects: ${projectsData.length} seeded`)

  // ─── Team Members ─────────────────────────────────────────────────────────
  // Upsert by slug so re-runs backfill the spotlight fields (slug/tagline/
  // location/featured) onto rows that pre-date Phase B.
  //
  // Rows created before the slug column existed have slug = NULL, so an upsert
  // keyed on slug can never match them — it silently creates a second row and
  // the member renders twice on /team. Backfill the slug onto the legacy row
  // by name first so the upsert below has something to match.
  const legacyPeter = await prisma.teamMember.findFirst({
    where: { name: "Peter Kibet", slug: null },
    orderBy: { createdAt: "asc" },
  })
  if (legacyPeter) {
    const slugged = await prisma.teamMember.findUnique({
      where: { slug: "peter-kibet" },
    })
    // A slugged row already exists — the duplicate is already minted. Retire
    // the legacy row rather than colliding on the unique slug index.
    if (slugged) {
      await prisma.teamMember.delete({ where: { id: legacyPeter.id } })
      console.log("🧹 Removed duplicate legacy team row for Peter Kibet")
    } else {
      await prisma.teamMember.update({
        where: { id: legacyPeter.id },
        data: { slug: "peter-kibet" },
      })
      console.log("🔗 Backfilled slug onto legacy team row for Peter Kibet")
    }
  }

  for (const member of TEAM_ROSTER) {
    // `update` deliberately omits bio/longBio/tagline/links: once a member has
    // edited their own profile in /admin/team, a re-seed must not overwrite it.
    await prisma.teamMember.upsert({
      where: { slug: member.slug },
      update: { name: member.name, role: member.role, order: member.order, active: true },
      create: { ...member, active: true },
    })
  }
  console.log(`✅ Team members: ${TEAM_ROSTER.length} seeded`)

  console.log("\n🎉 Seed complete!")
  console.log(
    `\n⚠️  IMPORTANT: Change the admin password immediately after first login.`
  )
  console.log(`   Admin email: claudecommunitykenya@gmail.com`)
  console.log(
    `   Default password: ${adminPassword} (set SEED_ADMIN_PASSWORD env var to override)`
  )
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
