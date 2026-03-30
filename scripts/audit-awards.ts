import { promises as fs } from "fs"
import path from "path"

const ROOT = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")

const WEAK_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: "legacy_generic", re: /\b(TOPPLACERING|HØJ TESTSCORE|TOPSCORE BLANDT ALTERNATIVER|ANBEFALET|VÆRD AT OVERVEJE)\b/i },
  { name: "broad_fallback", re: /\b(ALSIDIGT VALG I|STABILT HVERDAGSVALG I)\b/i },
]

function extractAwardLabels(raw: string): string[] {
  const labels: string[] = []
  for (const m of raw.matchAll(/\(\d+(?:\.\d+)?\/10\s+•\s+([^)]+)\)/g)) {
    labels.push((m[1] || "").trim())
  }
  return labels
}

async function listMdxFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const out: string[] = []
  for (const entry of entries) {
    if (entry.name === "[slug]" || entry.name === "produkter") continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const child = path.join(abs, "page.mdx")
      try {
        await fs.access(child)
        out.push(child)
      } catch {}
    }
  }
  return out
}

async function main() {
  const files = await listMdxFiles(ROOT)
  const findings: Array<{ file: string; pattern: string; matches: number }> = []
  for (const file of files) {
    const raw = await fs.readFile(file, "utf8")
    const labels = extractAwardLabels(raw)
    const joined = labels.join("\n")
    for (const p of WEAK_PATTERNS) {
      const matches = joined.match(new RegExp(p.re.source, "gi"))?.length || 0
      if (matches > 0) findings.push({ file: file.replace(process.cwd() + path.sep, ""), pattern: p.name, matches })
    }
  }

  const totalWeak = findings.reduce((sum, x) => sum + x.matches, 0)
  console.log(`Audited ${files.length} category pages`)
  console.log(`Weak-award hits: ${totalWeak}`)
  if (findings.length === 0) {
    console.log("No weak award patterns found.")
    return
  }

  for (const row of findings.sort((a, b) => b.matches - a.matches)) {
    console.log(`- ${row.pattern}: ${row.matches} in ${row.file}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

