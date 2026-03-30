/**
 * Extract buy links from SalesObject table.
 * SalesObject schema: ID(0), ClassName(1), LastEdited(2), Created(3),
 *   AffiliateLink(4), Price(5), Description(6), Deal(7), Rating(8),
 *   Discontinued(9), ProductPageID(10), ProviderPageID(11), ProductVariantPageID(12)
 *
 * We also need SiteTree_Live to map ProductPageID → URLSegment (slug)
 */
import { createReadStream, promises as fs } from "fs"
import * as readline from "readline"
import path from "path"

const SQL = path.join(process.cwd(), "kostmagasinet_dk-db-2026-02-06.sql")
const OUT = path.join(process.cwd(), "content", "product-buy-links.json")

function parseInsertValues(line: string): string[][] {
  const rows: string[][] = []
  const vi = line.indexOf(" VALUES ")
  if (vi === -1) return rows
  let p = vi + 8, L = line.length
  while (p < L) {
    while (p < L && line[p] !== "(") p++
    if (p >= L) break
    p++
    const row: string[] = []
    while (p < L && line[p] !== ")") {
      while (p < L && line[p] === " ") p++
      if (line[p] === "'") {
        p++; let v = ""
        while (p < L) {
          if (line[p] === "\\" && p + 1 < L) { p++; v += line[p] }
          else if (line[p] === "'" && line[p + 1] === "'") { v += "'"; p++ }
          else if (line[p] === "'") { p++; break }
          else v += line[p]
          p++
        }
        row.push(v)
      } else if (line.slice(p, p + 4) === "NULL") { row.push(""); p += 4 }
      else { let v = ""; while (p < L && line[p] !== "," && line[p] !== ")") { v += line[p]; p++ }; row.push(v.trim()) }
      if (p < L && line[p] === ",") p++
    }
    if (p < L) p++
    if (p < L && (line[p] === "," || line[p] === ";")) p++
    if (row.length > 0) rows.push(row)
  }
  return rows
}

async function main() {
  console.log("═══════════════════════════════════════════════")
  console.log("  Extract Buy Links from SalesObject")
  console.log("═══════════════════════════════════════════════\n")

  // Pass 1: Read SiteTree_Live for ProductPage slug mapping (ID → slug)
  const slugMap: Record<number, string> = {}
  // Pass 2: Read SalesObject for affiliate links (ProductPageID → link)
  const salesLinks: { productPageId: number; link: string; price: string; discontinued: boolean }[] = []

  const rl = readline.createInterface({
    input: createReadStream(SQL, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (line.startsWith("INSERT INTO `SiteTree_Live`")) {
      const rows = parseInsertValues(line)
      for (const row of rows) {
        const id = parseInt(row[0])
        const className = row[1] || ""
        const urlSegment = row[4] || ""
        if (id && className === "ProductPage" && urlSegment) {
          slugMap[id] = urlSegment
        }
      }
    }

    if (line.startsWith("INSERT INTO `SalesObject`")) {
      const rows = parseInsertValues(line)
      for (const row of rows) {
        const affiliateLink = row[4] || ""
        const price = row[5] || ""
        const discontinued = row[9] === "1"
        const productPageId = parseInt(row[10]) || 0
        if (affiliateLink && affiliateLink.startsWith("http") && productPageId > 0) {
          salesLinks.push({ productPageId, link: affiliateLink, price, discontinued })
        }
      }
    }
  }

  console.log(`Product slugs from SiteTree: ${Object.keys(slugMap).length}`)
  console.log(`SalesObject entries with links: ${salesLinks.length}`)

  // Build slug → best buy link (prefer non-discontinued, most recent)
  const buyLinks: Record<string, { url: string; price: string }> = {}

  for (const sale of salesLinks) {
    const slug = slugMap[sale.productPageId]
    if (!slug) continue

    // Replace svenskkosttilskud with corenutrition
    let url = sale.link.replace(/svenskkosttilskud\.dk/g, "corenutrition.dk")

    // If we already have a link for this product, prefer non-discontinued
    if (buyLinks[slug]) {
      if (sale.discontinued) continue // skip discontinued if we already have one
    }
    buyLinks[slug] = { url, price: sale.price }
  }

  console.log(`Products with buy links: ${Object.keys(buyLinks).length}`)

  // Domain distribution
  const domains: Record<string, number> = {}
  for (const { url } of Object.values(buyLinks)) {
    try { const d = new URL(url).hostname.replace("www.", ""); domains[d] = (domains[d] || 0) + 1 } catch {}
  }
  console.log("\nBy domain:")
  for (const [d, c] of Object.entries(domains).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${d}: ${c}`)
  }

  // Examples
  console.log("\nExamples:")
  Object.entries(buyLinks).slice(0, 8).forEach(([s, { url, price }]) =>
    console.log(`  ${s} → ${url.slice(0, 70)} (${price} kr)`)
  )

  // Save just slug → url for rebuild script
  const output: Record<string, string> = {}
  for (const [slug, { url }] of Object.entries(buyLinks)) {
    output[slug] = url
  }

  await fs.writeFile(OUT, JSON.stringify(output, null, 2), "utf-8")
  console.log(`\nSaved ${Object.keys(output).length} buy links to ${OUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
