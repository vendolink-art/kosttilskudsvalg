import { NextRequest, NextResponse } from "next/server"
import { addComment, getApprovedBySlug, notifyNewComment } from "@/lib/comments"

const SLUG_RE = /^[a-z0-9-]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { slug, name, email, text } = body as Record<string, string>

    if (!slug || !SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Ugyldigt slug" }, { status: 400 })
    }
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Navn er påkrævet (mindst 2 tegn)" }, { status: 400 })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Ugyldig e-mailadresse" }, { status: 400 })
    }
    if (!text || text.trim().length < 5) {
      return NextResponse.json({ error: "Kommentar er påkrævet (mindst 5 tegn)" }, { status: 400 })
    }
    if (text.trim().length > 2000) {
      return NextResponse.json({ error: "Kommentar er for lang (maks 2000 tegn)" }, { status: 400 })
    }

    const comment = addComment(slug, name, email, text)

    notifyNewComment(comment).catch((err) =>
      console.error("[comments] notification error:", err)
    )

    return NextResponse.json({ ok: true, id: comment.id })
  } catch {
    return NextResponse.json({ error: "Ugyldig forespørgsel" }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug")
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Ugyldigt slug" }, { status: 400 })
  }
  const comments = getApprovedBySlug(slug)
  return NextResponse.json(comments)
}
