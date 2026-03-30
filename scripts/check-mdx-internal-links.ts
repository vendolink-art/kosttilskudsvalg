/**
 * Scans product content.mdx and category page.mdx for internal href="/..." links
 * and reports ones that fail category / silo / product resolution rules.
 *
 * Run: npx tsx scripts/check-mdx-internal-links.ts
 */

import { promises as fs } from "fs"
import path from "path"
import { SLUG_TO_SILO, SILOS, type SiloId } from "../src/lib/silo-config"

const ROOT = process.cwd()
const KOSTTILSKUD = path.join(ROOT, "src", "app", "(da)", "kosttilskud")
const DA_APP = path.join(ROOT, "src", "app", "(da)")

const SILO_IDS = new Set<SiloId>(Object.keys(SILOS) as SiloId[])

/** href="/..." or href='/...' */
const HREF_RE = /href\s*=\s*(["'])(\/[^"']*)\1/g

function normalizeSegments(hrefPath: string): string[] | null {
  const trimmed = hrefPath.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null
  try {
    const url = new URL(trimmed, "https://placeholder.local")
    let p = url.pathname
    while (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1)
    return p === "/" ? [] : p.split("/").filter(Boolean)
  } catch {
    return null
  }
}

async function listCategorySlugs(): Promise<Set<string>> {
  const names = await fs.readdir(KOSTTILSKUD, { withFileTypes: true })
  const out = new Set<string>()
  for (const d of names) {
    if (!d.isDirectory()) continue
    const n = d.name
    if (n === "produkter" || n === "[slug]") continue
    out.add(n)
  }
  return out
}

async function listProductSlugs(): Promise<Set<string>> {
  const produkter = path.join(KOSTTILSKUD, "produkter")
  const names = await fs.readdir(produkter, { withFileTypes: true })
  const out = new Set<string>()
  for (const d of names) {
    if (d.isDirectory()) out.add(d.name)
  }
  return out
}

async function siloRootExists(silo: string): Promise<boolean> {
  try {
    const st = await fs.stat(path.join(DA_APP, silo))
    return st.isDirectory()
  } catch {
    return false
  }
}

/** true = OK, false = dead, null = not a handled pattern (do not report) */
function checkHandledLink(
  segments: string[],
  categorySlugs: Set<string>,
  productSlugs: Set<string>,
): boolean | null {
  if (segments.length === 0) {
    return true
  }

  if (segments[0] === "kosttilskud") {
    if (segments[1] === "produkter") {
      if (segments.length === 3 && segments[2]) {
        return productSlugs.has(segments[2])
      }
      return null
    }
    if (segments.length === 2 && segments[1]) {
      return categorySlugs.has(segments[1])
    }
    return null
  }

  if (segments.length === 2 && segments[0] && segments[1]) {
    const silo = segments[0] as SiloId
    const slug = segments[1]
    if (SILO_IDS.has(silo)) {
      if (!categorySlugs.has(slug)) return false
      return SLUG_TO_SILO[slug] === silo
    }
  }

  if (segments.length === 1 && segments[0]) {
    const s = segments[0]
    if (categorySlugs.has(s)) return true
    if (SILO_IDS.has(s as SiloId)) return true
    return false
  }

  return null
}

function contextAround(content: string, start: number, end: number, radius = 80): string {
  const a = Math.max(0, start - radius)
  const b = Math.min(content.length, end + radius)
  return content
    .slice(a, b)
    .replace(/\s+/g, " ")
    .trim()
}

async function collectMdxFiles(): Promise<string[]> {
  const files: string[] = []

  const produkter = path.join(KOSTTILSKUD, "produkter")
  const prodDirs = await fs.readdir(produkter, { withFileTypes: true })
  for (const d of prodDirs) {
    if (!d.isDirectory()) continue
    const f = path.join(produkter, d.name, "content.mdx")
    try {
      await fs.access(f)
      files.push(f)
    } catch {
      /* no content.mdx */
    }
  }

  const catDirs = await fs.readdir(KOSTTILSKUD, { withFileTypes: true })
  for (const d of catDirs) {
    if (!d.isDirectory() || d.name === "produkter" || d.name === "[slug]") continue
    const f = path.join(KOSTTILSKUD, d.name, "page.mdx")
    try {
      await fs.access(f)
      files.push(f)
    } catch {
      /* no page.mdx */
    }
  }

  return files
}

async function main() {
  const dead: { file: string; href: string; context: string }[] = []

  let categorySlugs: Set<string>
  let productSlugs: Set<string>
  try {
    categorySlugs = await listCategorySlugs()
    productSlugs = await listProductSlugs()
  } catch (e) {
    console.error(String(e))
    process.exitCode = 1
    console.log(JSON.stringify([], null, 2))
    return
  }

  const siloRootsOk = new Map<string, boolean>()
  for (const id of SILO_IDS) {
    siloRootsOk.set(id, await siloRootExists(id))
  }

  let files: string[]
  try {
    files = await collectMdxFiles()
  } catch (e) {
    console.error(String(e))
    process.exitCode = 1
    console.log(JSON.stringify([], null, 2))
    return
  }

  for (const file of files) {
    let content: string
    try {
      content = await fs.readFile(file, "utf8")
    } catch {
      continue
    }

    HREF_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = HREF_RE.exec(content)) !== null) {
      const href = m[2]
      const matchStart = m.index
      const matchEnd = m.index + m[0].length

      const segments = normalizeSegments(href)
      if (segments === null) continue

      if (segments.length === 1 && SILO_IDS.has(segments[0] as SiloId)) {
        if (!siloRootsOk.get(segments[0])) {
          dead.push({
            file: path.relative(ROOT, file).replace(/\\/g, "/"),
            href,
            context: contextAround(content, matchStart, matchEnd),
          })
        }
        continue
      }

      const result = checkHandledLink(segments, categorySlugs, productSlugs)
      if (result === null) continue
      if (result === false) {
        dead.push({
          file: path.relative(ROOT, file).replace(/\\/g, "/"),
          href,
          context: contextAround(content, matchStart, matchEnd),
        })
      }
    }
  }

  console.log(JSON.stringify(dead, null, 2))
}

main().catch((e) => {
  console.error(e)
  console.log(JSON.stringify([], null, 2))
  process.exitCode = 1
})
