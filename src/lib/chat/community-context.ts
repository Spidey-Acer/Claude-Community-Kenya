import { faqs } from "@/data/faq";
import { resources } from "@/data/resources";
import {
  getEvents,
  getUpcomingEvents,
  getBlogPosts,
  getProjects,
  getTeamMembers,
} from "@/lib/data";
import { getSocialLinks } from "@/lib/social-links";

// Maps the handful of `resources` entries that duplicate a social link to
// the accessor key that should override their static `url` — otherwise an
// admin-updated link (e.g. a rotated WhatsApp invite) would be correct in
// KEY FACTS but stale in the resources block below it, quoted from the
// static src/data/resources.ts array.
const RESOURCE_SOCIAL_OVERRIDES: Record<string, "discord" | "whatsapp" | "lumaNairobi" | "lumaMombasa" | "twitter" | "linkedin"> = {
  "cck-discord": "discord",
  "cck-whatsapp": "whatsapp",
  "cck-luma-nairobi": "lumaNairobi",
  "cck-luma-mombasa": "lumaMombasa",
  "cck-twitter": "twitter",
  "cck-linkedin": "linkedin",
};

export async function buildCommunityContext(): Promise<string> {
  // Single source of truth: the DB. Empty arrays on failure are intentional —
  // chat omits sections rather than crashes. Editorial content (FAQ, resources)
  // is still file-based since it's reviewed in PRs, not admin-managed.
  const [events, upcoming, blogPosts, featuredProjects, team, socialLinks] = await Promise.all([
    getEvents().catch(() => []),
    getUpcomingEvents().catch(() => []),
    getBlogPosts().catch(() => []),
    getProjects().catch(() => []),
    getTeamMembers().catch(() => []),
    getSocialLinks(),
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
    .map((r) => {
      const overrideKey = RESOURCE_SOCIAL_OVERRIDES[r.id];
      const url = overrideKey ? socialLinks[overrideKey] : r.url;
      return url ? `- ${r.title}: ${url} — ${r.description ?? ""}` : null;
    })
    .filter((line): line is string => line !== null)
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

  const keyLinksBlock = [
    socialLinks.discord && `- Discord: ${socialLinks.discord}`,
    socialLinks.whatsapp && `- WhatsApp: ${socialLinks.whatsapp}`,
    socialLinks.lumaNairobi && `- Nairobi Events (Luma): ${socialLinks.lumaNairobi}`,
    socialLinks.lumaMombasa && `- Mombasa Events (Luma): ${socialLinks.lumaMombasa}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `
=== KEY FACTS ===
- Community name: Claude Community Kenya (CCK)
- Kenya's independent, volunteer-run Claude developer community
- First meetup: January 24, 2026 at iHiT Events Space, Westlands, Nairobi
- Events hosted (completed): ${completedCount}
- Cities: Nairobi + Mombasa (expanding)
- Website: https://www.claudekenya.org
${keyLinksBlock}
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
- Tools & Prompts: /community
`.trim();
}
