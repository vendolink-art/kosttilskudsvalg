import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { isAuthenticated } from "@/lib/auth"

const ALLOWED_EXTENSIONS = new Set([
  ".mdx", ".md", ".json", ".tsx", ".ts", ".jsx", ".js", ".css",
])

export async function POST(request: Request) {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 })
  }

  try {
    const { filePath, content } = await request.json()

    if (!filePath || typeof filePath !== "string" || !content) {
      return NextResponse.json({ error: "filePath og content er påkrævet" }, { status: 400 })
    }

    if (/\x00/.test(filePath)) {
      return NextResponse.json({ error: "Ugyldig filsti" }, { status: 400 })
    }

    const ext = path.extname(filePath).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Filtype ${ext || "(ingen)"} er ikke tilladt` },
        { status: 403 },
      )
    }

    const projectRoot = process.cwd()
    const absPath = path.resolve(projectRoot, filePath)

    const rel = path.relative(projectRoot, absPath)
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return NextResponse.json({ error: "Stien peger uden for projektet" }, { status: 403 })
    }

    const ALLOWED_DIRS = [
      path.join(projectRoot, "src", "app"),
      path.join(projectRoot, "content"),
    ]
    const inAllowedDir = ALLOWED_DIRS.some(
      (dir) => absPath === dir || absPath.startsWith(dir + path.sep),
    )
    if (!inAllowedDir) {
      return NextResponse.json({ error: "Skrivning kun tilladt i src/app og content" }, { status: 403 })
    }

    const dir = path.dirname(absPath)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(absPath, content, "utf-8")

    return NextResponse.json({ ok: true, path: filePath })
  } catch (error) {
    return NextResponse.json({ error: "Fejl ved skrivning" }, { status: 500 })
  }
}
