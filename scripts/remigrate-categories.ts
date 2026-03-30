/**
 * remigrate-categories.ts
 * 
 * Re-extraherar ENBART kategori-introtexten från SQL-dumpen
 * och skriver temporära filer som rebuild-scriptet kan läsa.
 * 
 * Output: content/category-intros/{slug}.md (bare markdown, ingen frontmatter)
 */

import { promises as fs } from "fs"
import path from "path"
import { createReadStream } from "fs"
import { createInterface } from "readline"

const SQL_FILE = path.join(process.cwd(), "kostmagasinet_dk-db-2026-02-06.sql")
const OUTPUT_DIR = path.join(process.cwd(), "content", "category-intros")

async function main() {
  console.log("=== Re-migrerer kategori-introtekster fra SQL ===\n")

  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const rl = createInterface({
    input: createReadStream(SQL_FILE, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  })

  const categories = new Map<number, { slug: string; title: string; content: string }>()

  for await (const line of rl) {
    if (!line.startsWith("INSERT INTO `SiteTree` VALUES") && !line.startsWith("INSERT INTO `SiteTree_Live` VALUES")) continue

    const tuples = extractTuples(line)
    for (const tuple of tuples) {
      const fields = parseTupleFields(tuple)
      if (fields.length < 25) continue

      const id = parseInt(fields[0])
      const className = fields[1]
      const urlSegment = fields[4]
      const title = fields[5]
      const content = fields[7]

      if (className === "ProductCategoryPage" && urlSegment && content) {
        categories.set(id, {
          slug: urlSegment,
          title,
          content: htmlToMd(content),
        })
      }
    }
  }

  console.log(`Fandt ${categories.size} kategorier med indhold\n`)

  let written = 0
  for (const [, cat] of categories) {
    const outPath = path.join(OUTPUT_DIR, `${cat.slug}.md`)
    const md = `# ${cat.title}\n\n${cat.content}`
    await fs.writeFile(outPath, md, "utf-8")
    written++
  }

  console.log(`Skrev ${written} intro-filer til ${OUTPUT_DIR}`)
}

function extractTuples(line: string): string[] {
  const idx = line.indexOf("VALUES ")
  if (idx === -1) return []
  const rest = line.substring(idx + 7)
  const tuples: string[] = []
  let depth = 0, start = -1, inStr = false, esc = false
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i]
    if (esc) { esc = false; continue }
    if (ch === "\\") { esc = true; continue }
    if (ch === "'" && !inStr) { inStr = true; continue }
    if (ch === "'" && inStr) { inStr = false; continue }
    if (inStr) continue
    if (ch === "(") { if (depth === 0) start = i + 1; depth++ }
    else if (ch === ")") { depth--; if (depth === 0 && start >= 0) { tuples.push(rest.substring(start, i)); start = -1 } }
  }
  return tuples
}

function parseTupleFields(tuple: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i < tuple.length) {
    while (i < tuple.length && (tuple[i] === "," || tuple[i] === " ")) i++
    if (i >= tuple.length) break
    if (tuple[i] === "'") {
      i++
      let val = ""
      while (i < tuple.length) {
        if (tuple[i] === "\\" && i + 1 < tuple.length) { val += tuple[i + 1]; i += 2 }
        else if (tuple[i] === "'") { i++; break }
        else { val += tuple[i]; i++ }
      }
      fields.push(val)
    } else {
      let val = ""
      while (i < tuple.length && tuple[i] !== ",") { val += tuple[i]; i++ }
      fields.push(val.trim())
    }
  }
  return fields
}

function htmlToMd(html: string): string {
  if (!html) return ""
  let t = html
  t = t.replace(/<a\s+href="\[sitetree_link,id=\d+\]"[^>]*>(.*?)<\/a>/gi, "$1")
  t = t.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
  t = t.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
  t = t.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n")
  t = t.replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
  t = t.replace(/<b>(.*?)<\/b>/gi, "**$1**")
  t = t.replace(/<em>(.*?)<\/em>/gi, "*$1*")
  t = t.replace(/<i>(.*?)<\/i>/gi, "*$1*")
  t = t.replace(/<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
  t = t.replace(/<br\s*\/?>/gi, "\n")
  t = t.replace(/<p[^>]*>(.*?)<\/p>/gis, "\n$1\n")
  t = t.replace(/<ul[^>]*>/gi, "")
  t = t.replace(/<\/ul>/gi, "")
  t = t.replace(/<ol[^>]*>/gi, "")
  t = t.replace(/<\/ol>/gi, "")
  t = t.replace(/<li[^>]*>(.*?)<\/li>/gis, "- $1")
  t = t.replace(/<[^>]+>/g, "")
  t = t.replace(/\n{3,}/g, "\n\n")
  return t.trim()
}

main().catch(e => { console.error(e); process.exit(1) })
