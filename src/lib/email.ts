/**
 * Email Helper Library — Claude Community Kenya
 * Uses Resend for transactional emails.
 */

import { Resend } from "resend"
import { VOLUNTEER_ROLE_LABELS as SHARED_VOLUNTEER_ROLE_LABELS } from "@/lib/volunteer-roles"
import type { JudgingRubric } from "@/lib/impact-lab/judging"
import type { AnnouncedWinner, ResultsTrackWinner } from "@/lib/impact-lab/results"
import {
  REVIEW_PROVENANCE,
  REVIEW_SIGNATURE,
  type TeamJudgeNote,
} from "@/lib/impact-lab/reviews"
import {
  CARD_BRONZE,
  CARD_GOLD,
  CARD_GRAPHITE,
  CARD_POSTER,
  cardPlacingLine,
  isPodium,
  placementTitle,
  PODIUM_DEPTH,
  teamPlaceLabel,
  titleCaseName,
  type Placement,
} from "@/lib/impact-lab/result-card"

// Lazy initialization — avoids build-time error when env var is not set
let _resend: Resend | null = null
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@claudekenya.org"
const EMAIL_FROM_NAME =
  process.env.EMAIL_FROM_NAME || "Claude Community Kenya"
const EMAIL_TO_ADMIN =
  process.env.EMAIL_TO_ADMIN || "claudecommunitykenya@gmail.com"
export const APP_URL = process.env.NEXTAUTH_URL || "https://www.claudekenya.org"

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim()
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not configured, email not sent")
    console.log(`[EMAIL MOCK] To: ${Array.isArray(to) ? to.join(", ") : to}`)
    console.log(`[EMAIL MOCK] Subject: ${subject}`)
    console.log(`[EMAIL MOCK] Body:\n${text || stripHtml(html)}\n`)
    return false
  }

  try {
    await getResend().emails.send({
      from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text: text || stripHtml(html),
    })
    return true
  } catch (error) {
    console.error("[EMAIL] Failed to send email:", error)
    return false
  }
}

// ─── Batch sending ───────────────────────────────────────────────────────────

export interface BatchEmailItem {
  to: string
  subject: string
  html: string
}

/**
 * Send many emails via Resend's batch API (100 per call — the API's own
 * ceiling). Failures are counted per chunk: if a chunk's call throws, all its
 * items count as failed; a successful call counts all its items as sent.
 * Without an API key, logs a mock line per item and reports everything failed.
 */
export async function sendEmailBatch(
  items: BatchEmailItem[]
): Promise<{ sent: number; failed: number }> {
  if (items.length === 0) return { sent: 0, failed: 0 }

  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not configured, batch not sent")
    for (const item of items) {
      console.log(`[EMAIL MOCK] To: ${item.to} | Subject: ${item.subject}`)
    }
    return { sent: 0, failed: items.length }
  }

  const from = `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`
  let sent = 0
  let failed = 0
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100)
    try {
      const { error } = await getResend().batch.send(
        chunk.map((item) => ({
          from,
          to: [item.to],
          subject: item.subject,
          html: item.html,
          text: stripHtml(item.html),
        }))
      )
      if (error) {
        console.error("[EMAIL] Batch chunk rejected:", error)
        failed += chunk.length
      } else {
        sent += chunk.length
      }
    } catch (err) {
      console.error("[EMAIL] Batch chunk failed:", err)
      failed += chunk.length
    }
  }
  return { sent, failed }
}

/**
 * Batch send that reports per recipient rather than per chunk.
 *
 * `sendEmailBatch` returns only totals, which is not enough to record who was
 * actually reached — and without that, a retry re-sends to everyone. Resend's
 * quota is 100/day against 93 recipients, so a blind retry blows the quota and
 * double-mails the people it already reached.
 *
 * Chunks of 25 rather than the API ceiling of 100: if a chunk is rejected we
 * can only mark that chunk failed, so a smaller chunk loses less certainty.
 */
export async function sendEmailBatchTracked(
  items: BatchEmailItem[]
): Promise<{ to: string; ok: boolean; error?: string }[]> {
  if (items.length === 0) return []

  if (!process.env.RESEND_API_KEY) {
    console.warn("[EMAIL] RESEND_API_KEY not configured, batch not sent")
    return items.map((item) => ({
      to: item.to,
      ok: false,
      error: "RESEND_API_KEY not configured",
    }))
  }

  const from = `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`
  const results: { to: string; ok: boolean; error?: string }[] = []

  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25)
    try {
      const { error } = await getResend().batch.send(
        chunk.map((item) => ({
          from,
          to: [item.to],
          subject: item.subject,
          html: item.html,
          text: stripHtml(item.html),
        }))
      )
      const message = error ? error.message : undefined
      for (const item of chunk) {
        results.push({ to: item.to, ok: !error, error: message })
      }
      if (error) console.error("[EMAIL] Batch chunk rejected:", error)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown send failure"
      console.error("[EMAIL] Batch chunk failed:", err)
      for (const item of chunk) results.push({ to: item.to, ok: false, error: message })
    }
  }

  return results
}

// ─── CCK-specific email templates ───────────────────────────────────────────

export async function sendSpeakerApplicationNotification(data: {
  name: string
  email: string
  topic: string
  category: string
}): Promise<boolean> {
  const adminHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">New Speaker Application</h2>
      <p><strong>Name:</strong> ${esc(data.name)}</p>
      <p><strong>Email:</strong> ${esc(data.email)}</p>
      <p><strong>Topic:</strong> ${esc(data.topic)}</p>
      <p><strong>Category:</strong> ${esc(data.category)}</p>
      <p><a href="${APP_URL}/admin/speakers" style="color:#00ff41;">Review in Admin Dashboard →</a></p>
    </div>
  `
  const applicantHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">Application Received — Claude Community Kenya</h2>
      <p>Hi ${esc(data.name)},</p>
      <p>We've received your speaker application for <strong>"${esc(data.topic)}"</strong>.</p>
      <p>Our team will review it and get back to you within 5 business days.</p>
      <p>In the meantime, join our community on <a href="https://discord.gg/CkD9QWjsHm" style="color:#00ff41;">Discord</a>.</p>
      <p style="color:#8a8a8a;font-size:12px;">Claude Community Kenya · ${APP_URL}</p>
    </div>
  `
  const [adminSent] = await Promise.all([
    sendEmail({
      to: EMAIL_TO_ADMIN,
      subject: `New Speaker Application: ${data.topic.slice(0, 100)} — ${data.name}`,
      html: adminHtml,
    }),
    sendEmail({
      to: data.email,
      subject: "Your Speaker Application — Claude Community Kenya",
      html: applicantHtml,
    }),
  ])
  return adminSent
}

