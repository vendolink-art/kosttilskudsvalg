/**
 * dump-crawled-raw-text.ts
 *
 * Dumps the raw text fields we fetched for a crawled product into a .txt file.
 *
 * Usage:
 *   npx tsx scripts/dump-crawled-raw-text.ts --store corenutrition --slug better-you-amino-tabletter
 */
import { promises as fs } from "fs"
import path from "path"

function getArg(flag: string): string | undefined {
  const args = process.argv.slice(2)
  const i = args.indexOf(flag)
  return i !== -1 ? args[i + 1] : undefined
}

function normalizeText(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "string") return v
  return String(v)
}

async function main() {
  const store = (getArg("--store") || "").trim()
  const slug = (getArg("--slug") || "").trim()
  if (!store || !slug) {
    console.error("Usage: npx tsx scripts/dump-crawled-raw-text.ts --store <store> --slug <slug>")
    process.exit(1)
  }

  const inPath = path.join(process.cwd(), "content", "crawled-products", store, `${slug}.json`)
  const raw = await fs.readFile(inPath, "utf8")
  const json = JSON.parse(raw.replace(/^\uFEFF/, ""))

  const outDir = path.join(process.cwd(), "debug", "raw")
  await fs.mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, `${store}__${slug}__raw.txt`)

  const lines: string[] = []
  lines.push(`SOURCE_URL: ${normalizeText(json.sourceUrl)}`)
  lines.push(`STORE: ${normalizeText(json.store)}`)
  lines.push(`NAME: ${normalizeText(json.name)}`)
  lines.push(`BRAND: ${normalizeText(json.brand)}`)
  lines.push(`PRICE: ${normalizeText(json.price)}`)
  lines.push(`PRICE_NUMERIC: ${normalizeText(json.priceNumeric)}`)
  lines.push(`CURRENCY: ${normalizeText(json.currency)}`)
  lines.push(`STORE_RATING: ${normalizeText(json.storeRating)}`)
  lines.push(`REVIEW_COUNT: ${normalizeText(json.reviewCount)}`)
  lines.push(`CRAWLED_AT: ${normalizeText(json.crawledAt)}`)
  lines.push("")

  const sections: Array<{ key: string; label: string }> = [
    { key: "description", label: "DESCRIPTION" },
    { key: "fullDescription", label: "FULL_DESCRIPTION" },
    { key: "highlights", label: "HIGHLIGHTS" },
    { key: "flavors", label: "FLAVORS" },
    { key: "ingredients", label: "INGREDIENTS" },
    { key: "dosage", label: "DOSAGE" },
    { key: "nutritionInfo", label: "NUTRITION_INFO" },
    { key: "storeCategory", label: "STORE_CATEGORY" },
  ]

  for (const s of sections) {
    lines.push(`===== ${s.label} =====`)
    const v = json[s.key]
    const t =
      Array.isArray(v)
        ? v.map((x) => normalizeText(x)).filter(Boolean).join("\n")
        : normalizeText(v)
    lines.push(t ? t : "(empty)")
    lines.push("")
  }

  lines.push("===== REVIEWS (PARSED) =====")
  if (Array.isArray(json.reviews) && json.reviews.length) {
    for (let i = 0; i < json.reviews.length; i++) {
      const r = json.reviews[i] || {}
      lines.push(`-- Review ${i + 1} --`)
      lines.push(`author: ${normalizeText(r.author)}`)
      lines.push(`ratingValue: ${normalizeText(r.ratingValue)}`)
      lines.push(`datePublished: ${normalizeText(r.datePublished)}`)
      lines.push(`headline: ${normalizeText(r.headline)}`)
      lines.push(`body: ${normalizeText(r.body)}`)
      lines.push("")
    }
  } else {
    lines.push("(empty)")
    lines.push("")
  }

  lines.push("===== Q&A (PARSED) =====")
  if (Array.isArray(json.qa) && json.qa.length) {
    for (let i = 0; i < json.qa.length; i++) {
      const q = json.qa[i] || {}
      lines.push(`-- Q&A ${i + 1} --`)
      lines.push(`author: ${normalizeText(q.author)}`)
      lines.push(`authorLabel: ${normalizeText(q.authorLabel)}`)
      lines.push(`datePublished: ${normalizeText(q.datePublished)}`)
      lines.push(`question: ${normalizeText(q.question)}`)
      if (Array.isArray(q.answers) && q.answers.length) {
        for (let j = 0; j < q.answers.length; j++) {
          const a = q.answers[j] || {}
          lines.push(`  - answer ${j + 1}: ${normalizeText(a.body)}`)
          lines.push(`    author: ${normalizeText(a.author)}`)
          lines.push(`    authorTitle: ${normalizeText(a.authorTitle)}`)
          lines.push(`    datePublished: ${normalizeText(a.datePublished)}`)
        }
      } else {
        lines.push("  - answers: (empty)")
      }
      lines.push("")
    }
  } else {
    lines.push("(empty)")
    lines.push("")
  }

  await fs.writeFile(outPath, lines.join("\n"), "utf8")
  console.log(outPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

