import * as fs from "fs"
import * as path from "path"

const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")

interface ProductInfo {
  slot: number
  name: string
  award: string
  introStart: string
  reviewLength: number
  hasPros: boolean
  hasCons: boolean
  hasSpecs: boolean
  hasFaq: boolean
  hasWhoFor: boolean
  issues: string[]
}

function normalizeDanish(s: string): string {
  return s
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/ä/g, "ae").replace(/ö/g, "oe")
    .replace(/é/g, "e").replace(/ü/g, "u")
}

function auditPage(slug: string, content: string): ProductInfo[] {
  const products: ProductInfo[] = []

  const productSections = content.split(/<a id="product-/)
  if (productSections.length <= 1) return products

  for (let i = 1; i < productSections.length; i++) {
    const section = productSections[i]
    const endOfSection = i < productSections.length - 1
      ? section.length
      : section.length

    const nameMatch = section.match(/title="[^"]*">\d+\.\s+(.+?)<\/h3>/)
    const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, "").trim() : "UNKNOWN"

    const awardMatch = section.match(/uppercase tracking-wide">([^<]+)</)
    const award = awardMatch ? awardMatch[1].trim() : ""

    const paragraphs = section.match(/<p>[\s\S]+?<\/p>/g) || []
    const reviewParagraphs = paragraphs.filter(p => !p.includes("className") && p.replace(/<[^>]+>/g, "").trim().length > 50)
    const reviewText = reviewParagraphs.map(p => p.replace(/<[^>]+>/g, "")).join(" ")
    const introStart = reviewParagraphs.length > 0
      ? reviewParagraphs[0].replace(/<[^>]+>/g, "").slice(0, 120)
      : ""

    const hasPros = section.includes("Fordele:") || section.includes("### Fordele")
    const hasCons = section.includes("Ulemper:") || section.includes("### Ulemper")
    const hasSpecs = section.includes("Attributter/specifikationer:") || section.includes("table-default")
    const hasFaq = section.includes("FAQ:") || section.includes("### FAQ")
    const hasWhoFor = section.includes("Hvem passer")

    const issues: string[] = []

    if (reviewText.length < 100) {
      issues.push(`⛔ MISSING/VERY SHORT REVIEW (${reviewText.length} chars)`)
    }
    if (!hasPros) issues.push("⚠ Missing Fordele section")
    if (!hasCons) issues.push("⚠ Missing Ulemper section")
    if (!hasSpecs) issues.push("⚠ Missing specs table")
    if (!hasFaq) issues.push("⚠ Missing FAQ section")
    if (!hasWhoFor) issues.push("⚠ Missing 'Hvem passer' section")

    const normalizedName = normalizeDanish(name.toLowerCase())
      .replace(/<[^>]+>/g, "")
      .replace(/[^a-z0-9\s]/g, "")
    const nameWords = normalizedName
      .split(/\s+/)
      .filter(w => w.length > 3)
    const introNorm = normalizeDanish(introStart.toLowerCase())

    const matchCount = nameWords.filter(w => introNorm.includes(w)).length
    if (nameWords.length >= 2 && matchCount === 0) {
      const reviewNorm = normalizeDanish(reviewText.toLowerCase().slice(0, 500))
      const reviewMatchCount = nameWords.filter(w => reviewNorm.includes(w)).length
      if (reviewMatchCount === 0) {
        issues.push(`⛔ WRONG CONTENT: Product "${name}" not mentioned in first 500 chars of review`)
        issues.push(`   Intro: "${introStart}..."`)
      }
    }

    if (name.toLowerCase().includes("creatine") || name.toLowerCase().includes("kreatin")) {
      if (!slug.includes("kreatin") && !slug.includes("creatine") && !slug.includes("pwo")) {
        issues.push(`⛔ WRONG CATEGORY: Creatine product in /${slug}`)
      }
    }

    products.push({
      slot: i,
      name,
      award,
      introStart,
      reviewLength: reviewText.length,
      hasPros,
      hasCons,
      hasSpecs,
      hasFaq,
      hasWhoFor,
      issues,
    })
  }

  return products
}

async function main() {
  const dirs = fs.readdirSync(KOSTTILSKUD_DIR).filter(d => {
    const full = path.join(KOSTTILSKUD_DIR, d)
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "page.mdx"))
  })

  let criticalCount = 0
  let warningCount = 0
  const criticalPages: Array<{ slug: string; products: ProductInfo[] }> = []
  const warningPages: Array<{ slug: string; products: ProductInfo[] }> = []

  for (const dir of dirs.sort()) {
    const content = fs.readFileSync(path.join(KOSTTILSKUD_DIR, dir, "page.mdx"), "utf-8")
    const products = auditPage(dir, content)

    const critical = products.filter(p => p.issues.some(i => i.startsWith("⛔")))
    const warnings = products.filter(p => p.issues.length > 0 && !p.issues.some(i => i.startsWith("⛔")))

    if (critical.length > 0) {
      criticalPages.push({ slug: dir, products: critical })
      criticalCount += critical.length
    }
    if (warnings.length > 0) {
      warningPages.push({ slug: dir, products: warnings })
      warningCount += warnings.length
    }
  }

  console.log(`=== CONTENT AUDIT v2 ===`)
  console.log(`Checked ${dirs.length} categories`)
  console.log(`Critical issues: ${criticalCount}`)
  console.log(`Warning issues: ${warningCount}`)

  if (criticalPages.length > 0) {
    console.log(`\n=== ⛔ CRITICAL (${criticalPages.length} categories, ${criticalCount} products) ===\n`)
    for (const p of criticalPages) {
      console.log(`/${p.slug}:`)
      for (const prod of p.products) {
        console.log(`  #${prod.slot} "${prod.name}" [${prod.award}] (${prod.reviewLength} chars)`)
        for (const issue of prod.issues) {
          console.log(`    ${issue}`)
        }
      }
      console.log()
    }
  }

  if (warningPages.length > 0) {
    console.log(`\n=== ⚠ WARNINGS (${warningPages.length} categories, ${warningCount} products) ===\n`)
    for (const p of warningPages) {
      console.log(`/${p.slug}:`)
      for (const prod of p.products) {
        console.log(`  #${prod.slot} "${prod.name}" [${prod.award}]`)
        const missingParts = prod.issues.filter(i => i.startsWith("⚠"))
        if (missingParts.length > 0) {
          console.log(`    Missing: ${missingParts.map(i => i.replace("⚠ Missing ", "").replace(" section", "")).join(", ")}`)
        }
      }
      console.log()
    }
  }
}

main().catch(console.error)
