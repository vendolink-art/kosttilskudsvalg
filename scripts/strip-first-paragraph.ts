/**
 * strip-first-paragraph.ts
 * 
 * Fjerner det første afsnit (den fabricerede åbning) fra alle
 * category-intro .md-filer. Beholder H1 + de 3 gode afsnit.
 *
 * Struktur FØR:
 *   # Titel
 *   \n
 *   Fabriceret åbning...        ← FJERNES
 *   \n
 *   Afsnit 1 (hvad det er)     ← BEHOLDES
 *   \n
 *   Afsnit 2 (kvalitetskriterier) ← BEHOLDES
 *   \n
 *   Afsnit 3 (test + overgang)  ← BEHOLDES
 *
 * Kør: npx tsx scripts/strip-first-paragraph.ts
 */

import { promises as fs } from "fs"
import path from "path"

const INTROS_DIR = path.join(process.cwd(), "content", "category-intros")

async function main() {
  const files = (await fs.readdir(INTROS_DIR)).filter(f => f.endsWith(".md"))
  let updated = 0
  let skipped = 0

  for (const file of files) {
    const filePath = path.join(INTROS_DIR, file)
    const raw = await fs.readFile(filePath, "utf-8")

    // Split into paragraphs (separated by blank lines)
    const blocks = raw.split(/\n\n+/).map(b => b.trim()).filter(Boolean)

    // blocks[0] = "# Titel"
    // blocks[1] = fabricated opening paragraph
    // blocks[2] = what the product is
    // blocks[3] = quality criteria
    // blocks[4] = test overview

    if (blocks.length < 5) {
      // Already 3 paragraphs or fewer, skip
      skipped++
      continue
    }

    // Keep H1 (blocks[0]) + last 3 paragraphs (blocks[2], blocks[3], blocks[4])
    const cleaned = [blocks[0], "", blocks[2], "", blocks[3], "", blocks[4]].join("\n")
    await fs.writeFile(filePath, cleaned, "utf-8")
    updated++
  }

  console.log(`Færdig! Opdateret: ${updated}  |  Sprunget over: ${skipped}  |  Total: ${files.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
