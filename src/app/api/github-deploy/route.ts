import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import crypto from "crypto"

let lastDeployTime = 0

function verifySignature(payload: string, signature: string | null): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret || !signature) return false

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex")

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  } catch {
    return false
  }
}

function runDeploy() {
  const cwd = process.cwd()
  console.log("[github-deploy] Launching deploy.sh via setsid...")

  exec(
    'nohup setsid bash scripts/deploy.sh >> deploy.log 2>&1 &',
    { cwd },
    (err) => {
      if (err) console.error("[github-deploy] Failed to launch:", err.message)
    }
  )

  lastDeployTime = Date.now()
  console.log("[github-deploy] Deploy script launched, log: deploy.log")
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("x-hub-signature-256")

  if (!verifySignature(body, signature)) {
    console.warn("[github-deploy] Invalid signature — rejected")
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
  }

  const event = request.headers.get("x-github-event")
  if (event === "ping") {
    return NextResponse.json({ ok: true, message: "Pong! Webhook is active." })
  }

  if (event !== "push") {
    return NextResponse.json({ ok: true, message: `Ignored event: ${event}` })
  }

  const payload = JSON.parse(body)
  const branch = payload.ref?.replace("refs/heads/", "") || ""

  if (branch !== "main") {
    return NextResponse.json({
      ok: true,
      message: `Ignored push to ${branch}`,
    })
  }

  const autoDeployEnabled = process.env.AUTO_DEPLOY_ENABLED === "true"
  const commitMsg = payload.head_commit?.message?.split("\n")[0] || ""

  if (!autoDeployEnabled) {
    console.log(
      `[github-deploy] Auto-deploy disabled. Ignoring push "${commitMsg}" on ${branch}`
    )
    return NextResponse.json({
      ok: true,
      message: "Auto-deploy disabled (manual deploy required)",
      commit: commitMsg,
      branch,
    })
  }

  if (Date.now() - lastDeployTime < 60000) {
    console.log("[github-deploy] Too soon since last deploy — skipping")
    return NextResponse.json({
      ok: true,
      message: "Too soon since last deploy",
    })
  }

  runDeploy()

  const pusher = payload.pusher?.name || "unknown"
  console.log(
    `[github-deploy] Triggered by ${pusher}: "${commitMsg}" → ${branch}`
  )

  return NextResponse.json({
    ok: true,
    message: `Deploy started for ${branch}`,
    commit: commitMsg,
  })
}

export async function GET() {
  return new Response(null, { status: 204 })
}
