/**
 * Email Helper Library — Claude Community Kenya
 * Uses Resend for transactional emails.
 */

import { Resend } from "resend"
import { VOLUNTEER_ROLE_LABELS as SHARED_VOLUNTEER_ROLE_LABELS } from "@/lib/volunteer-roles"
import { JUDGING_CRITERIA } from "@/lib/impact-lab/judging"
import type { AnnouncedWinner, ResultsTrackWinner } from "@/lib/impact-lab/results"
import {
  REVIEW_PROVENANCE,
  REVIEW_SIGNATURE,
  type TeamJudgeNote,
} from "@/lib/impact-lab/reviews"

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

/** Matches the ordinal shown on the dashboard's results page (ResultsView.tsx) exactly. */
const RESULTS_ORDINALS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" }
function resultsOrdinal(rank: number): string {
  return RESULTS_ORDINALS[rank] ?? `${rank}th`
}

/**
 * Impact Lab: the results email. Nine of the 93 recipients never created a
 * dashboard account, so this has to stand alone — the winners and the
 * recipient's own scorecard are written out in full in the body, not just
 * linked. Everything passed in here must come from the stored results
 * snapshot (see `resultsSnapshot` on ImpactLabMatchRun), never recomputed
 * from live scores or submissions, because live data moves after publication
 * and what 93 people are told must not move with it.
 *
 * Table-based layout with inline styles throughout — email clients ignore
 * `<style>` blocks and Tailwind entirely, and this is read on phones and in
 * Outlook as often as in a browser. No web fonts, no external images. Every
 * text element sets its own `color`, and every box that a client's dark-mode
 * remapping could independently repaint (the two wrapper tables and the
 * content cell they wrap) sets its own `background-color` rather than
 * relying on inheritance — some clients decide light/dark per node from its
 * own inline style, not from the resolved/inherited value.
 *
 * No judge counts and no deadline language anywhere in this template — those
 * are the two things Impact Lab copy must never say.
 */