export async function sendIdeaSubmissionNotification(data: {
  name: string
  email: string
  title: string
  stage: string
}): Promise<boolean> {
  const adminHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">New Idea/Project Submission</h2>
      <p><strong>Project:</strong> ${esc(data.title)}</p>
      <p><strong>Stage:</strong> ${esc(data.stage)}</p>
      <p><strong>Submitted by:</strong> ${esc(data.name)} &lt;${esc(data.email)}&gt;</p>
      <p><a href="${APP_URL}/admin/ideas" style="color:#00ff41;">Review in Admin Dashboard →</a></p>
    </div>
  `
  const applicantHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">Idea Received — Claude Community Kenya</h2>
      <p>Hi ${esc(data.name)},</p>
      <p>We've received your submission for <strong>"${esc(data.title)}"</strong>.</p>
      <p>We'll review it and reach out if we can help connect you with collaborators or resources.</p>
      <p>Join our <a href="https://discord.gg/CkD9QWjsHm" style="color:#00ff41;">Discord community</a> to connect with other builders now.</p>
      <p style="color:#8a8a8a;font-size:12px;">Claude Community Kenya · ${APP_URL}</p>
    </div>
  `
  const [adminSent] = await Promise.all([
    sendEmail({
      to: EMAIL_TO_ADMIN,
      subject: `New Idea Submission: ${data.title.slice(0, 100)} — ${data.name}`,
      html: adminHtml,
    }),
    sendEmail({
      to: data.email,
      subject: "Your Idea Submission — Claude Community Kenya",
      html: applicantHtml,
    }),
  ])
  return adminSent
}

export async function sendProjectSubmissionNotification(data: {
  name: string
  email: string
  projectName: string
  status: string
}): Promise<boolean> {
  const adminHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">New Project Submission</h2>
      <p><strong>Project:</strong> ${esc(data.projectName)}</p>
      <p><strong>Status:</strong> ${esc(data.status)}</p>
      <p><strong>Submitted by:</strong> ${esc(data.name)} &lt;${esc(data.email)}&gt;</p>
      <p><a href="${APP_URL}/admin" style="color:#00ff41;">Review in Admin Dashboard →</a></p>
    </div>
  `
  const applicantHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">Project Received — Claude Community Kenya</h2>
      <p>Hi ${esc(data.name)},</p>
      <p>We've received your submission for <strong>"${esc(data.projectName)}"</strong>.</p>
      <p>We'll review it and feature it on our Projects page once approved.</p>
      <p>Join our <a href="https://discord.gg/CkD9QWjsHm" style="color:#00ff41;">Discord community</a> to connect with other builders.</p>
      <p style="color:#8a8a8a;font-size:12px;">Claude Community Kenya · ${APP_URL}</p>
    </div>
  `
  const [adminSent] = await Promise.all([
    sendEmail({
      to: EMAIL_TO_ADMIN,
      subject: `New Project Submission: ${data.projectName.slice(0, 100)} — ${data.name}`,
      html: adminHtml,
    }),
    sendEmail({
      to: data.email,
      subject: "Your Project Submission — Claude Community Kenya",
      html: applicantHtml,
    }),
  ])
  return adminSent
}

type KaribuAudience = "dev" | "non_tech_pro" | "student" | "founder" | "creator"

const AUDIENCE_WELCOME_COPY: Record<KaribuAudience, { subject: string; opening: string; closing: string }> = {
  dev: {
    subject: "You're in — welcome from the CCK devs",
    opening:
      "Glad to have another builder. CCK's developer track runs hands-on workshops on Claude Code, agentic patterns, and shipping AI into production. The next thing you'll want is our Discord — the #dev-chat channel is where most of the real work happens.",
    closing: "Show up to a meetup, share what you're building, and don't be shy about asking sharp questions.",
  },
  non_tech_pro: {
    subject: "Welcome — Claude for the work you actually do",
    opening:
      "You don't need to be an engineer to get real leverage from Claude. CCK runs workshops aimed at marketers, lawyers, ops folks, and consultants who want to make Claude part of their daily workflow — without learning to code.",
    closing: "Our Discord is friendly to people from all backgrounds. Pop in, say hi, and tell us what you're trying to do.",
  },
  student: {
    subject: "Welcome to CCK — built for Kenyan students",
    opening:
      "We're glad you found us. CCK runs free meetups, study groups, and university sessions across Nairobi and Mombasa. Whether you've never written a line of code or you're already deep in side projects, there's a place for you here.",
    closing: "Join the WhatsApp group and the Discord — that's where peers and mentors hang out between events.",
  },
  founder: {
    subject: "Welcome — let's build your AI company in Nairobi",
    opening:
      "CCK is where the people building AI-native companies in Kenya find each other. Expect founder dinners, technical deep-dives that translate to product decisions, and intros to investors and operators thinking about the same things you are.",
    closing: "Join the Discord and watch for the next founder event — that's usually where the most useful conversations start.",
  },
  creator: {
    subject: "Welcome — better stories with Claude",
    opening:
      "Writers, journalists, teachers, and educators are a fast-growing part of CCK. We run sessions on using Claude to amplify your work without losing your voice — drafting, research, lesson design, editing flows.",
    closing: "Hop into the Discord and share what you're working on — the community loves seeing real creative work.",
  },
}

const GENERIC_WELCOME = {
  subject: "Application Received — Claude Community Kenya",
  opening:
    "Your application has been received. We'll review it and add you to the community shortly. While you wait, the Discord is the fastest way to start meeting people.",
  closing: "See you in there.",
}

export async function sendJoinApplicationNotification(data: {
  name: string
  email: string
  audience?: KaribuAudience | null
}): Promise<boolean> {
  const copy = data.audience ? AUDIENCE_WELCOME_COPY[data.audience] : GENERIC_WELCOME

  const adminHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">New Join Application</h2>
      <p><strong>Name:</strong> ${esc(data.name)}</p>
      <p><strong>Email:</strong> ${esc(data.email)}</p>
      ${data.audience ? `<p><strong>Audience (from Karibu):</strong> ${esc(data.audience)}</p>` : ""}
      <p><a href="${APP_URL}/admin/applications" style="color:#00ff41;">Review in Admin Dashboard →</a></p>
    </div>
  `
  const applicantHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">Welcome to Claude Community Kenya!</h2>
      <p>Hi ${esc(data.name)},</p>
      <p>${esc(copy.opening)}</p>
      <p style="margin:24px 0;">
        <a href="https://discord.gg/CkD9QWjsHm" style="display:inline-block;background:#00ff41;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">Join Discord →</a>
      </p>
      <p>${esc(copy.closing)}</p>
      <p style="color:#8a8a8a;font-size:12px;">Claude Community Kenya · ${APP_URL}</p>
    </div>
  `
  const [adminSent] = await Promise.all([
    sendEmail({
      to: EMAIL_TO_ADMIN,
      subject: `New Join Application: ${data.name}${data.audience ? ` · ${data.audience}` : ""}`,
      html: adminHtml,
    }),
    sendEmail({
      to: data.email,
      subject: copy.subject,
      html: applicantHtml,
    }),
  ])
  return adminSent
}

