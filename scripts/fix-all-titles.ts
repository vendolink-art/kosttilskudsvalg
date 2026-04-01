import * as fs from "fs"
import * as path from "path"

const KOSTTILSKUD_DIR = path.join("src", "app", "(da)", "kosttilskud")
const CATEGORY_INTROS_DIR = path.join("content", "category-intros")

const PROPER_NAMES: Record<string, string> = {}

function loadProperNames() {
  if (!fs.existsSync(CATEGORY_INTROS_DIR)) return
  for (const f of fs.readdirSync(CATEGORY_INTROS_DIR)) {
    if (!f.endsWith(".meta.json")) continue
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(CATEGORY_INTROS_DIR, f), "utf-8"))
      const slug = f.replace(".meta.json", "")
      if (meta.categoryName) PROPER_NAMES[slug] = meta.categoryName
    } catch {}
  }
}

function slugToProperName(slug: string): string {
  if (PROPER_NAMES[slug]) return PROPER_NAMES[slug]
  return slug
    .replace(/-/g, " ")
    .replace(/\boe\b/g, "ø").replace(/\bae\b/g, "æ").replace(/\baa\b/g, "å")
    .replace(/^./, c => c.toUpperCase())
}

function fixFrontmatterTitle(title: string, slug: string): string {
  let fixed = title
  fixed = fixed.replace(/^Bedste årets bedste /i, "Bedste ")
  fixed = fixed.replace(/^Bedste vi tester bedste /i, "Bedste ")
  fixed = fixed.replace(/^Test: Bedste topliste: bedste /i, "Bedste ")
  fixed = fixed.replace(/^Bedste Bedste /i, "Bedste ")
  return fixed
}

function fixH2Heading(h2: string, slug: string): string {
  const properName = slugToProperName(slug)
  const cleanName = properName.replace(/^bedste\s+/i, "")
  return `## Bedste ${cleanName} i 2026 – vores liste`
}

async function main() {
  loadProperNames()
  console.log(`Loaded ${Object.keys(PROPER_NAMES).length} proper category names\n`)

  const dirs = fs.readdirSync(KOSTTILSKUD_DIR).filter(d => {
    const full = path.join(KOSTTILSKUD_DIR, d)
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "page.mdx"))
  })

  let titleFixes = 0
  let h2Fixes = 0

  for (const slug of dirs.sort()) {
    const pagePath = path.join(KOSTTILSKUD_DIR, slug, "page.mdx")
    let content = fs.readFileSync(pagePath, "utf-8")
    let changed = false

    // Fix frontmatter titles with duplicate "bedste"
    const titleMatch = content.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)
    const metaTitleMatch = content.match(/^meta_title:\s*['"]?(.+?)['"]?\s*$/m)
    if (titleMatch) {
      const oldTitle = titleMatch[1]
      const fixedTitle = fixFrontmatterTitle(oldTitle, slug)
      if (fixedTitle !== oldTitle) {
        content = content.replace(`title: ${titleMatch[0].split(": ")[1]}`, `title: ${fixedTitle}`)
        titleFixes++
        changed = true
        console.log(`TITLE FIX [${slug}]: "${oldTitle}" → "${fixedTitle}"`)
      }
    }
    if (metaTitleMatch) {
      const old = metaTitleMatch[1]
      const fixed = fixFrontmatterTitle(old, slug)
      if (fixed !== old) {
        content = content.replace(`meta_title: ${metaTitleMatch[0].split(": ")[1]}`, `meta_title: ${fixed}`)
        changed = true
      }
    }

    // Fix H2 headings with "Bedste Bedste" (double)
    const h2Pattern = /^## Bedste Bedste .+$/m
    const h2Match = content.match(h2Pattern)
    if (h2Match) {
      const properName = slugToProperName(slug).replace(/^bedste\s+/i, "")
      const fixedH2 = `## Bedste ${properName} i 2026 – vores liste`
      content = content.replace(h2Match[0], fixedH2)
      h2Fixes++
      changed = true
      console.log(`H2 FIX [${slug}]: "${h2Match[0]}" → "${fixedH2}"`)
    }

    if (changed) {
      fs.writeFileSync(pagePath, content, "utf-8")
    }
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Title fixes: ${titleFixes}`)
  console.log(`H2 fixes: ${h2Fixes}`)
}

main().catch(console.error)
