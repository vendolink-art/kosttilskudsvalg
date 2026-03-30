/**
 * dedupe-product-tables.ts
 * 
 * Removes duplicate product rows from category MDX files.
 * The SQL dump contained both SiteTree and SiteTree_Live, causing duplicates.
 *
 * Kør: npx tsx scripts/dedupe-product-tables.ts
 */

import { promises as fs } from "fs"
import path from "path"

const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")

async function main() {
  console.log("=== Deduplicerer produkttabeller ===\n")

  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })
  let fixed = 0

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "[slug]" || entry.name === "produkter") continue

    const mdxPath = path.join(KOSTTILSKUD_DIR, entry.name, "page.mdx")

    try {
      const raw = await fs.readFile(mdxPath, "utf8")

      if (!raw.includes("## Produkter i denne kategori")) continue

      // Split at the product section
      const splitMarker = "## Produkter i denne kategori"
      const idx = raw.indexOf(splitMarker)
      if (idx === -1) continue

      const beforeProducts = raw.substring(0, idx)
      const productSection = raw.substring(idx)

      // Extract table rows (lines starting with |, excluding header)
      const lines = productSection.split("\n")
      const header: string[] = []
      const tableRows: string[] = []
      const footer: string[] = []
      let inTable = false
      let pastTable = false

      for (const line of lines) {
        if (pastTable) {
          footer.push(line)
        } else if (line.startsWith("|") && !inTable) {
          inTable = true
          header.push(line)
        } else if (line.startsWith("|") && inTable) {
          if (line.startsWith("|---")) {
            header.push(line)
          } else {
            tableRows.push(line)
          }
        } else if (inTable && !line.startsWith("|")) {
          pastTable = true
          footer.push(line)
        } else {
          header.push(line)
        }
      }

      // Deduplicate rows by the product link (second column)
      const seen = new Set<string>()
      const uniqueRows: string[] = []

      for (const row of tableRows) {
        // Extract the link as the unique key
        const linkMatch = row.match(/\[Se vurdering\]\(([^)]+)\)/)
        const key = linkMatch ? linkMatch[1] : row

        if (!seen.has(key)) {
          seen.add(key)
          uniqueRows.push(row)
        }
      }

      const removed = tableRows.length - uniqueRows.length

      if (removed === 0) continue

      // Update the product count in the intro text
      const updatedHeader = header.map(line => {
        const countMatch = line.match(/\*\*(\d+) produkter\*\*/)
        if (countMatch) {
          return line.replace(`**${countMatch[1]} produkter**`, `**${uniqueRows.length} produkter**`)
        }
        return line
      })

      // Rebuild file
      const newSection = [...updatedHeader, ...uniqueRows, ...footer].join("\n")
      const newContent = beforeProducts + newSection

      await fs.writeFile(mdxPath, newContent, "utf-8")
      console.log(`  ✓ ${entry.name}: fjernede ${removed} dubletter (nu ${uniqueRows.length} produkter)`)
      fixed++
    } catch {
      // skip
    }
  }

  console.log(`\n=== Deduplicerede ${fixed} filer ===`)
}

main().catch(err => {
  console.error("Fejl:", err)
  process.exit(1)
})