const VOLUNTEER_ROLE_LABELS: Record<string, string> = SHARED_VOLUNTEER_ROLE_LABELS

export async function sendVolunteerApplicationNotification(data: {
  name: string
  email: string
  role: string
}): Promise<boolean> {
  const roleLabel = VOLUNTEER_ROLE_LABELS[data.role] ?? data.role
  const adminHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">New Volunteer Application</h2>
      <p><strong>Name:</strong> ${esc(data.name)}</p>
      <p><strong>Email:</strong> ${esc(data.email)}</p>
      <p><strong>Role:</strong> ${esc(roleLabel)}</p>
      <p><a href="${APP_URL}/admin/volunteers" style="color:#00ff41;">Review in Admin Dashboard →</a></p>
    </div>
  `
  const applicantHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">Volunteer Application Received — Claude Community Kenya</h2>
      <p>Hi ${esc(data.name)},</p>
      <p>We've received your volunteer application for the <strong>${esc(roleLabel)}</strong> role.</p>
      <p>Our team will review it and get back to you soon.</p>
      <p>In the meantime, join our community on <a href="https://discord.gg/CkD9QWjsHm" style="color:#00ff41;">Discord</a>.</p>
      <p style="color:#8a8a8a;font-size:12px;">Claude Community Kenya · ${APP_URL}</p>
    </div>
  `
  const [adminSent] = await Promise.all([
    sendEmail({
      to: EMAIL_TO_ADMIN,
      subject: `New Volunteer Application: ${roleLabel} — ${data.name}`,
      html: adminHtml,
    }),
    sendEmail({
      to: data.email,
      subject: "Volunteer Application Received — Claude Community Kenya",
      html: applicantHtml,
    }),
  ])
  return adminSent
}

export async function sendEmailVerificationEmail(data: {
  to: string
  firstName: string
  verifyUrl: string
  expiresInHours: number
}): Promise<boolean> {
  const html = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">Verify your email</h2>
      <p>Hi ${esc(data.firstName)},</p>
      <p>Welcome to Claude Community Kenya. Tap the button below to verify your email address. This link expires in ${data.expiresInHours} hours.</p>
      <p style="margin:24px 0;">
        <a href="${data.verifyUrl}" style="display:inline-block;background:#00ff41;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">Verify Email</a>
      </p>
      <p style="color:#8a8a8a;font-size:12px;">If the button doesn't work, paste this URL into your browser:<br>${esc(data.verifyUrl)}</p>
      <p style="color:#8a8a8a;font-size:12px;">If you didn't create a CCK account, you can safely ignore this email.</p>
      <p style="color:#8a8a8a;font-size:12px;">Claude Community Kenya · ${APP_URL}</p>
    </div>
  `
  return sendEmail({
    to: data.to,
    subject: "Verify your CCK email",
    html,
  })
}

export async function sendPasswordResetEmail(data: {
  to: string
  firstName: string
  resetUrl: string
  expiresInMinutes: number
}): Promise<boolean> {
  const html = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">Reset your password</h2>
      <p>Hi ${esc(data.firstName)},</p>
      <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in ${data.expiresInMinutes} minutes.</p>
      <p style="margin:24px 0;">
        <a href="${data.resetUrl}" style="display:inline-block;background:#00ff41;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">Reset Password</a>
      </p>
      <p style="color:#8a8a8a;font-size:12px;">If the button doesn't work, paste this URL into your browser:<br>${esc(data.resetUrl)}</p>
      <p style="color:#8a8a8a;font-size:12px;">If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
      <p style="color:#8a8a8a;font-size:12px;">Claude Community Kenya · ${APP_URL}</p>
    </div>
  `
  return sendEmail({
    to: data.to,
    subject: "Reset your CCK password",
    html,
  })
}

/**
 * Impact Lab: how to reach your team. Optional backup for the Luma
 * announcement — teams are published to the dashboard, never emailed. The
 * recipient's own address is spelled out because signing up with a DIFFERENT
 * email is the one mistake that hides their team from them. Sign-up needs no
 * confirmation mail, so the steps are only two.
 */
