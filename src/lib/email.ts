/**
 * Email Helper Library — Claude Community Kenya
 * Uses Resend for transactional emails.
 */

import { Resend } from "resend"

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
      <p>In the meantime, join our community on <a href="https://discord.gg/AVAyYCbJ" style="color:#00ff41;">Discord</a>.</p>
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
      <p>Join our <a href="https://discord.gg/AVAyYCbJ" style="color:#00ff41;">Discord community</a> to connect with other builders now.</p>
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

export async function sendJoinApplicationNotification(data: {
  name: string
  email: string
}): Promise<boolean> {
  const adminHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">New Join Application</h2>
      <p><strong>Name:</strong> ${esc(data.name)}</p>
      <p><strong>Email:</strong> ${esc(data.email)}</p>
      <p><a href="${APP_URL}/admin/applications" style="color:#00ff41;">Review in Admin Dashboard →</a></p>
    </div>
  `
  const applicantHtml = `
    <div style="font-family:monospace;background:#0a0a0a;color:#e0e0e0;padding:24px;border-radius:8px;border:1px solid #00ff41;">
      <h2 style="color:#00ff41;">Welcome to Claude Community Kenya!</h2>
      <p>Hi ${esc(data.name)},</p>
      <p>Your application has been received. We'll review it and add you to the community.</p>
      <p>While you wait, join our Discord for instant access to the community:</p>
      <p><a href="https://discord.gg/AVAyYCbJ" style="color:#00ff41;font-size:18px;">Join Discord →</a></p>
      <p style="color:#8a8a8a;font-size:12px;">Claude Community Kenya · ${APP_URL}</p>
    </div>
  `
  const [adminSent] = await Promise.all([
    sendEmail({
      to: EMAIL_TO_ADMIN,
      subject: `New Join Application: ${data.name}`,
      html: adminHtml,
    }),
    sendEmail({
      to: data.email,
      subject: "Application Received — Claude Community Kenya",
      html: applicantHtml,
    }),
  ])
  return adminSent
}

export async function sendApplicationReviewEmail(data: {
  email: string
  name: string
  type: "speaker" | "idea" | "join"
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
