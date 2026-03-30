import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { execFile as execFileCb } from "child_process"
import { promisify } from "util"
import { isAuthenticated } from "@/lib/auth"

const execFile = promisify(execFileCb)
const MANUAL_PRODUCT_INFO_FILE = path.join(process.cwd(), "content", "manual-product-info.json")

const SAFE_SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Obehörig" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const category = String(body?.category || "").trim()
    const slug = String(body?.slug || "").trim()
    const infoInput = String(body?.info || "").trim()
    if (!category || !slug || !infoInput) {
      return NextResponse.json({ error: "Saknar category, slug eller info" }, { status: 400 })
    }

    if (!SAFE_SLUG_RE.test(category)) {
      return NextResponse.json({ error: "Ugyldigt kategori-format" }, { status: 400 })
    }
    if (!SAFE_SLUG_RE.test(slug)) {
      return NextResponse.json({ error: "Ugyldigt slug-format" }, { status: 400 })
    }

    let current: Record<string, string> = {}
    try {
      const raw = await fs.readFile(MANUAL_PRODUCT_INFO_FILE, "utf8")
      current = JSON.parse(raw.replace(/^\uFEFF/, ""))
    } catch {
      current = {}
    }

    const existing = (current[slug] || "").trim()
    const merged = existing
      ? `${existing}\n\n${infoInput}`
      : infoInput

    current[slug] = merged
    await fs.writeFile(MANUAL_PRODUCT_INFO_FILE, JSON.stringify(current, null, 2), "utf8")

    await execFile("npx", ["tsx", "scripts/rebuild-category-pages.ts", category], {
      cwd: process.cwd(),
      timeout: 180000,
      windowsHide: true,
      shell: process.platform === "win32",
    })

    return NextResponse.json({
      ok: true,
      message: `Sparat och uppdaterat kategori ${category}`,
      category,
      slug,
      mergedLength: merged.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Kunde inte spara/uppdatera" },
      { status: 500 },
    )
  }
}

