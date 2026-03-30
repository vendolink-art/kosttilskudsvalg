/**
 * generate-hero-images.ts
 *
 * Generates category hero banners from real product images used in each category test.
 * Inspired by fordonssajten's local-image composition workflow, adapted for supplements.
 *
 * Usage:
 *   npx tsx scripts/generate-hero-images.ts
 *   npx tsx scripts/generate-hero-images.ts kasein omega-3
 *   npx tsx scripts/generate-hero-images.ts --force
 */

import path from "path"
import os from "os"
import { promises as fs } from "fs"
import sharp from "sharp"
import dotenv from "dotenv"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const OUT_DIR = path.join(process.cwd(), "public", "images", "heroes")
const TMP_DIR = path.join(os.tmpdir(), "kostmag-hero-banners")

const SCENES = [
  "clean Scandinavian kitchen counter with natural daylight from a side window",
  "minimal Nordic wellness studio with bright diffuse morning light",
  "modern supplement testing desk with neutral white and light wood surfaces",
  "calm lifestyle interior with subtle green accents and realistic shadows",
]

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const wait = 1200 * Math.pow(2, i)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw lastErr
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function normalizePublicImagePath(rawPath: string): string | null {
  if (!rawPath) return null
  const p = rawPath.trim()
  if (!p.startsWith("/")) return null
  const noQuery = p.split("?")[0]
  if (!/\.(png|jpg|jpeg|webp)$/i.test(noQuery)) return null
  if (
    !(
      noQuery.startsWith("/vendor/") ||
      noQuery.startsWith("/generated/product-tests/") ||
      noQuery.startsWith("/api/generated/product-tests/") ||
      noQuery.startsWith("/images/products/")
    )
  ) {
    return null
  }
  return noQuery
}

function toFsPath(publicPath: string): string {
  const apiMatch = publicPath.match(/^\/api\/generated\/product-tests\/([^/?#]+)$/)
  if (apiMatch) {
    const filename = decodeURIComponent(apiMatch[1])
    return path.join(process.cwd(), "public", "generated", "product-tests", filename)
  }
  return path.join(process.cwd(), "public", publicPath.replace(/^\/+/, ""))
}

async function extractCategoryImagePaths(slug: string): Promise<string[]> {
  const mdxPath = path.join(KOSTTILSKUD_DIR, slug, "page.mdx")
  const raw = await fs.readFile(mdxPath, "utf-8")
  const srcRegex = /<img[^>]+src="([^"]+)"/g
  const all: string[] = []
  let match: RegExpExecArray | null
  while ((match = srcRegex.exec(raw)) !== null) {
    const normalized = normalizePublicImagePath(match[1])
    if (!normalized) continue
    all.push(normalized)
  }
  const unique = Array.from(new Set(all))
  return unique
}

async function prepareCompositeInput(localImageFsPaths: string[]): Promise<Buffer> {
  const width = 1536
  const height = 1024
  const targetHeight = 430
  const marginX = 90
  const baselineY = 770

  const imgs: Array<{ buf: Buffer; w: number; h: number }> = []
  for (const p of localImageFsPaths) {
    const input = await fs.readFile(p)
    const resized = await sharp(input)
      .resize({ width: 460, height: targetHeight, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer()
    const meta = await sharp(resized).metadata()
    imgs.push({ buf: resized, w: meta.width || 0, h: meta.height || targetHeight })
  }

  const usable = imgs.filter((x) => x.w > 0 && x.h > 0)
  if (usable.length < 2) {
    throw new Error("Need at least two valid product images for composite")
  }

  const totalW = width - marginX * 2
  const gap = totalW / usable.length
  const composites: sharp.OverlayOptions[] = []

  for (let i = 0; i < usable.length; i++) {
    const img = usable[i]
    const cx = Math.round(marginX + gap * i + gap / 2)
    let left = Math.round(cx - img.w / 2)
    if (left < 0) left = 0
    if (img.w >= width) {
      left = 0
    } else if (left + img.w > width) {
      left = width - img.w
    }
    const top = Math.max(0, Math.round(baselineY - img.h))

    const shadowW = Math.min(width, Math.max(160, Math.round(img.w * 0.72)))
    const shadowH = Math.round(shadowW * 0.22)
    const shadowSvg = `
<svg width="${shadowW}" height="${shadowH}">
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="black" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="black" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="${shadowW / 2}" cy="${shadowH / 2}" rx="${shadowW / 2}" ry="${shadowH / 2}" fill="url(#g)"/>
</svg>`
    let shadowLeft = Math.round(cx - shadowW / 2)
    if (shadowLeft < 0) shadowLeft = 0
    if (shadowLeft + shadowW > width) shadowLeft = Math.max(0, width - shadowW)
    let shadowTop = Math.round(baselineY - shadowH / 2)
    if (shadowTop < 0) shadowTop = 0
    if (shadowTop + shadowH > height) shadowTop = Math.max(0, height - shadowH)

    composites.push({
      input: Buffer.from(shadowSvg),
      left: shadowLeft,
      top: shadowTop,
    })

    composites.push({ input: img.buf, left, top })
  }

  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toBuffer()
}

function buildBannerPrompt(categorySlug: string): string {
  const scene = randomPick(SCENES)
  return `CRITICAL INSTRUCTIONS - READ CAREFULLY:

0. IMAGE FORMAT (MANDATORY):
   - Generate a WIDE banner image in landscape format
   - Keep composition suitable for later crop to ~1536x640

1. PRODUCT SHAPE PRESERVATION (MANDATORY):
   - Every product in the reference image must keep EXACT container shape and proportions
   - Do not redesign container forms, caps, or label layout

2. PRODUCT COLOR + LABEL PRESERVATION (MANDATORY):
   - Keep exact brand colors and label identity from reference products
   - Do not alter branding, typography style, or package palette

3. SHOW ALL PRODUCTS:
   - Include all provided products in one realistic lineup
   - No product may be omitted, hidden, merged, or cropped away

4. COMPOSITION:
   - Place products on a stable surface (counter/table)
   - No floating products
   - Leave left side relatively clean and darker for text overlay readability
   - Keep products mainly in center/right area

SCENE STYLE:
- Photorealistic editorial style (not ad-like)
- Scandinavian/Nordic aesthetics
- Realistic natural lighting and shadows
- Clean health/supplement context
- Scene: ${scene}
- Category context: ${categorySlug}

RESTRICTIONS:
- No additional text overlays
- No watermarks
- No fantasy effects
- No people/faces
- Avoid heavy color grading
`
}

function buildFallbackPrompt(categorySlug: string): string {
  return `Photorealistic wide hero banner for a Danish supplement review category (${categorySlug}).

Use all products from the reference image in one lineup on a real tabletop.
Keep original package shape, colors, and branding recognizable.
No floating products. No text overlays. Scandinavian clean lighting.
Leave left side less busy for title overlay.`
}

async function generateWithModel(
  model: string,
  prompt: string,
  referencePng: Buffer
): Promise<Buffer> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing")

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: referencePng.toString("base64"),
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 0.65,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 8192,
    },
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`
  const response = await withRetry(async () => {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini API ${res.status}: ${err.slice(0, 280)}`)
    }
    return res.json()
  })

  const parts = response?.candidates?.[0]?.content?.parts
  if (!parts) throw new Error("Gemini response did not include parts")
  for (const part of parts) {
    if (part.inlineData?.data) return Buffer.from(part.inlineData.data, "base64")
  }
  throw new Error("Gemini response had no image")
}

