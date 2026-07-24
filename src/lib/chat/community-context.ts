import { faqs } from "@/data/faq";
import { resources } from "@/data/resources";
import {
  getEvents,
  getUpcomingEvents,
  getBlogPosts,
  getFeaturedProjects,
  getTeamMembers,
} from "@/lib/data";

export async function buildCommunityContext(): Promise<string> {
  // Single source of truth: the DB. Empty arrays on failure are intentional —
  // chat omits sections rather than crashes. Editorial content (FAQ, resources)
  // is still file-based since it's reviewed in PRs, not admin-managed.
  const [events, upcoming, blogPosts, featuredProjects, team] = await Promise.all([
    getEvents().catch(() => []),
    getUpcomingEvents().catch(() => []),
    getBlogPosts().catch(() => []),
    getFeaturedProjects().catch(() => []),
    getTeamMembers().catch(() => []),
  ]);

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

  const projectBlock = featuredProjects
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

  const completedCount = events.filter((e) => e.status === "completed").length;

  return `
=== KEY FACTS ===
- Community name: Claude Community Kenya (CCK)
- Kenya's independent, volunteer-run Claude developer community
- First meetup: January 24, 2026 at iHiT Events Space, Westlands, Nairobi
- Events hosted (completed): ${completedCount}
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
- Blog: /blog
- Projects: /projects
- Community Hub: /community
`.trim();
}
