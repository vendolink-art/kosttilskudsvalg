import * as fs from "fs"
import * as path from "path"

const KOSTTILSKUD_DIR = path.join("src", "app", "(da)", "kosttilskud")

async function main() {
  const dirs = fs.readdirSync(KOSTTILSKUD_DIR).filter(d => {
    const full = path.join(KOSTTILSKUD_DIR, d)
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "page.mdx"))
  })

  let fixedPages = 0

  for (const slug of dirs.sort()) {
    const pagePath = path.join(KOSTTILSKUD_DIR, slug, "page.mdx")
    let content = fs.readFileSync(pagePath, "utf-8")

    // Extract ComparisonTable product order (source of truth)
    const ctMatch = content.match(/ComparisonTable[^>]*products=\{(\[.+?\])\}/)
    if (!ctMatch) continue

    let ctProducts: any[]
    try { ctProducts = JSON.parse(ctMatch[1]) } catch { continue }

    const ctOrder = ctProducts.map(p => p.slug)

    // Extract SeoJsonLd ItemList
    const seoMatch = content.match(/<SeoJsonLd schemas=\{(\[.+?\])\}\s*\/>/)
    if (!seoMatch) continue

    let schemas: any[]
    try { schemas = JSON.parse(seoMatch[1]) } catch { continue }

    const itemListIdx = schemas.findIndex((s: any) => s.type === "ItemList")
    if (itemListIdx === -1) continue

    const itemList = schemas[itemListIdx]
    if (!itemList.items || itemList.items.length === 0) continue

    const seoItems: any[] = itemList.items

    // Check if positions already match ComparisonTable order
    let needsFix = false
    for (let i = 0; i < ctOrder.length && i < seoItems.length; i++) {
      const ctSlug = ctOrder[i]
      const seoUrl: string = seoItems[i].url || ""
      const seoSlug = seoUrl.split("#product-")[1] || ""

      if (seoSlug !== ctSlug || seoItems[i].position !== i + 1) {
        needsFix = true
        break
      }
    }

    if (!needsFix) continue

    // Build corrected items: reorder to match ComparisonTable
    const seoBySlug = new Map<string, any>()
    for (const item of seoItems) {
      const itemSlug = (item.url || "").split("#product-")[1] || ""
      seoBySlug.set(itemSlug, item)
    }

    const correctedItems: any[] = []
    for (let i = 0; i < ctOrder.length; i++) {
      const ctSlug = ctOrder[i]
      const seoItem = seoBySlug.get(ctSlug)
      if (seoItem) {
        correctedItems.push({ ...seoItem, position: i + 1 })
      }
    }

    if (correctedItems.length !== seoItems.length) {
      console.log(`SKIP [${slug}]: item count mismatch CT=${ctOrder.length} vs SEO=${seoItems.length} vs corrected=${correctedItems.length}`)
      continue
    }

    // Log what changed
    const oldOrder = seoItems.map((it: any) => (it.url || "").split("#product-")[1] || "?")
    const newOrder = correctedItems.map((it: any) => (it.url || "").split("#product-")[1] || "?")
    console.log(`FIX [${slug}]:`)
    console.log(`  Old: ${oldOrder.join(", ")}`)
    console.log(`  New: ${newOrder.join(", ")}`)

    // Replace in content
    schemas[itemListIdx] = { ...itemList, items: correctedItems }
    const newSeoJson = JSON.stringify(schemas)
    const oldSeoJson = seoMatch[1]

    content = content.replace(oldSeoJson, newSeoJson)
    fs.writeFileSync(pagePath, content, "utf-8")
    fixedPages++
  }

  console.log(`\n=== Fixed SeoJsonLd positions on ${fixedPages} pages ===`)
}

main().catch(console.error)
