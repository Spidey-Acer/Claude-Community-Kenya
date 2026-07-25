/**
 * Email Helper Library — Claude Community Kenya
 * Uses Resend for transactional emails.
 */

import { Resend } from "resend"
import { VOLUNTEER_ROLE_LABELS as SHARED_VOLUNTEER_ROLE_LABELS } from "@/lib/volunteer-roles"

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
const APP_URL = process.env.NEXTAUTH_URL || "https://www.claudekenya.org"

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
