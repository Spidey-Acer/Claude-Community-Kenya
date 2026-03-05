/**
 * Seed script — Claude Community Kenya
 * Migrates existing static data files into the database.
 * Run: npx prisma db seed
 */

import { PrismaClient, EventType, EventStatus, BlogStatus } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import "dotenv/config"

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
        "On January 24, 2026, history was made as Kenya hosted its very first Claude Code meetup. Over 30 developers from across Nairobi gathered at iHiT Events Space in Westlands for an afternoon of networking, interaction, and a live Claude Code demo.\n\nThe event was a community gathering where members talked, connected, and explored the possibilities of AI-assisted development. Peter Kibet showcased his Claude Code workflow with a live project demo — showing what developers can build with these tools.\n\nThis meetup marked the birth of Claude Community Kenya and set the foundation for what would become East Africa's most vibrant AI developer community.",
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
        "First-ever Claude Code demo in East Africa",
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
        "East Africa's first Claude hackathon — build anything with Claude in one day, solo or as a team of up to three.",
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
        "East Africa's first Claude hackathon",
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
        "An introduction to Claude Community Kenya — who we are, what we do, and why we are building East Africa's first Claude developer community.",
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
  const existing = await prisma.teamMember.findFirst({
    where: { name: "Peter Kibet" },
  })
  if (!existing) {
    await prisma.teamMember.create({
      data: {
        name: "Peter Kibet",
        role: "Founder & Lead Organizer",
        bio: "Founder and lead organizer of Claude Community Kenya. Organized Kenya's first Claude Code meetup and is passionate about bringing AI-powered development tools to every Kenyan developer.",
        twitter: "https://twitter.com/peterkilbet",
        github: "https://github.com/Spidey-Acer",
        linkedIn: "https://linkedin.com/in/peterkilbet",
        website: "https://www.peterkibet.co.ke",
        avatar: "/images/peter-professional.png",
        order: 0,
        active: true,
      },
    })
  }
  console.log("✅ Team members seeded")

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
