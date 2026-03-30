import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { isAuthenticated } from "@/lib/auth"

export async function POST(request: Request) {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 })
  }

  try {
    const { slug, content, allowLegacyOverwrite } = await request.json()

    if (!slug || !content) {
      return NextResponse.json({ error: "slug og content er påkrævet" }, { status: 400 })
    }

    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      return NextResponse.json({ error: "Ugyldigt slug-format" }, { status: 400 })
    }

    const filePath = path.join(
      process.cwd(), "src", "app", "(da)", "kosttilskud", slug, "page.mdx"
    )

    // Guardrail: legacy layout pages must be rebuilt via rebuild pipeline,
    // not overwritten directly by raw /api/ai/generate publish.
    let existingRaw = ""
    try {
      existingRaw = await fs.readFile(filePath, "utf-8")
    } catch {
      existingRaw = ""
    }
    const isLegacyLayoutPage =
      existingRaw.includes("toplist-mobile") ||
      existingRaw.includes("toplist-desktop") ||
      existingRaw.includes("<Toc />") ||
      existingRaw.includes("<ComparisonTable")
    if (isLegacyLayoutPage && !allowLegacyOverwrite) {
      return NextResponse.json(
        {
          error:
            "Denne kategori bruger legacy-layout. Brug hybrid-flow (crawl -> product rewrite -> rebuild) i stedet for direkte publish.",
        },
        { status: 409 },
      )
    }

    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(filePath, content, "utf-8")

    return NextResponse.json({ ok: true, slug })
  } catch {
    return NextResponse.json({ error: "Fejl ved publicering" }, { status: 500 })
  }
}