export function impactLabAccountEmail(data: {
  to: string
  firstName: string
}): BatchEmailItem {
  const html = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">Impact Lab: meet your team</h2>
      <p>Hi ${esc(data.firstName)},</p>
      <p>Teams for <strong>Impact Lab: AI Mashinani</strong> are matched. Here's how to see yours:</p>
      <ol style="line-height:1.8;">
        <li><a href="${APP_URL}/signup" style="color:#00ff41;">Create your account</a> using <strong>this exact email address</strong> (${esc(data.to)}) — it's how we find your registration. A different one won't match.</li>
        <li>Open <a href="${APP_URL}/dashboard/impact-lab" style="color:#00ff41;">your Impact Lab dashboard</a>.</li>
      </ol>
      <p>You'll find your teammates and how to reach them, what each person brings, why your team was put together this way, and a suggested direction for your build.</p>
      <p style="margin:24px 0;">
        <a href="${APP_URL}/dashboard/impact-lab" style="display:inline-block;background:#00ff41;color:#0a0a0a;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">See my team →</a>
      </p>
      <p style="color:#8a8a8a;font-size:12px;">Already have an account? Just open the dashboard link.</p>
      <p style="color:#8a8a8a;font-size:12px;">Claude Community Kenya · ${APP_URL}</p>
    </div>
  `
  return { to: data.to, subject: "Impact Lab: meet your team", html }
}

/**
 * Matches the ordinal shown on the dashboard's results page (ResultsView.tsx)
 * exactly. Exported so preview-email/route.ts's publish-time headline (the
 * one an organiser reads before confirming) can never phrase a placing
 * differently from the email itself.
 */
const RESULTS_ORDINALS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" }
export function resultsOrdinal(rank: number): string {
  return RESULTS_ORDINALS[rank] ?? `${rank}th`
}

/**
 * Dark premium palette for the Impact Lab results email. Email clients can't
 * read CSS variables, so every value is a literal hex/rgba repeated wherever
 * it's needed — there is no shared stylesheet to point back to.
 */
const DARK = {
  /** Page background, outside the card. */
  bg: "#0B0A09",
  /** The card itself, and most content panels (header, body, scores, judge note, review). */
  card: "#16140F",
  /** Hairline borders and rules. */
  hairline: "#2A261E",
  /** Primary text on dark surfaces. */
  text: "#F4EEE3",
  /** Secondary text (criterion labels, hero eyebrows on graphite/bronze). */
  muted: "#B8AE9C",
  /** Tertiary text (range line, footer). */
  dim: "#7C7365",
  /** Claude orange — rules, pills, the primary button, small-caps labels. */
  orange: "#D97757",
  orangeHover: "#E58A6B",
  /** Text on the orange share button. */
  ink: "#16140F",
  /** Community review card's border — a gold hairline, mixed to a solid hex rather than an alpha colour so Outlook renders it too. */
  goldHairline: "#5A4A1E",
} as const

/** Fraunces where installed (Apple Mail, iOS), Georgia everywhere else. */
const DISPLAY_FONT = "Fraunces, Georgia, 'Times New Roman', serif"
const BODY_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

/**
 * Impact Lab: the results email. Nine of the 93 recipients never created a
 * dashboard account, so this has to stand alone — the winners and the
 * recipient's own scorecard are written out in full in the body, not just
 * linked. Everything passed in here must come from the stored results
 * snapshot (see `resultsSnapshot` on ImpactLabMatchRun), never recomputed
 * from live scores or submissions, because live data moves after publication
 * and what 93 people are told must not move with it.
 *
 * Dark premium theme, three variants from one template, decided by
 * `placement` (see `placementFor` in @/lib/impact-lab/result-card):
 *
 * - Track winner — a gold gradient hero: "Winner", the track, the project.
 * - Runner-up — the same hero on a graphite gradient, silver pill.
 * - Third place — the same hero on a bronze gradient.
 * - Everyone else — an elevated dark panel with an orange left rule that
 *   reads as achievement: "You built <project> at <event>". No placing is
 *   printed in the hero; the team's own position within its track sits on
 *   its private scores block instead.
 *
 * Below the hero every variant carries the same blocks in the same order:
 * the team's scores (rubric-driven labels, the low/high range across
 * judges), judge notes quoted under the judge's name, the approved
 * community review with its provenance line, the winners, and the calls to
 * action — share the public card, open the dashboard.
 *
 * Table-based layout with inline styles throughout — email clients ignore
 * `<style>` blocks and Tailwind entirely, and this is read on phones and in
 * Outlook as often as in a browser. No web fonts, no external images. Every
 * text element sets its own `color`, and every box that a client's dark-mode
 * remapping could independently repaint (the wrapper tables, the hero cell,
 * the content cell) sets its own `background-color` (and `bgcolor`, for
 * Outlook) rather than relying on inheritance — some clients decide
 * light/dark per node from its own inline style, not from the resolved or
 * inherited value. `color-scheme`/`supported-color-schemes` meta tags are
 * prepended to the returned HTML (not wrapped in a `<head>` — this fragment
 * has none, and is sent as-is) as the conventional way to tell clients that
 * do read them not to invert an already-dark template. Gradients are given
 * a solid `background-color` fallback before `background-image`, since
 * Gmail strips the latter and Outlook (VML aside) supports neither.
 *
 * No judge counts and no deadline language anywhere in this template — those
 * are the two things Impact Lab copy must never say. No other team's score
 * appears anywhere: the winners are listed by name and placing only.
 */
export function impactLabResultsEmail(data: {
  fullName: string
  projectName: string
  /** The team's internal name ("Kilimo 3"), shown beside its table. */
  teamName: string
  /**
   * The team's id in the snapshot, so the winners strip can say "That is
   * you." when the reader's team is on it. Optional: the test send's sample
   * team has no id and gets no note.
   */
  teamId?: string
  /** The venue table the team built at, or null on runs saved before tables existed. */
  table: number | null
  /** The event's display name, e.g. "Impact Lab: AI Mashinani 02". */
  eventName: string
  /** The event's own `dates` string, printed under the event name on the hero. Empty hides the line. */
  eventDates?: string
  /**
   * True for the announced overall champion of a `"champion"`-mode run (see
   * `isChampion` in result-card.ts). The hero then reads "CHAMPION" rather
   * than "<TRACK> WINNER", exactly as the team's share card does. Defaults
   * to false: the claim must be earned.
   */
  champion?: boolean
  /**
   * Where the team finished within its track — drives the hero variant and
   * the subject line. `null` is tolerated (renders the "built" variant) so a
   * legacy caller cannot crash a send, but every real caller has one.
   */
  placement: Placement | null
  /** Overall rank across all tracks — the snapshot's own `rank`. */
  rank: number
  /**
   * How many teams the snapshot ranks (`snapshot.ranking.length`), so the
   * scores block can say "2nd of 19 overall". Optional for a legacy caller,
   * which then reads "2nd overall".
   */
  rankedCount?: number
  /**
   * `"podium"` (an overall podium was announced), `"tracks"` (one winner per
   * track, no overall podium), or `"champion"` (one overall champion AND a
   * winner for one or more tracks, announced together). Drives the "how
   * placings were decided" note and whether this team's own scores block may
   * claim an overall rank — see `note` and `placingLine` below. Defaults to
   * `"podium"` for legacy callers, matching every mode field's own default
   * elsewhere in Impact Lab.
   */
  announcementMode?: "podium" | "tracks" | "champion"
  /**
   * True when the panel's announced placings override the score order (see
   * `placingsFollowScores`). Decides whether the explanatory note says the
   * placings were decided after discussion or simply follow the scores.
   * Defaults to false: the claim of a deliberation is the one that must be
   * earned. Not consulted in `"champion"` mode — see `note` below.
   */
  panelOverrodeScores?: boolean
  criterionAverages: Record<string, number>
  low: number | null
  high: number | null
  basis: "demo" | "submission"
  overall: AnnouncedWinner[]
  trackWinners: ResultsTrackWinner[]
  dashboardUrl: string
  /**
   * The team's public result card. Omitted when no signing secret is
   * configured (see `resultCardSecret`) and for the fabricated test send —
   * a dead share link is worse than none, so the block disappears entirely.
   */
  shareUrl?: string | null
  /**
   * Notes a judge actually wrote on this team's scoresheet, quoted under that
   * judge's name (already corrected via presentableJudgeNote — never pass raw
   * DB text here). Optional: most teams received none.
   */
  judgeNotes?: TeamJudgeNote[]
  /**
   * The approved community review for this team (already gated through
   * publishableReview — an unapproved draft must never reach this function).
   * Rendered under the community's own signature, with the provenance line,
   * so generated words can never read as a judge's.
   */
  communityReview?: string | null
  /**
   * The rubric this team was actually scored against. Every criterion label,
   * denominator, and the "same N criteria" language below is read off it —
   * never off the Impact Lab constant — because a second event does not
   * share Impact Lab's five criteria or its 1-5 scale.
   */
  rubric: JudgingRubric
}): { subject: string; html: string } {
  const mode = data.announcementMode ?? "podium"
  const podium = isPodium(data.placement)
  const ranked = data.placement?.kind === "ranked" ? data.placement : null
  const track = data.placement?.track ?? null
  // The public card image's alt text: the placing headline in words.
  const shareCardAlt =
    podium && ranked
      ? `${placementTitle(ranked)} in ${ranked.track}: ${data.projectName}`
      : `${data.projectName}, built at ${data.eventName}`

  // ── Subject ──────────────────────────────────────────────────────────────
  let subject: string
  if (ranked && ranked.position === 1) subject = `You won the ${ranked.track} track at ${data.eventName}`
  else if (ranked && ranked.position === 2) subject = `Runner-up in ${ranked.track} at ${data.eventName}`
  else if (ranked && ranked.position === 3) subject = `Third place in ${ranked.track} at ${data.eventName}`
  else subject = `Your ${data.eventName} results: ${data.projectName}`

  // ── Hero ─────────────────────────────────────────────────────────────────
  // The team's share card, in email-safe HTML: the same surface, mark and
  // lines `renderCard` draws (card-render.tsx), one hero for every placing.
  // "Table 36 · Kilimo 3", or "Table 36" alone when the team is named after
  // its table — see teamPlaceLabel. The middle dot is re-encoded for email.
  const tableLine = esc(teamPlaceLabel(data.table, data.teamName, track)).replace(/ · /g, " &middot; ")
  const metaLine = [tableLine || null, track ? `${esc(track)} track` : null]
    .filter((s): s is string => Boolean(s))
    .join(" &middot; ")

  // Surface by placing, as `surfaceFor` in card-render.tsx: gold for a
  // winner (the champion is a winner too), graphite for the runner-up,
  // bronze for third, the poster's flat clay for everyone who built. Each
  // gradient carries a solid fallback (Gmail drops `background-image`;
  // Outlook renders neither and falls back to `bgcolor`). Text mirrors the
  // card: ink on clay and gold, paper on graphite and bronze — and on clay
  // the serif line is ink while the sans lines are paper, as on the poster.
  const surface =
    ranked && ranked.position === 1
      ? {
          fallback: CARD_GOLD.mid,
          gradient: `linear-gradient(165deg, ${CARD_GOLD.from} 0%, ${CARD_GOLD.mid} 55%, ${CARD_GOLD.to} 100%)`,
          serif: CARD_POSTER.ink,
          sans: CARD_POSTER.ink,
          mark: "ink",
        }
      : ranked && ranked.position === 2
        ? {
            fallback: CARD_GRAPHITE.from,
            gradient: `linear-gradient(180deg, ${CARD_GRAPHITE.from} 0%, ${CARD_GRAPHITE.to} 100%)`,
            serif: CARD_POSTER.paper,
            sans: CARD_POSTER.paper,
            mark: "paper",
          }
        : ranked && ranked.position === 3
          ? {
              fallback: CARD_BRONZE.to,
              gradient: `linear-gradient(180deg, ${CARD_BRONZE.from} 0%, ${CARD_BRONZE.to} 100%)`,
              serif: CARD_POSTER.paper,
              sans: CARD_POSTER.paper,
              mark: "paper",
            }
          : {
              fallback: CARD_POSTER.clay,
              gradient: "none",
              serif: CARD_POSTER.ink,
              sans: CARD_POSTER.paper,
              mark: "poster",
            }
  const heroPlacing = cardPlacingLine({
    title: placementTitle(data.placement),
    champion: data.champion === true,
    track: track ?? "",
    eventName: data.eventName,
  })
  // `ranked.announced` and `data.overall` both come from the same snapshot
  // in every real caller, but this pill is the one place in the hero that
  // states an overall placing was announced — checking `data.overall.length`
  // too, not `ranked.announced` alone, means a caller that ever passed the
  // two out of sync (or an empty-overall "tracks" mode with a stale
  // `Placement`) still cannot render an overall placing nobody announced.
  // Not under a CHAMPION line: "1st overall" would only repeat it. A
  // podium-mode 1st/2nd/3rd keeps the pill, since its line names the track.
  // Second and third overall in score order get the pill in every mode
  // (Build Day ruling, 2026-09-21: the position is an announced fact, and
  // the champion-mode runner-up's email said nothing about it). Rank 4+
  // gets no pill; the scores block carries the position for everyone.
  const announcedOverall = Boolean(ranked && ranked.announced && data.overall.length > 0)
  const pillRank = announcedOverall && ranked ? ranked.overallRank : data.rank === 2 || data.rank === 3 ? data.rank : null
  const overallPill =
    ranked && pillRank !== null && heroPlacing !== "CHAMPION"
      ? `<p style="margin:12px 0 0;text-align:center;"><span style="display:inline-block;padding:4px 12px;border:1px solid ${surface.sans};border-radius:999px;font-family:${BODY_FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${surface.sans};">${esc(resultsOrdinal(pillRank))} overall</span></p>`
      : ""
  // The placing line must never wrap mid-word on a 320px column; the longest
  // real line ("RUNNER-UP IN BREAKTHROUGH") fits at 13px with 2px tracking.
  // There is no `<style>`/media-query in this template (see the file-level
  // note), so sizes are fixed rather than responsive.
  const hero = `
        <tr>
          <td bgcolor="${surface.fallback}" style="background-color:${surface.fallback};background-image:${surface.gradient};padding:32px 24px 28px;border-radius:14px 14px 0 0;text-align:center;">
            <img src="${APP_URL}/images/buildday/mark-${surface.mark}.png" width="200" alt="" style="display:block;margin:0 auto 18px;width:200px;height:auto;border:0;" />
            <p style="margin:0 0 10px;font-family:${DISPLAY_FONT};font-size:40px;line-height:1.05;font-weight:400;letter-spacing:-0.01em;color:${surface.serif};text-align:center;">${esc(data.projectName)}</p>
            <p style="margin:0;font-family:${BODY_FONT};font-size:13px;line-height:1.4;font-weight:600;letter-spacing:2px;text-transform:uppercase;white-space:nowrap;color:${surface.sans};text-align:center;">${esc(heroPlacing)}</p>
            ${overallPill}
            <p style="margin:20px 0 0;font-family:${BODY_FONT};font-size:14px;line-height:1.4;font-weight:600;color:${surface.sans};text-align:center;">${esc(data.eventName)}</p>
            ${data.eventDates ? `<p style="margin:2px 0 0;font-family:${BODY_FONT};font-size:12px;line-height:1.4;font-weight:600;color:${surface.sans};text-align:center;">${esc(data.eventDates)}</p>` : ""}
            ${metaLine ? `<p style="margin:12px 0 0;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${surface.sans};text-align:center;">${metaLine}</p>` : ""}
          </td>
        </tr>`

  // ── Lead sentence ────────────────────────────────────────────────────────
  // Careful with attribution: a track winner may have been decided by score
  // rather than by the panel, so the lead states the placing and nothing
  // about who decided it. The explanatory note lower down covers that.
  // What follows the opening is assembled from what this email actually
  // contains: most teams received no judge note, the community review is
  // never "what the judges wrote", and the test send carries no card. A
  // promise the body cannot keep is worse than a shorter sentence.
  const hasJudgeNotes = (data.judgeNotes ?? []).length > 0
  const hasWinners = data.overall.length > 0 || data.trackWinners.length > 0
  const contents = [
    "how your work was scored",
    hasJudgeNotes ? "what the judges wrote" : null,
    hasWinners ? "the winners" : null,
    data.shareUrl ? "a card you can share" : null,
  ].filter((s): s is string => s !== null)
  const contentsPhrase =
    contents.length === 1
      ? contents[0]
      : `${contents.slice(0, -1).join(", ")} and ${contents[contents.length - 1]}`

  // Second and third overall lead with that, then their track placing;
  // everyone else leads with the track sentence as before.
  const trackPhrase = ranked
    ? ranked.position === 1
      ? `first in the ${esc(ranked.track)} track`
      : `${esc(resultsOrdinal(ranked.position))} of ${ranked.of} in the ${esc(ranked.track)} track`
    : null
  let opening: string
  if (ranked && trackPhrase && (data.rank === 2 || data.rank === 3)) {
    opening = `${esc(data.projectName)} finished ${esc(resultsOrdinal(data.rank))} overall and ${trackPhrase}.`
  } else if (ranked && trackPhrase && ranked.position <= PODIUM_DEPTH) {
    opening = `${esc(data.projectName)} finished ${trackPhrase}.`
  } else {
    opening = `You took ${esc(data.projectName)} from an idea to something the judges could assess in a single day.`
  }
  const lead = `${opening} Below is ${contentsPhrase}.`

  // ── Winners ──────────────────────────────────────────────────────────────
  // Publishing with zero announced winners is a legal (if unusual) state —
  // the publish panel warns rather than blocks it. An empty list renders
  // nothing rather than an empty heading, so the note below never claims a
  // panel decision that didn't happen.
  //
  // One strip of mini cards in the share-card system: the champion (or the
  // overall podium, in podium mode) first, then every track winner, each on
  // the surface its own card gets. Cells are fixed-width inline-block
  // tables so Gmail lays them out in a row that wraps on a phone; Outlook
  // ignores inline-block and stacks them one per row, which is the fallback
  // the design allows. Four cells of 126px plus their margins (520px) sit
  // inside the 536px inner column with room for rounding, and a 480px
  // client wraps after three.
  const CELL_WIDTH = 126
  type WinnerCell = { teamId: string; placing: string; projectName: string; position: 1 | 2 | 3 | 4 }
  const cells: WinnerCell[] =
    mode === "champion"
      ? data.overall.slice(0, 1).map((w) => ({ teamId: w.teamId, placing: "CHAMPION", projectName: w.projectName, position: 1 as const }))
      : data.overall.map((w) => ({
          teamId: w.teamId,
          placing:
            w.rank === 1 ? "WINNER" : w.rank === 2 ? "RUNNER-UP" : w.rank === 3 ? "THIRD PLACE" : `${resultsOrdinal(w.rank).toUpperCase()} OVERALL`,
          projectName: w.projectName,
          position: w.rank === 1 ? 1 : w.rank === 2 ? 2 : w.rank === 3 ? 3 : 4,
        }))
  for (const w of data.trackWinners) {
    cells.push({ teamId: w.teamId, placing: `${w.track.toUpperCase()} WINNER`, projectName: w.projectName, position: 1 })
  }
  // The same surfaces as the hero, by position; a rank past third (should a
  // panel ever announce one) sits on the card's plain dark panel.
  const cellSurface = (position: WinnerCell["position"]) =>
    position === 1
      ? { fallback: CARD_GOLD.mid, gradient: `linear-gradient(165deg, ${CARD_GOLD.from} 0%, ${CARD_GOLD.mid} 55%, ${CARD_GOLD.to} 100%)`, text: CARD_POSTER.ink }
      : position === 2
        ? { fallback: CARD_GRAPHITE.from, gradient: `linear-gradient(180deg, ${CARD_GRAPHITE.from} 0%, ${CARD_GRAPHITE.to} 100%)`, text: CARD_POSTER.paper }
        : position === 3
          ? { fallback: CARD_BRONZE.to, gradient: `linear-gradient(180deg, ${CARD_BRONZE.from} 0%, ${CARD_BRONZE.to} 100%)`, text: CARD_POSTER.paper }
          : { fallback: DARK.card, gradient: "none", text: DARK.text }
  const readerIsAWinner = data.teamId !== undefined && cells.some((c) => c.teamId === data.teamId)
  const winnersSection =
    cells.length > 0
      ? `
            <p style="margin:0 0 10px;font-family:${BODY_FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${DARK.orange};">The winners</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 ${readerIsAWinner ? 8 : 28}px;">
              <tr>
                <td align="center" style="text-align:center;font-size:0;line-height:0;">
                  ${cells
                    .map((c) => {
                      const surface = cellSurface(c.position)
                      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${CELL_WIDTH}" style="display:inline-block;width:${CELL_WIDTH}px;vertical-align:top;margin:0 2px 6px;">
                    <tr>
                      <td bgcolor="${surface.fallback}" style="width:${CELL_WIDTH}px;background-color:${surface.fallback};background-image:${surface.gradient};border-radius:8px;padding:14px 10px 16px;text-align:center;vertical-align:top;">
                        <p style="margin:0 0 6px;min-height:24px;font-family:${BODY_FONT};font-size:9px;line-height:1.3;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${surface.text};text-align:center;">${esc(c.placing)}</p>
                        <p style="margin:0;font-family:${DISPLAY_FONT};font-size:18px;line-height:1.2;color:${surface.text};text-align:center;">${esc(c.projectName)}</p>
                      </td>
                    </tr>
                  </table>`
                    })
                    .join("")}
                </td>
              </tr>
            </table>${
              readerIsAWinner
                ? `
            <p style="margin:0 0 28px;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${DARK.orange};text-align:center;">That is you.</p>`
                : ""
            }`
      : ""
  // Spelled out, matching the original Impact Lab copy's "same five criteria"
  // rather than switching to a numeral once a second rubric exists.
  const CRITERIA_COUNT_WORDS: Record<number, string> = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
    6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
  }
  const criterionCount = data.rubric.criteria.length
  const criteriaPhrase = `the same ${CRITERIA_COUNT_WORDS[criterionCount] ?? criterionCount} criteria`

  // Only an edition whose snapshot shows the panel overriding the score
  // order may claim a deliberation. Otherwise the placings are the scores.
  const entitled = `Your scores are shown here in full because you&#x27;re entitled to see how your own work was assessed.`
  let note: string
  if (mode === "champion") {
    // Neither of the two sentences below fits: "the top three" is a count
    // claim that is false for a single champion, and "follow the scores" is
    // false whenever a track winner was genuinely announced rather than
    // topping its track on average. One neutral sentence, true regardless of
    // whether the scores happened to agree with the panel.
    note = `The champion and each track&#x27;s winner were announced by the judging panel. Everyone else is ranked by score across ${criteriaPhrase} your team was judged on. ${entitled}`
  } else if (data.overall.length === 0) {
    note = `Every project was ranked by score across ${criteriaPhrase} your team was judged on. ${entitled}`
  } else if (data.panelOverrodeScores) {
    note = `The top three placings were decided by the judging panel after they had seen the demos and discussed the projects together. That conversation is what those placings reflect. Everyone else is ranked by score across ${criteriaPhrase} your team was judged on. ${entitled}`
  } else {
    note = `Placings and track winners follow the judging panel&#x27;s scores across ${criteriaPhrase} every team was judged on. ${entitled}`
  }

  // ── Scores ───────────────────────────────────────────────────────────────
  const criterionRows = data.rubric.criteria.map((criterion) => {
    const value = data.criterionAverages[criterion.key]
    const shown = typeof value === "number" ? `${value.toFixed(1)} / ${criterion.max}` : "&mdash;"
    return `
        <tr>
          <td style="padding:7px 0;border-bottom:1px solid ${DARK.hairline};font-family:${BODY_FONT};font-size:13px;color:${DARK.muted};">${esc(criterion.label)}</td>
          <td style="padding:7px 0;border-bottom:1px solid ${DARK.hairline};font-family:${DISPLAY_FONT};font-size:15px;color:${DARK.text};text-align:right;white-space:nowrap;">${shown}</td>
        </tr>`
  }).join("")

  const rangeRow =
    data.low !== null && data.high !== null
      ? `<p style="margin:12px 0 0;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${DARK.dim};">Score range across judges: ${data.low.toFixed(1)}&ndash;${data.high.toFixed(1)} / ${data.rubric.totalOutOf}</p>`
      : ""

  // The team's own position in score order, as a position among the ranked
  // teams ("2nd of 19 overall"), in every announcement mode — Build Day
  // ruling, 2026-09-21: a team is told its own standing, and the note
  // above already says which placings the panel announced and which were
  // ranked by score. `data.rank` is always populated (see buildRanking);
  // `rankedCount` is the denominator when the caller has it.
  const overallPart =
    data.rank > 0
      ? data.rankedCount
        ? `${esc(resultsOrdinal(data.rank))} of ${data.rankedCount} overall`
        : `${esc(resultsOrdinal(data.rank))} overall`
      : null
  const placingLine = [
    overallPart,
    ranked ? `${esc(resultsOrdinal(ranked.position))} of ${ranked.of} in ${esc(ranked.track)}` : null,
  ]
    .filter((s): s is string => Boolean(s))
    .join(" &middot; ")

  // "the demo criterion" only when this rubric actually has one keyed
  // "demo" (Impact Lab's does) — naming a criterion that does not exist
  // under a different rubric would be a plain factual error.
  const demoCriterionPhrase = data.rubric.criteria.some((c) => c.key === "demo")
    ? "the demo criterion"
    : "the relevant criteria"

  const submissionNote =
    data.basis === "submission"
      ? `<p style="margin:0 0 14px;padding:10px 12px;border:1px solid ${DARK.hairline};border-radius:8px;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${DARK.muted};">Your project was reviewed from your written submission against ${criteriaPhrase}. A live demo was not part of that review, which is reflected in ${demoCriterionPhrase} below.</p>`
      : ""

  const scoresSection = `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid ${DARK.hairline};border-radius:10px;">
              <tr>
                <td bgcolor="${DARK.card}" style="background-color:${DARK.card};padding:18px 20px;border-radius:10px;">
                  <p style="margin:0 0 4px;font-family:${BODY_FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${DARK.orange};">Your scores</p>
                  <p style="margin:0 0 12px;font-family:${DISPLAY_FONT};font-size:15px;line-height:1.4;color:${DARK.text};">${placingLine}</p>
                  ${submissionNote}
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${criterionRows}
                  </table>
                  ${rangeRow}
                </td>
              </tr>
            </table>`

  // ── Judge notes, community review ────────────────────────────────────────
  const judgeNotesSection = (data.judgeNotes ?? [])
    .map(
      (judgeNote) => `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
              <tr>
                <td bgcolor="${DARK.orange}" style="width:3px;background-color:${DARK.orange};font-size:0;line-height:0;">&nbsp;</td>
                <td bgcolor="${DARK.card}" style="background-color:${DARK.card};padding:4px 0 4px 16px;">
                  <p style="margin:0 0 6px;font-family:${BODY_FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${DARK.orange};">Judge&#x27;s note &mdash; ${esc(judgeNote.judgeName)}</p>
                  <p style="margin:0;font-family:${DISPLAY_FONT};font-size:16px;font-style:italic;line-height:1.55;color:${DARK.text};">&ldquo;${esc(judgeNote.text).replace(/\n/g, "<br>")}&rdquo;</p>
                </td>
              </tr>
            </table>`
    )
    .join("")

  const reviewSection = data.communityReview
    ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px;border:1px solid ${DARK.goldHairline};border-radius:10px;">
              <tr>
                <td bgcolor="${DARK.card}" style="background-color:${DARK.card};padding:18px 20px;border-radius:10px;">
                  <p style="margin:0 0 10px;font-family:${BODY_FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${DARK.orange};">Community review</p>
                  ${data.communityReview
                    .split(/\n\n+/)
                    .map(
                      (paragraph) =>
                        `<p style="margin:0 0 10px;font-family:${BODY_FONT};font-size:14px;line-height:1.7;color:${DARK.text};">${esc(paragraph).replace(/\n/g, "<br>")}</p>`
                    )
                    .join("")}
                  <p style="margin:8px 0 0;font-family:${DISPLAY_FONT};font-size:14px;color:${DARK.text};">&mdash; ${esc(REVIEW_SIGNATURE)}</p>
                  <p style="margin:4px 0 0;font-family:${BODY_FONT};font-size:11px;line-height:1.6;color:${DARK.muted};">${esc(REVIEW_PROVENANCE)}</p>
                </td>
              </tr>
            </table>`
    : ""

  // ── Calls to action ──────────────────────────────────────────────────────
  // Stacked, one table each. Two buttons in one table row cannot wrap, and
  // together they forced the whole email past 480px on a phone. Both cells
  // share one fixed width and a 1px border (the orange one borders itself),
  // so the pair lines up as two equal blocks instead of two content-sized
  // pills of different heights.
  const CTA_WIDTH = 240
  const shareButton = data.shareUrl
    ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;">
              <tr>
                <td bgcolor="${DARK.orange}" width="${CTA_WIDTH}" style="width:${CTA_WIDTH}px;border-radius:8px;border:1px solid ${DARK.orange};background-color:${DARK.orange};text-align:center;">
                  <a href="${esc(data.shareUrl)}" style="display:block;padding:12px 16px;font-family:${BODY_FONT};font-size:14px;font-weight:600;color:${DARK.ink};text-decoration:none;text-align:center;">Share your result</a>
                </td>
              </tr>
            </table>`
    : ""

  const dashboardButton = `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;">
              <tr>
                <td bgcolor="${DARK.card}" width="${CTA_WIDTH}" style="width:${CTA_WIDTH}px;border-radius:8px;border:1px solid ${DARK.text};background-color:${DARK.card};text-align:center;">
                  <a href="${esc(data.dashboardUrl)}" style="display:block;padding:12px 16px;font-family:${BODY_FONT};font-size:14px;font-weight:600;color:${DARK.text};text-decoration:none;text-align:center;">Open my dashboard</a>
                </td>
              </tr>
            </table>`

  // `word-break:break-all` on the URL only, never the sentence around it: an
  // unbreakable 49-character URL was the one thing holding the layout wider
  // than a phone, and break-all on the paragraph would split the prose too.
  const breakable = (url: string) => `<span style="word-break:break-all;">${esc(url)}</span>`
  // The card itself, under the line that describes it: the square PNG the
  // share page serves (`card/square` beside the page URL), in a full-width
  // cell so it centres, at 480px so it fits the 600px column with the card
  // body's padding. `alt` carries the headline for clients that block
  // remote images by default. Only with a share URL: no card, no image.
  const shareCard = data.shareUrl
    ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0 18px;">
              <tr>
                <td align="center" style="text-align:center;">
                  <a href="${esc(data.shareUrl)}" style="display:inline-block;text-decoration:none;">
                    <img src="${esc(`${data.shareUrl}/card/square`)}" width="480" alt="${esc(shareCardAlt)}" style="display:block;width:100%;max-width:480px;height:auto;border:0;border-radius:12px;" />
                  </a>
                </td>
              </tr>
            </table>`
    : ""
  const shareLine = data.shareUrl
    ? `<p style="margin:0 0 6px;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${DARK.dim};">Your public card shows the placing, the project and your first names with a last initial, never your scores. Post it anywhere: ${breakable(data.shareUrl)}</p>
            ${shareCard}`
    : ""

  // Not wrapped in a `<head>` — this fragment has none, and email clients
  // that read these meta tags at all will accept them ahead of the body
  // markup. Without them, a client that auto-inverts light templates for
  // its own dark mode may try to "fix" a template that is already dark.
  const html = `
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${DARK.bg}" style="width:100%;table-layout:fixed;background-color:${DARK.bg};">
  <tr>
    <td align="center" style="padding:28px 12px;">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${DARK.card}" style="width:100%;max-width:600px;table-layout:fixed;background-color:${DARK.card};border:1px solid ${DARK.hairline};border-radius:14px;">
        <tr>
          <td bgcolor="${DARK.card}" style="background-color:${DARK.card};padding:18px 32px 14px;border-radius:14px 14px 0 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:${DISPLAY_FONT};font-size:15px;font-weight:600;color:${DARK.text};">Claude Community Kenya</td>
                <td style="font-family:${BODY_FONT};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${DARK.dim};text-align:right;">${esc(data.eventName)}</td>
              </tr>
            </table>
          </td>
        </tr>
        ${hero}
        <tr>
          <td bgcolor="${DARK.card}" style="background-color:${DARK.card};padding:28px 32px 32px;border-radius:0 0 14px 14px;">
            <p style="margin:0 0 12px;font-family:${BODY_FONT};font-size:15px;line-height:1.6;color:${DARK.text};">Hi ${esc(titleCaseName(data.fullName))},</p>
            <p style="margin:0 0 24px;font-family:${BODY_FONT};font-size:15px;line-height:1.65;color:${DARK.text};">${lead}</p>

            ${scoresSection}
            ${judgeNotesSection}
            ${reviewSection}
            <p style="margin:0 0 28px;font-family:${BODY_FONT};font-size:12px;line-height:1.7;color:${DARK.muted};">${note}</p>

            ${winnersSection}

            ${shareButton}
            ${dashboardButton}
            ${shareLine}
            <p style="margin:0 0 28px;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${DARK.dim};">If a button doesn&#x27;t work, paste this URL into your browser: ${breakable(data.dashboardUrl)}</p>

            <p style="margin:0;padding-top:16px;border-top:1px solid ${DARK.hairline};font-family:${BODY_FONT};font-size:11px;color:${DARK.dim};">${esc(data.eventName)} &middot; Claude Community Kenya &middot; ${APP_URL}</p>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>`

  return { subject, html }
}

export async function sendApplicationReviewEmail(data: {
  email: string
  name: string
  type: "speaker" | "idea" | "join" | "volunteer" | "demo"
  status: "approved" | "rejected"
  notes?: string
}): Promise<boolean> {
  const statusWord = data.status === "approved" ? "Approved" : "Not Moving Forward"
  const statusColor = data.status === "approved" ? "#00ff41" : "#ff3333"
  const typeLabel =
    data.type === "speaker"
      ? "Speaker Application"
      : data.type === "idea"
      ? "Idea Submission"
      : data.type === "volunteer"
      ? "Volunteer Application"
      : data.type === "demo"
      ? "Demo Request"
      : "Join Application"

  const html = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid ${statusColor};">
      <h2 style="color:${statusColor};">Your ${typeLabel}: ${statusWord}</h2>
      <p>Hi ${esc(data.name)},</p>
      ${
        data.status === "approved"
          ? `<p>Great news! Your ${typeLabel.toLowerCase()} has been approved. We'll be in touch with next steps.</p>`
          : `<p>Thank you for your ${typeLabel.toLowerCase()}. After review, we won't be moving forward at this time.</p>`
      }
      ${data.notes ? `<p><strong>Notes from the team:</strong> ${esc(data.notes)}</p>` : ""}
      <p>Questions? Reach us at <a href="mailto:claudecommunitykenya@gmail.com" style="color:#00ff41;">claudecommunitykenya@gmail.com</a></p>
      <p style="color:#8a8a8a;font-size:12px;">Claude Community Kenya · ${APP_URL}</p>
    </div>
  `
  return sendEmail({
    to: data.email,
    subject: `${typeLabel} Update — Claude Community Kenya`,
    html,
  })
}
