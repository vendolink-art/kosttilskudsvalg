import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const IMAGE_MAPPING_FILE = path.join(process.cwd(), "content", "product-images.json")
const IMAGE_DIR = path.join(process.cwd(), "public", "vendor", "products")

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"

function hashUrl(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 12)
}

function resolveUrl(baseUrl: string, candidate: string): string {
  if (!candidate) return ""
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) return candidate
  if (candidate.startsWith("//")) return `https:${candidate}`
  try {
    return new URL(candidate, baseUrl).toString()
  } catch {
    return ""
  }
}

function normalizeImageUrl(u: string): string {
  const out = u.trim().replace(/&amp;/g, "&")
  return out
}

function looksLikeProductImage(url: string): boolean {
  const u = url.toLowerCase()
  if (!u || u.length < 20) return false
  if (u.includes("logo") || u.includes("sprite") || u.includes("favicon")) return false
  if (u.includes("/icons/") || u.includes("/icon/")) return false
  const positiveHints = [
    "/products/",
    "/product/",
    "/media/catalog",
    "/cdn/shop/files",
    "/cdn/shop/products",
    "productimage",
    "product-image",
    "woocommerce",
    "images",
  ]
  return positiveHints.some((hint) => u.includes(hint))
}

function extractFromJsonLd(html: string, pageUrl: string): string[] {
  const out: string[] = []
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = scriptRegex.exec(html)) !== null) {
    const raw = m[1]?.trim()
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      const nodes = Array.isArray(parsed)
        ? parsed
        : parsed?.["@graph"] && Array.isArray(parsed["@graph"])
          ? parsed["@graph"]
          : [parsed]
      for (const node of nodes) {
        const typeVal = Array.isArray(node?.["@type"]) ? node["@type"].join(" ") : node?.["@type"] || ""
        const isProduct = String(typeVal).toLowerCase().includes("product")
        if (!isProduct) continue
        const imageField = node?.image
        if (typeof imageField === "string") out.push(resolveUrl(pageUrl, imageField))
        if (Array.isArray(imageField)) {
          for (const img of imageField) {
            if (typeof img === "string") out.push(resolveUrl(pageUrl, img))
            if (img && typeof img?.url === "string") out.push(resolveUrl(pageUrl, img.url))
          }
        }
        if (imageField && typeof imageField?.url === "string") out.push(resolveUrl(pageUrl, imageField.url))
      }
    } catch {
      // ignore broken JSON-LD blocks
    }
  }
  return out
}

function extractMetaContent(html: string, key: string): string[] {
  const out: string[] = []
  const re1 = new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "gi")
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, "gi")
  const re3 = new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "gi")
  const re4 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`, "gi")
  for (const re of [re1, re2, re3, re4]) {
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) out.push(m[1])
  }
  return out
}

function rankImageCandidates(urls: string[]): string[] {
  const deduped = [...new Set(urls.map(normalizeImageUrl).filter(Boolean))]
  return deduped.sort((a, b) => {
    const sa = (looksLikeProductImage(a) ? 1000 : 0) + a.length
    const sb = (looksLikeProductImage(b) ? 1000 : 0) + b.length
    return sb - sa
  })
}

async function findBestImageForProductPage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    })
    if (!res.ok) return null
    const html = await res.text()

    const candidates: string[] = []
    candidates.push(...extractFromJsonLd(html, pageUrl))
    candidates.push(...extractMetaContent(html, "og:image").map((u) => resolveUrl(pageUrl, u)))
    candidates.push(...extractMetaContent(html, "twitter:image").map((u) => resolveUrl(pageUrl, u)))

    const ranked = rankImageCandidates(candidates)
    if (ranked.length === 0) return null
    return ranked[0]
  } catch {
    return null
  }
}

async function downloadImage(imageUrl: string): Promise<string | null> {
  try {
    const cleanUrl = imageUrl.split("#")[0]
    const extFromUrl = cleanUrl.match(/\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i)?.[1]?.toLowerCase()
    const hash = hashUrl(cleanUrl)
    const ext = extFromUrl ? `.${extFromUrl}` : ".jpg"
    const absPath = path.join(IMAGE_DIR, `${hash}${ext}`)
    const relPath = `/vendor/products/${hash}${ext}`

    try {
      await fs.access(absPath)
      return relPath
    } catch {
      // download
    }

    const res = await fetch(cleanUrl, { headers: { "User-Agent": UA }, redirect: "follow" })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1024) return null

    await fs.mkdir(IMAGE_DIR, { recursive: true })
    await fs.writeFile(absPath, buf)
    return relPath
  } catch {
    return null
  }
}

async function main() {
  const buyLinks = JSON.parse(await fs.readFile(BUY_LINKS_FILE, "utf-8")) as Record<string, string>
  let mapping: Record<string, string> = {}
  try {
    mapping = JSON.parse(await fs.readFile(IMAGE_MAPPING_FILE, "utf-8")) as Record<string, string>
  } catch {
    mapping = {}
  }

  const entries = Object.entries(buyLinks)
  let updated = 0
  let unchanged = 0
  let failed = 0

  console.log(`Refreshing product images from ${entries.length} buy links...`)

  for (let i = 0; i < entries.length; i++) {
    const [slug, url] = entries[i]
    const idx = i + 1
    const imageUrl = await findBestImageForProductPage(url)
    if (!imageUrl) {
      failed++
      if (idx <= 20 || idx % 100 === 0) console.log(`- [${idx}/${entries.length}] ${slug}: no image found`)
      continue
    }

    const local = await downloadImage(imageUrl)
    if (!local) {
      failed++
      if (idx <= 20 || idx % 100 === 0) console.log(`- [${idx}/${entries.length}] ${slug}: download failed`)
      continue
    }

    if (mapping[slug] !== local) {
      mapping[slug] = local
      updated++
      if (idx <= 20 || idx % 100 === 0) console.log(`✓ [${idx}/${entries.length}] ${slug}: updated`)
    } else {
      unchanged++
    }

    if (idx % 50 === 0) {
      await fs.writeFile(IMAGE_MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")
      console.log(`...progress ${idx}/${entries.length}, updated=${updated}, failed=${failed}`)
    }
  }

  await fs.writeFile(IMAGE_MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")
  console.log(`Done. updated=${updated}, unchanged=${unchanged}, failed=${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