async function generateWithGemini(prompt: string, referencePng: Buffer): Promise<Buffer> {
  const models = [
    "gemini-3-pro-image-preview",
    "gemini-2.5-flash-image",
  ]
  let lastErr: unknown
  for (const model of models) {
    try {
      console.log(`    trying ${model}...`)
      return await generateWithModel(model, prompt, referencePng)
    } catch (error) {
      lastErr = error
      const msg = error instanceof Error ? error.message : String(error)
      console.log(`    ${model} failed: ${msg.slice(0, 120)}`)
    }
  }
  throw lastErr
}

async function buildLocalFallbackBanner(composite: Buffer): Promise<Buffer> {
  const bgSvg = `
<svg width="1536" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="45%" stop-color="#14532d"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>
    <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(0,0,0,0.62)"/>
      <stop offset="38%" stop-color="rgba(0,0,0,0.34)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.15)"/>
    </linearGradient>
  </defs>
  <rect width="1536" height="1024" fill="url(#g1)" />
  <rect width="1536" height="1024" fill="url(#g2)" />
</svg>`

  const merged = await sharp({
    create: {
      width: 1536,
      height: 1024,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 },
    },
  })
    .composite([
      { input: Buffer.from(bgSvg), left: 0, top: 0 },
      { input: composite, left: 0, top: 0 },
    ])
    .png()
    .toBuffer()

  return sharp(merged).extract({ left: 0, top: 192, width: 1536, height: 640 }).webp({ quality: 86 }).toBuffer()
}

async function updateBannerFrontmatter(slug: string, bannerUrl: string) {
  const mdxPath = path.join(KOSTTILSKUD_DIR, slug, "page.mdx")
  const content = await fs.readFile(mdxPath, "utf-8")
  let updated = content
  if (/^---[\s\S]*?\nbanner:\s*/m.test(content)) {
    updated = content.replace(
      /^(---\s*\n[\s\S]*?\nbanner:\s*)"([^"]*)"([\s\S]*?---)/m,
      `$1"${bannerUrl}"$3`
    )
  } else {
    updated = content.replace(
      /^(---\s*\n[\s\S]*?title:\s*"[^"]*")/m,
      `$1\nbanner: "${bannerUrl}"`
    )
  }
  if (updated !== content) {
    await fs.writeFile(mdxPath, updated, "utf-8")
  }
}

