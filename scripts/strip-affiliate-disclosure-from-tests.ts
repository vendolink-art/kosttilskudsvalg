/**
 * strip-affiliate-disclosure-from-tests.ts
 *
 * Removes `<AffiliateDisclosure />` from generated category test MDX files.
 * The disclosure is now rendered globally between EEATBox (authorbox) and the
 * small toplist in the page wrappers.
 *
 * Run:
 *   npx tsx scripts/strip-affiliate-disclosure-from-tests.ts
 */

import { promises as fs } from "fs"
import path from "path"

const BASE_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")

async function main() {
  const entries = await fs.readdir(BASE_DIR, { withFileTypes: true })
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name)

  let changed = 0
  let untouched = 0
  let skipped = 0

  for (const slug of slugs) {
    const file = path.join(BASE_DIR, slug, "page.mdx")
    let raw = ""
    try {
      raw = await fs.readFile(file, "utf8")
    } catch {
      skipped++
      continue
    }

    if (!raw.includes("<AffiliateDisclosure")) {
      untouched++
      continue
    }

    // Remove the component line and collapse excessive blank lines.
    const lines = raw.split(/\r?\n/)
    const out: string[] = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === "<AffiliateDisclosure />" || line.trim() === "<AffiliateDisclosure/>") {
        // Skip this line; also skip one following blank line if present.
        if (lines[i + 1]?.trim() === "") i++
        continue
      }
      out.push(line)
    }
    const next = out.join("\n").replace(/\n{3,}/g, "\n\n")

    if (next.trim() === raw.trim()) {
      untouched++
      continue
    }

    await fs.writeFile(file, next, "utf8")
    changed++
  }

  console.log(`Done. changed=${changed} untouched=${untouched} skipped=${skipped} total=${slugs.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

