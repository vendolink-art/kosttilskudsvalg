import * as fs from "fs"
import * as path from "path"

const KOSTTILSKUD_DIR = path.join("src", "app", "(da)", "kosttilskud")

async function main() {
  const dirs = fs.readdirSync(KOSTTILSKUD_DIR).filter(d => {
    const full = path.join(KOSTTILSKUD_DIR, d)
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "page.mdx"))
  })

  let totalFixes = 0

  // Fix 1: double healthwell-healthwell- → healthwell-
  for (const slug of dirs.sort()) {
    const pagePath = path.join(KOSTTILSKUD_DIR, slug, "page.mdx")
    let content = fs.readFileSync(pagePath, "utf-8")
    const original = content

    const doubleCount = (content.match(/healthwell-healthwell-/g) || []).length
    if (doubleCount > 0) {
      content = content.replace(/healthwell-healthwell-/g, "healthwell-")
      console.log(`[${slug}] Fixed ${doubleCount} double "healthwell-healthwell-" → "healthwell-"`)
      totalFixes += doubleCount
    }

    // Fix 2: victamin typo
    const typoCount = (content.match(/victamin/gi) || []).length
    if (typoCount > 0) {
      content = content.replace(/victamin/gi, "vitamin")
      console.log(`[${slug}] Fixed ${typoCount} "victamin" → "vitamin" typo`)
      totalFixes += typoCount
    }

    if (content !== original) {
      fs.writeFileSync(pagePath, content, "utf-8")
    }
  }

  // Fix 3: store-impact-map.json
  const mapPath = path.join("content", "store-impact-map.json")
  if (fs.existsSync(mapPath)) {
    let mapContent = fs.readFileSync(mapPath, "utf-8")
    const origMap = mapContent

    const doubleMapCount = (mapContent.match(/healthwell-healthwell-/g) || []).length
    if (doubleMapCount > 0) {
      mapContent = mapContent.replace(/healthwell-healthwell-/g, "healthwell-")
      console.log(`[store-impact-map.json] Fixed ${doubleMapCount} double "healthwell-healthwell-"`)
      totalFixes += doubleMapCount
    }

    const typoMapCount = (mapContent.match(/victamin/gi) || []).length
    if (typoMapCount > 0) {
      mapContent = mapContent.replace(/victamin/gi, "vitamin")
      console.log(`[store-impact-map.json] Fixed ${typoMapCount} "victamin" typo`)
      totalFixes += typoMapCount
    }

    if (mapContent !== origMap) {
      fs.writeFileSync(mapPath, mapContent, "utf-8")
    }
  }

  console.log(`\n=== Total fixes: ${totalFixes} ===`)
}

main().catch(console.error)
