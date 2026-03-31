import { NextRequest, NextResponse } from "next/server"
import { approveComment } from "@/lib/comments"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ok = approveComment(id)
  if (!ok) return NextResponse.json({ error: "Kommentar ikke fundet" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
