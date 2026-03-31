import { NextRequest, NextResponse } from "next/server"
import { addReply } from "@/lib/comments"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { name, text } = body as Record<string, string>

  if (!name || !text || text.trim().length < 2) {
    return NextResponse.json({ error: "Navn og svar er påkrævet" }, { status: 400 })
  }

  const reply = addReply(id, name, text)
  if (!reply) return NextResponse.json({ error: "Kommentar ikke fundet" }, { status: 404 })
  return NextResponse.json({ ok: true, reply })
}
