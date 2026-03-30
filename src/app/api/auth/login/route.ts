import { NextResponse } from "next/server"
import { login } from "@/lib/auth"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const rl = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: "For mange loginforsøg. Prøv igen om lidt." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)),
        },
      },
    )
  }

  try {
    const { username, password } = await request.json()
    const success = await login(username, password)

    if (success) {
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json(
      { error: "Forkert brugernavn eller adgangskode" },
      { status: 401 },
    )
  } catch {
    return NextResponse.json({ error: "Ugyldig anmodning" }, { status: 400 })
  }
}
