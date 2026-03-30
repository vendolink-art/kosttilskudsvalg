import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const IMAGE_MAPPING_FILE = path.join(process.cwd(), "content", "product-images.json")
const IMAGE_DIR = path.join(process.cwd(), "public", "vendor", "products")

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"

const SUSPECT_IMAGES = new Set<string>([
  "/vendor/products/16faffca78ec.jpg",
  "/vendor/products/0ec4cb4d0530.jpg",
  "/vendor/products/e3e9c439c0c9.png",
  "/vendor/products/4461325a37e4.jpg",
  "/vendor/products/fac3c0d2da89.jpg",
  "/vendor/products/b07fa8f3d523.jpg",
  "/vendor/products/85e5306e4d37.jpg",
])

function hashUrl(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 12)
}

function resolveUrl(base: string, u: string): string {
  if (!u) return ""
  if (u.startsWith("http://") || u.startsWith("https://")) return u
  if (u.startsWith("//")) return `https:${u}`
  try {
    return new URL(u, base).toString()
  } catch {
    return ""
  }
}

function normalizeRemoteImageUrl(url: string): string {
  if (!url) return url
  let out = url.replace(/&amp;/g, "&")
  // Bodystore DK often exposes image URLs that are only fetchable on .com/.gymgrossisten
  out = out.replace("https://www.bodystore.dk/dw/image/", "https://www.bodystore.com/dw/image/")
  out = out.replace("https://bodystore.dk/dw/image/", "https://www.bodystore.com/dw/image/")
  return out
}

function extractMeta(html: string, key: string): string[] {
  const out: string[] = []
  const regs = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "gi"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, "gi"),
    new RegExp(`<meta[^>]+name=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "gi"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${key}["'][^>]*>`, "gi"),
  ]
  for (const re of regs) {
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) out.push(m[1])
  }
  return out
}

function extractJsonLdImages(html: string, pageUrl: string): string[] {
  const out: string[] = []
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = scriptRegex.exec(html)) !== null) {
    const raw = match[1]?.trim()
    if (!raw) continue
    try {
      const parsed = JSON.parse(raw)
      const nodes = Array.isArray(parsed)
        ? parsed
        : parsed?.["@graph"] && Array.isArray(parsed["@graph"])
          ? parsed["@graph"]
          : [parsed]
      for (const n of nodes) {
        const t = Array.isArray(n?.["@type"]) ? n["@type"].join(" ") : n?.["@type"] || ""
        if (!String(t).toLowerCase().includes("product")) continue
        const img = n?.image
        if (typeof img === "string") out.push(resolveUrl(pageUrl, img))
        if (Array.isArray(img)) {
          for (const v of img) {
            if (typeof v === "string") out.push(resolveUrl(pageUrl, v))
            if (v && typeof v?.url === "string") out.push(resolveUrl(pageUrl, v.url))
          }
        }
        if (img && typeof img?.url === "string") out.push(resolveUrl(pageUrl, img.url))
      }
    } catch {
      // ignore
    }
  }
  return out
}