export function impactLabResultsEmail(data: {
  fullName: string
  projectName: string
  rank: number
  criterionAverages: Record<string, number>
  low: number | null
  high: number | null
  basis: "demo" | "submission"
  overall: AnnouncedWinner[]
  trackWinners: ResultsTrackWinner[]
  dashboardUrl: string
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
}): { subject: string; html: string } {
  // Publishing with zero announced winners is a legal (if unusual) state —
  // the publish panel warns rather than blocks it. Guard each block the same
  // way ResultsView.tsx does, so an empty list renders nothing rather than an
  // empty heading, and so the note below never claims a panel decision that
  // didn't happen.
  const winnersSection =
    data.overall.length > 0
      ? `
            <p style="margin:0 0 8px;font-family:monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;">Winners</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
              ${data.overall
                .map(
                  (w) => `
              <tr>
                <td style="padding:6px 0;font-family:monospace,monospace;font-size:13px;color:#ffb000;white-space:nowrap;width:56px;">${esc(resultsOrdinal(w.rank))}</td>
                <td style="padding:6px 0;font-family:monospace,monospace;font-size:13px;color:#e0e0e0;">${esc(w.projectName)}</td>
              </tr>`
                )
                .join("")}
            </table>`
      : ""

  const trackSection =
    data.trackWinners.length > 0
      ? `
            <p style="margin:0 0 8px;font-family:monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;">Track winners</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
              ${data.trackWinners
                .map(
                  (w) => `
              <tr>
                <td style="padding:6px 0;font-family:monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#00d4ff;white-space:nowrap;width:150px;">${esc(w.track)}</td>
                <td style="padding:6px 0;font-family:monospace,monospace;font-size:13px;color:#e0e0e0;">${esc(w.projectName)}</td>
              </tr>`
                )
                .join("")}
            </table>`
      : ""

  const note =
    data.overall.length > 0
      ? "The top three placings were decided by the judging panel after they had seen the demos and discussed the projects together — that conversation is what those placings reflect. Everyone else is ranked by score across the same five criteria your team was judged on. Scores are shown here in full because you're entitled to see how your own work was assessed."
      : "Every project was ranked by score across the same five criteria your team was judged on. Scores are shown here in full because you're entitled to see how your own work was assessed."

  const criterionRows = JUDGING_CRITERIA.map((criterion) => {
    const value = data.criterionAverages[criterion.key]
    const shown = typeof value === "number" ? `${value.toFixed(1)} / 5` : "—"
    return `
        <tr>
          <td style="padding:5px 0;font-family:monospace,monospace;font-size:12px;color:#888;">${esc(criterion.label)}</td>
          <td style="padding:5px 0;font-family:monospace,monospace;font-size:12px;color:#e0e0e0;text-align:right;white-space:nowrap;">${shown}</td>
        </tr>`
  }).join("")

  const rangeRow =
    data.low !== null && data.high !== null
      ? `<p style="margin:10px 0 0;font-family:monospace,monospace;font-size:11px;color:#888;">Score range across judges: ${data.low.toFixed(1)}–${data.high.toFixed(1)}</p>`
      : ""

  const judgeNotesSection = (data.judgeNotes ?? [])
    .map(
      (note) => `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;border:1px solid #3a2d00;border-radius:6px;">
              <tr>
                <td style="padding:14px 16px;">
                  <p style="margin:0 0 6px;font-family:monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#ffb000;">Judge&#x27;s note — ${esc(note.judgeName)}</p>
                  <p style="margin:0;font-family:monospace,monospace;font-size:13px;font-style:italic;line-height:1.6;color:#e0e0e0;">&ldquo;${esc(note.text).replace(/\n/g, "<br>")}&rdquo;</p>
                </td>
              </tr>
            </table>`
    )
    .join("")

  const reviewSection = data.communityReview
    ? `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid #1e1e1e;border-radius:6px;">
              <tr>
                <td style="padding:16px 18px;">
                  <p style="margin:0 0 10px;font-family:monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#00d4ff;">Impact Lab review</p>
                  ${data.communityReview
                    .split(/\n\n+/)
                    .map(
                      (paragraph) =>
                        `<p style="margin:0 0 10px;font-family:monospace,monospace;font-size:13px;line-height:1.7;color:#e0e0e0;">${esc(paragraph).replace(/\n/g, "<br>")}</p>`
                    )
                    .join("")}
                  <p style="margin:8px 0 0;font-family:monospace,monospace;font-size:12px;color:#e0e0e0;">— ${esc(REVIEW_SIGNATURE)}</p>
                  <p style="margin:4px 0 0;font-family:monospace,monospace;font-size:11px;line-height:1.6;color:#888;">${esc(REVIEW_PROVENANCE)}</p>
                </td>
              </tr>
            </table>`
    : ""

  const submissionNote =
    data.basis === "submission"
      ? `<p style="margin:0 0 14px;font-family:monospace,monospace;font-size:12px;line-height:1.6;color:#888;border:1px solid #1e1e1e;border-radius:4px;padding:10px 12px;">Your project was reviewed from your written submission against the same five criteria. A live demo was not part of that review, which is reflected in the demo criterion below.</p>`
      : ""

  const html = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0a0a0a;padding:24px 0;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#0d0d0d;border:1px solid #00ff41;border-radius:8px;">
        <tr>
          <td style="padding:32px 28px;background-color:#0d0d0d;">
            <p style="margin:0 0 4px;font-family:monospace,monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#00ff41;">Impact Lab: AI Mashinani</p>
            <h1 style="margin:0 0 20px;font-family:monospace,monospace;font-size:22px;color:#e0e0e0;">Your results are in</h1>

            <p style="margin:0 0 20px;font-family:monospace,monospace;font-size:14px;line-height:1.6;color:#e0e0e0;">Hi ${esc(data.fullName)},</p>
            ${winnersSection}
            ${trackSection}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid #1e1e1e;border-radius:6px;">
              <tr>
                <td style="padding:18px;">
                  <p style="margin:0 0 2px;font-family:monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#00ff41;">Your team</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">
                    <tr>
                      <td style="font-family:monospace,monospace;font-size:17px;font-weight:bold;color:#e0e0e0;">${esc(data.projectName)}</td>
                      <td style="font-family:monospace,monospace;font-size:12px;color:#888;text-align:right;white-space:nowrap;">${esc(resultsOrdinal(data.rank))} overall</td>
                    </tr>
                  </table>
                  ${submissionNote}
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${criterionRows}
                  </table>
                  ${rangeRow}
                </td>
              </tr>
            </table>
            ${judgeNotesSection}
            ${reviewSection}
            <p style="margin:0 0 20px;font-family:monospace,monospace;font-size:12px;line-height:1.7;color:#888;">${note}</p>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">
              <tr>
                <td style="border-radius:4px;background-color:#00ff41;">
                  <a href="${esc(data.dashboardUrl)}" style="display:inline-block;padding:12px 24px;font-family:monospace,monospace;font-size:13px;font-weight:bold;color:#0a0a0a;text-decoration:none;">Open my dashboard →</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 24px;font-family:monospace,monospace;font-size:11px;color:#888;">If the button doesn't work, paste this URL into your browser:<br>${esc(data.dashboardUrl)}</p>

            <p style="margin:0;font-family:monospace,monospace;font-size:11px;color:#555;">Claude Community Kenya · ${APP_URL}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`

  return { subject: "Impact Lab: your results are in", html }
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
