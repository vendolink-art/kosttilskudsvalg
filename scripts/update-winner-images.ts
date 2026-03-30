import { promises as fs } from "fs"
import path from "path"

const CATEGORY_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const PRODUCT_IMAGES_FILE = path.join(process.cwd(), "content", "product-images.json")
const WINNER_IMAGES_FILE = path.join(process.cwd(), "content", "winner-images.json")

async function main() {
  const productImages = JSON.parse(await fs.readFile(PRODUCT_IMAGES_FILE, "utf-8")) as Record<string, string>
  const entries = await fs.readdir(CATEGORY_DIR, { withFileTypes: true })
  const winners: Record<string, string> = {}

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name === "produkter" || entry.name === "[slug]") continue

    const pagePath = path.join(CATEGORY_DIR, entry.name, "page.mdx")
    let raw = ""
    try {
      raw = await fs.readFile(pagePath, "utf-8")
    } catch {
      continue
    }

    const firstProduct = raw.match(/<a id="product-([^"]+)">/)
    if (!firstProduct) continue
    const productSlug = firstProduct[1]
    const img = productImages[productSlug]
    if (img) winners[entry.name] = img
  }

  await fs.writeFile(WINNER_IMAGES_FILE, JSON.stringify(winners, null, 2), "utf-8")
  console.log(`Updated winner-images.json with ${Object.keys(winners).length} categories.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