function extractAllImageUrls(html: string, pageUrl: string): string[] {
  const out: string[] = []

  const rawImgRegex = /https?:\/\/[^"'\\\s>]+?\.(?:jpe?g|png|webp|avif)(?:\?[^"'\\\s>]*)?/gi
  let m1: RegExpExecArray | null
  while ((m1 = rawImgRegex.exec(html)) !== null) out.push(m1[0])

  const escapedRegex = /https:\\\/\\\/[^"'\\\s>]+?\.(?:jpe?g|png|webp|avif)(?:\\\/\?[^"'\\\s>]*)?/gi
  let m2: RegExpExecArray | null
  while ((m2 = escapedRegex.exec(html)) !== null) {
    out.push(m2[0].replace(/\\\//g, "/"))
  }

  const srcRegex = /\b(?:src|data-src|srcset)=["']([^"']+)["']/gi
  let m3: RegExpExecArray | null
  while ((m3 = srcRegex.exec(html)) !== null) {
    const val = m3[1]
    if (/\.(?:jpe?g|png|webp|avif)(?:\?|$)/i.test(val)) out.push(resolveUrl(pageUrl, val.split(",")[0].trim()))
  }

  return [...new Set(out)]
}

function scoreImage(candidate: string, buyUrl: string, slug: string): number {
  const u = candidate.toLowerCase()
  let s = 0

  // Positive signals
  if (u.includes("dw/image")) s += 120
  if (u.includes("/product") || u.includes("/products")) s += 80
  if (u.includes("catalog")) s += 70
  if (u.includes("master-catalog")) s += 80
  if (u.includes("large") || u.includes("zoom")) s += 30

  // Host affinity
  try {
    const h1 = new URL(buyUrl).hostname.replace(/^www\./, "")
    const h2 = new URL(candidate).hostname.replace(/^www\./, "")
    if (h1 === h2) s += 40
  } catch {
    // ignore
  }

  // Slug token match
  const tokens = slug.split("-").filter((t) => t.length >= 4)
  for (const t of tokens) {
    if (u.includes(t)) s += 12
  }

  // Negative signals
  if (u.includes("logo")) s -= 300
  if (u.includes("favicon")) s -= 300
  if (u.includes("icon")) s -= 200
  if (u.includes("placeholder") || u.includes("no-image") || u.includes("default")) s -= 250
  if (!/\.(?:jpe?g|png|webp|avif)(?:\?|$)/i.test(candidate)) s -= 120

  return s
}

async function downloadImage(url: string): Promise<string | null> {
  try {
    const clean = normalizeRemoteImageUrl(url).split("#")[0]
    const ext = clean.match(/\.(jpe?g|png|webp|avif)(?:\?.*)?$/i)?.[1]?.toLowerCase() || "jpg"
    const hash = hashUrl(clean)
    const abs = path.join(IMAGE_DIR, `${hash}.${ext}`)
    const rel = `/vendor/products/${hash}.${ext}`

    try {
      await fs.access(abs)
      return rel
    } catch {
      // download
    }

    const res = await fetch(clean, { headers: { "User-Agent": UA }, redirect: "follow" })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 1024) return null

    await fs.mkdir(IMAGE_DIR, { recursive: true })
    await fs.writeFile(abs, buf)
    return rel
  } catch {
    return null
  }
}

async function fetchRankedImages(slug: string, url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    })
    if (!res.ok) return []
    const html = await res.text()

    const candidates = [
      ...extractJsonLdImages(html, url),
      ...extractMeta(html, "og:image").map((u) => resolveUrl(url, u)),
      ...extractMeta(html, "twitter:image").map((u) => resolveUrl(url, u)),
      ...extractAllImageUrls(html, url),
    ]

    const ranked = [...new Set(candidates.map(normalizeRemoteImageUrl))]
      .filter(Boolean)
      .map((c) => ({ c, score: scoreImage(c, url, slug) }))
      .sort((a, b) => b.score - a.score)

    return ranked.map((r) => r.c)
  } catch {
    return []
  }
}

async function main() {
  const buyLinks = JSON.parse(await fs.readFile(BUY_LINKS_FILE, "utf-8")) as Record<string, string>
  const mapping = JSON.parse(await fs.readFile(IMAGE_MAPPING_FILE, "utf-8")) as Record<string, string>

  const targetSlugs = Object.keys(buyLinks).filter((slug) => {
    if (slug.includes("star-nutrition")) return true
    if (slug === "ultimate-omega-3") return true
    return SUSPECT_IMAGES.has(mapping[slug] || "")
  })

  let updated = 0
  let skipped = 0
  let failed = 0

  console.log(`Manual suspect pass: ${targetSlugs.length} products`)

  for (let i = 0; i < targetSlugs.length; i++) {
    const slug = targetSlugs[i]
    const url = buyLinks[slug]
    const current = mapping[slug]
    const idx = i + 1

    const ranked = await fetchRankedImages(slug, url)
    if (ranked.length === 0) {
      failed++
      console.log(`- [${idx}/${targetSlugs.length}] ${slug}: no candidate`)
      continue
    }

    let local: string | null = null
    for (const candidate of ranked.slice(0, 12)) {
      local = await downloadImage(candidate)
      if (local) break
    }
    if (!local) {
      failed++
      console.log(`- [${idx}/${targetSlugs.length}] ${slug}: download failed`)
      continue
    }

    if (local !== current) {
      mapping[slug] = local
      updated++
      console.log(`✓ [${idx}/${targetSlugs.length}] ${slug}: updated`)
    } else {
      skipped++
    }
  }

  await fs.writeFile(IMAGE_MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")
  console.log(`Done. updated=${updated}, skipped=${skipped}, failed=${failed}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

