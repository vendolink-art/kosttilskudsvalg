import { NextResponse } from "next/server"
import { getAllComments } from "@/lib/comments"

export async function GET() {
  return NextResponse.json(getAllComments())
}
