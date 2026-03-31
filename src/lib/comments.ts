import fs from "fs"
import path from "path"
import crypto from "crypto"

export interface CommentReply {
  id: string
  name: string
  text: string
  createdAt: string
}

export interface Comment {
  id: string
  slug: string
  name: string
  email: string
  text: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  replies: CommentReply[]
}

const COMMENTS_FILE = path.join(process.cwd(), "data", "comments.json")

function ensureDataDir() {
  const dir = path.dirname(COMMENTS_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function readAll(): Comment[] {
  ensureDataDir()
  if (!fs.existsSync(COMMENTS_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(COMMENTS_FILE, "utf8"))
  } catch {
    return []
  }
}

function writeAll(comments: Comment[]) {
  ensureDataDir()
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2), "utf8")
}

export function getApprovedBySlug(slug: string): Comment[] {
  return readAll()
    .filter((c) => c.slug === slug && c.status === "approved")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getAllComments(): Comment[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getCommentById(id: string): Comment | undefined {
  return readAll().find((c) => c.id === id)
}

export function addComment(slug: string, name: string, email: string, text: string): Comment {
  const comments = readAll()
  const comment: Comment = {
    id: crypto.randomUUID(),
    slug,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    text: text.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
    replies: [],
  }
  comments.push(comment)
  writeAll(comments)
  return comment
}

export function approveComment(id: string): boolean {
  const comments = readAll()
  const idx = comments.findIndex((c) => c.id === id)
  if (idx === -1) return false
  comments[idx].status = "approved"
  writeAll(comments)
  return true
}

export function rejectComment(id: string): boolean {
  const comments = readAll()
  const idx = comments.findIndex((c) => c.id === id)
  if (idx === -1) return false
  comments[idx].status = "rejected"
  writeAll(comments)
  return true
}

export function addReply(commentId: string, name: string, text: string): CommentReply | null {
  const comments = readAll()
  const idx = comments.findIndex((c) => c.id === commentId)
  if (idx === -1) return null
  const reply: CommentReply = {
    id: crypto.randomUUID(),
    name: name.trim(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  }
  comments[idx].replies.push(reply)
  writeAll(comments)
  return reply
}

export async function notifyNewComment(comment: Comment) {
  const siteUrl = "https://www.kosttilskudsvalg.dk"
  const adminUrl = `${siteUrl}/admin/comments`

  // Slack
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `💬 Ny kommentar på kosttilskudsvalg.dk`,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Ny kommentar* på \`${comment.slug}\`\n*Navn:* ${comment.name}\n*E-mail:* ${comment.email}\n\n> ${comment.text}\n\n<${adminUrl}|Godkend / afvis i admin>`,
              },
            },
          ],
        }),
      })
    } catch (err) {
      console.error("[comments] Slack notification failed:", err)
    }
  }

  // Email via SMTP (optional)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  if (smtpUser && smtpPass) {
    try {
      const nodemailer = await import("nodemailer")
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: smtpUser, pass: smtpPass },
      })
      await transporter.sendMail({
        from: `Kosttilskudsvalg <${smtpUser}>`,
        to: "vendolink@gmail.com",
        subject: "Ny kommentar på kosttilskudsvalg.dk",
        html: `
          <h3>Ny kommentar på <code>${comment.slug}</code></h3>
          <p><strong>Navn:</strong> ${comment.name}<br/>
          <strong>E-mail:</strong> ${comment.email}</p>
          <blockquote style="border-left:3px solid #16a34a;padding:8px 12px;margin:12px 0;background:#f0fdf4">
            ${comment.text}
          </blockquote>
          <p><a href="${adminUrl}">Godkend / afvis i admin</a></p>
        `,
      })
    } catch (err) {
      console.error("[comments] Email notification failed:", err)
    }
  }
}