async function generateOne(slug: string, force: boolean): Promise<"ok" | "skipped" | "failed"> {
  const outPath = path.join(OUT_DIR, `${slug}-banner.webp`)
  if (!force) {
    try {
      await fs.access(outPath)
      await updateBannerFrontmatter(slug, `/images/heroes/${slug}-banner.webp?v=${Date.now()}`)
      return "skipped"
    } catch {}
  }

  const publicImagePaths = await extractCategoryImagePaths(slug)
  const existingFsPaths: string[] = []
  for (const p of publicImagePaths) {
    const fsPath = toFsPath(p)
    try {
      await fs.access(fsPath)
      existingFsPaths.push(fsPath)
    } catch {}
    if (existingFsPaths.length >= 5) break
  }

  console.log(`    found ${publicImagePaths.length} paths, ${existingFsPaths.length} on disk`)

  if (existingFsPaths.length < 2) {
    console.error(`  x ${slug}: not enough product images`)
    return "failed"
  }

  let raw: Buffer | null = null
  const tryCounts = [Math.min(5, existingFsPaths.length), Math.min(3, existingFsPaths.length), 2]
    .filter((n, i, arr) => n >= 2 && arr.indexOf(n) === i)

  for (const count of tryCounts) {
    const subset = existingFsPaths.slice(0, count)
    console.log(`    compositing ${count} images...`)
    const composite = await prepareCompositeInput(subset)
    console.log(`    composite ready (${(composite.length / 1024).toFixed(0)} KB), calling Gemini...`)
    try {
      raw = await generateWithGemini(buildBannerPrompt(slug), composite)
      console.log(`    Gemini OK (${(raw.length / 1024).toFixed(0)} KB raw)`)
      break
    } catch (e: any) {
      console.log(`    primary prompt failed: ${e?.message?.slice(0, 120)}`)
      try {
        raw = await generateWithGemini(buildFallbackPrompt(slug), composite)
        console.log(`    fallback prompt OK (${(raw.length / 1024).toFixed(0)} KB raw)`)
        break
      } catch (e2: any) {
        console.log(`    fallback prompt also failed: ${e2?.message?.slice(0, 120)}`)
      }
    }
  }
  let finalBanner: Buffer
  if (!raw) {
    console.log(`    WARNING: all Gemini attempts failed, using local fallback`)
    const fallbackComposite = await prepareCompositeInput(existingFsPaths.slice(0, Math.min(5, existingFsPaths.length)))
    finalBanner = await buildLocalFallbackBanner(fallbackComposite)
  } else {
    const normalized = await sharp(raw)
      .resize(1536, 1024, { fit: "contain", background: { r: 15, g: 23, b: 42, alpha: 1 } })
      .png()
      .toBuffer()

    finalBanner = await sharp(normalized)
      .extract({ left: 0, top: 192, width: 1536, height: 640 })
      .webp({ quality: 88 })
      .toBuffer()
  }

  await fs.writeFile(outPath, finalBanner)
  await updateBannerFrontmatter(slug, `/images/heroes/${slug}-banner.webp?v=${Date.now()}`)
  return "ok"
}

async function getAllCategorySlugs(): Promise<string[]> {
  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })
  const slugs: string[] = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const mdxPath = path.join(KOSTTILSKUD_DIR, e.name, "page.mdx")
    try {
      await fs.access(mdxPath)
      slugs.push(e.name)
    } catch {}
  }
  return slugs.sort()
}

async function main() {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not found in .env.local")
    process.exit(1)
  }
  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.mkdir(TMP_DIR, { recursive: true })

  const args = process.argv.slice(2)
  const force = args.includes("--force")
  const slugsArg = args.filter((a) => !a.startsWith("--"))
  const slugs = slugsArg.length > 0 ? slugsArg : await getAllCategorySlugs()

  console.log("═══════════════════════════════════════════════")
  console.log("  Generate Category Hero Banners")
  console.log(`  Count: ${slugs.length}`)
  console.log("  Source: real product images from each category test")
  console.log("═══════════════════════════════════════════════\n")

  let ok = 0
  let skipped = 0
  let failed = 0

  for (const slug of slugs) {
    process.stdout.write(`  → ${slug} ... `)
    try {
      const status = await generateOne(slug, force)
      if (status === "ok") {
        ok++
        process.stdout.write("generated\n")
      } else if (status === "skipped") {
        skipped++
        process.stdout.write("reused existing\n")
      } else {
        failed++
        process.stdout.write("failed\n")
      }
    } catch (e: any) {
      failed++
      process.stdout.write(`failed (${e?.message || "unknown error"})\n`)
    }
    await new Promise((r) => setTimeout(r, 1500))
  }

  console.log("\n═══════════════════════════════════════════════")
  console.log(`  Generated: ${ok}`)
  console.log(`  Reused:    ${skipped}`)
  console.log(`  Failed:    ${failed}`)
  console.log("═══════════════════════════════════════════════")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
