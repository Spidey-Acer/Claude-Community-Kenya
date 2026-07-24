/**
 * Volunteer roles — the single source of truth.
 *
 * The role list previously lived in four places (form, email templates, admin
 * page, Prisma enum) with labels already drifting between them. Every surface
 * now derives from this module; the Prisma enum stays the storage contract and
 * is checked against this list by the type below.
 */

import type { VolunteerRole } from "@/generated/prisma/enums"

export interface VolunteerRoleMeta {
  value: VolunteerRole
  label: string
  /** One-line pitch shown on the role card in the volunteer form. */
  description: string
  /** Badge color used in the admin list. */
  color: string
}

export const VOLUNTEER_ROLES: readonly VolunteerRoleMeta[] = [
  {
    value: "EVENT_SUPPORT",
    label: "Event Support",
    description: "Help run events on the day — registration desk, setup, logistics, keeping things moving.",
    color: "#ff3333",
  },
  {
    value: "EVENT_COORDINATOR",
    label: "Event Coordinator",
    description: "Plan and organize meetups end to end in Nairobi and Mombasa.",
    color: "#00d4ff",
  },
  {
    value: "MENTOR",
    label: "Mentor / Facilitator",
    description: "Guide beginners at workshops, study groups, and hackathons.",
    color: "#00ff41",
  },
  {
    value: "TECH_SUPPORT",
    label: "Technical Support",
    description: "Venue AV, livestreams, demo setups, and tech triage during events.",
    color: "#a78bfa",
  },
  {
    value: "SOCIAL_MEDIA_MANAGER",
    label: "Social Media Manager",
    description: "Manage Twitter/X and LinkedIn posting and engagement.",
    color: "#5865F2",
  },
  {
    value: "COMMUNITY_MANAGER",
    label: "Community Manager",
    description: "Manage Discord and WhatsApp, welcome members, moderate.",
    color: "#25D366",
  },
  {
    value: "CONTENT_CREATOR",
    label: "Content Creator",
    description: "Write blog posts, create graphics and video content.",
    color: "#ffb000",
  },
  {
    value: "DESIGNER",
    label: "Designer",
    description: "Posters, slides, social visuals, and brand assets for events and campaigns.",
    color: "#f472b6",
  },
  {
    value: "PHOTOGRAPHER",
    label: "Photography & Video",
    description: "Capture events and edit highlights for recaps and social media.",
    color: "#fb923c",
  },
  {
    value: "PARTNERSHIPS",
    label: "Partnerships",
    description: "Help find venues, sponsors, and community partners.",
    color: "#38bdf8",
  },
] as const

/** value → label, for email templates and anywhere a bare label is needed. */
export const VOLUNTEER_ROLE_LABELS: Record<VolunteerRole, string> = Object.fromEntries(
  VOLUNTEER_ROLES.map((r) => [r.value, r.label])
) as Record<VolunteerRole, string>

/** value → badge color, for the admin list. */
export const VOLUNTEER_ROLE_COLORS: Record<VolunteerRole, string> = Object.fromEntries(
  VOLUNTEER_ROLES.map((r) => [r.value, r.color])
) as Record<VolunteerRole, string>

/** Chapters a volunteer can show up for; stored as a plain string. */
export const VOLUNTEER_CITIES = ["Nairobi", "Mombasa", "Remote / Online"] as const

export const VOLUNTEER_AVAILABILITY_OPTIONS = [
  "Weekday evenings",
  "Weekends",
  "Event days",
  "A few hours per week",
  "Flexible",
] as const
