import { faqs } from "@/data/faq";
import { events, getUpcomingEvents } from "@/data/events";
import { resources } from "@/data/resources";
import { blogPosts } from "@/data/blog-posts";
import { team } from "@/data/team";
import { projects } from "@/data/projects";

export function buildCommunityContext(): string {
  const upcoming = getUpcomingEvents();

  const faqBlock = faqs
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const eventsBlock = events
    .map(
      (e) =>
        `- ${e.title} | ${e.date} | ${e.city} | ${e.venue} | Status: ${e.status}${e.lumaUrl ? ` | Register: ${e.lumaUrl}` : ""}`
    )
    .join("\n");

  const upcomingBlock = upcoming
    .map(
      (e) =>
        `- ${e.title} (${e.date}, ${e.city})${e.registrationUrl ? ` — Register: ${e.registrationUrl}` : ""}`
    )
    .join("\n");

  const resourceBlock = resources
    .slice(0, 15)
    .map((r) => `- ${r.title}: ${r.url} — ${r.description ?? ""}`)
    .join("\n");

  const projectBlock = projects
    .filter((p) => p.featured)
    .map(
      (p) =>
        `- ${p.name} by ${p.builder}: ${p.description}${p.demoUrl ? ` (${p.demoUrl})` : ""}`
    )
    .join("\n");

  const teamBlock = team
    .map((t) => `- ${t.name}, ${t.role}`)
    .join("\n");

  const blogBlock = blogPosts
    .map((b) => `- "${b.title}" (${b.date}) — ${b.excerpt}`)
    .join("\n");

  return `
=== KEY FACTS ===
- Community name: Claude Community Kenya (CCK)
- Africa's first Claude developer community
- First meetup: January 24, 2026 at iHiT Events Space, Westlands, Nairobi — 30+ attendees
- Events hosted: 2 (Nairobi #1 Jan 24, Nairobi #2 Feb 20)
- Cities: Nairobi + Mombasa (expanding)
- Website: https://www.claudekenya.org
- Discord: https://discord.gg/CkD9QWjsHm
- WhatsApp: https://chat.whatsapp.com/Hpx42q1ADsrFNN3hHtZcQa
- Nairobi Events (Luma): https://luma.com/sbsa789m
- Mombasa Events (Luma): https://luma.com/vsf5re14
- Global Claude Community: https://luma.com/claudecommunity

=== FAQ ===
${faqBlock}

=== UPCOMING EVENTS ===
${upcomingBlock || "No upcoming events currently listed."}

=== ALL EVENTS ===
${eventsBlock}

=== TEAM ===
${teamBlock}

=== FEATURED PROJECTS ===
${projectBlock}

=== BLOG POSTS ===
${blogBlock}

=== KEY RESOURCES ===
${resourceBlock}

=== SITE PAGES ===
- Join Community: /join
- Speaker Application: /speak
- Volunteer: /volunteer
- Submit Idea: /submit-idea
- Submit Project: /submit-project
- Events: /events
- Resources: /resources
- FAQ: /faq
- Ambassador Program: /ambassador
- Blog: /blog
- Projects: /projects
- Community Hub: /community
`.trim();
}
