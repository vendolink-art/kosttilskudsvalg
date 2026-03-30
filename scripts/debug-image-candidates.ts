import { promises as fs } from "fs"
import path from "path"

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36"

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

function extractMeta(html: string, key: string): string[] {
  const out: string[] = []
  const regs = [
    new RegExp(`<meta[^>]+property=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "gi"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${key}["'][^>]*>`, "gi"),
  ]
  for (const re of regs) {
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) out.push(m[1])
  }
  return out
}

function extractAll(html: string, pageUrl: string): string[] {
  const out: string[] = []
  const a = /https?:\/\/[^"'\\\s>]+/gi
  let m: RegExpExecArray | null
  while ((m = a.exec(html)) !== null) {
    if (/\.(?:jpe?g|png|webp|avif)(?:\?|$)/i.test(m[0])) out.push(m[0])
  }

  const b = /\b(?:src|data-src|srcset)=["']([^"']+)["']/gi
  while ((m = b.exec(html)) !== null) {
    const val = m[1].split(",")[0].trim()
    if (/\.(?:jpe?g|png|webp|avif)(?:\?|$)/i.test(val)) out.push(resolveUrl(pageUrl, val))
  }
  return [...new Set(out)]
}

async function main() {
  const buyLinks = JSON.parse(await fs.readFile(BUY_LINKS_FILE, "utf-8")) as Record<string, string>
  const slug = process.argv[2]
  if (!slug || !buyLinks[slug]) {
    console.log("Usage: npx tsx scripts/debug-image-candidates.ts <slug>")
    process.exit(1)
  }

  const url = buyLinks[slug]
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" })
  console.log(`status=${res.status} final=${res.url}`)
  const html = await res.text()

  const candidates = [
    ...extractMeta(html, "og:image"),
    ...extractMeta(html, "twitter:image"),
    ...extractAll(html, res.url),
  ]
  const dedupe = [...new Set(candidates)]
  console.log(`candidates=${dedupe.length}`)
  dedupe.slice(0, 40).forEach((c, i) => console.log(`${i + 1}. ${c}`))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

