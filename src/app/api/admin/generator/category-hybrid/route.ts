import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { spawnSync } from "child_process"
import { isAuthenticated } from "@/lib/auth"

type HybridRequest = {
  categorySlug?: string
  keyword?: string
  sectionPath?: string
  productSlugs?: string[]
  recrawl?: boolean
  rewriteProducts?: boolean
}

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const NPX_CMD = process.platform === "win32" ? "npx.cmd" : "npx"

function clean(input?: string): string {
  return String(input || "").trim()
}

function runTsx(script: string, args: string[], timeoutMs = 6 * 60 * 1000) {
  return spawnSync(
    NPX_CMD,
    ["tsx", script, ...args],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    },
  )
}

export async function POST(request: Request) {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY mangler i .env.local" }, { status: 500 })
  }

  try {
    const body = (await request.json()) as HybridRequest
    const categorySlug = clean(body.categorySlug)
    const keyword = clean(body.keyword) || categorySlug
    const sectionPath = clean(body.sectionPath) || "kosttilskud"
    const productSlugs = Array.isArray(body.productSlugs)
      ? body.productSlugs.map((s) => clean(s)).filter(Boolean)
      : []
    const recrawl = body.recrawl !== false
    const rewriteProducts = body.rewriteProducts !== false

    if (!categorySlug) {
      return NextResponse.json({ error: "categorySlug er påkrævet" }, { status: 400 })
    }
    if (productSlugs.length === 0) {
      return NextResponse.json({ error: "mindst 1 productSlug er påkrævet" }, { status: 400 })
    }

    const rawLinks = await fs.readFile(BUY_LINKS_FILE, "utf8")
    const buyLinks = JSON.parse(rawLinks) as Record<string, string>
    const missingLink = productSlugs.find((slug) => !clean(buyLinks[slug]))
    if (missingLink) {
      return NextResponse.json(
        { error: `Ingen buy link fundet for slug: ${missingLink} (content/product-buy-links.json)` },
        { status: 400 },
      )
    }

    const logs: string[] = []

    if (recrawl) {
      logs.push("Step 1/4: Recrawling products")
      for (const slug of productSlugs) {
        const url = clean(buyLinks[slug])
        const res = runTsx("scripts/crawlers/crawl.ts", ["--url", url], 8 * 60 * 1000)
        if (res.status !== 0) {
          return NextResponse.json(
            {
              error: `Crawl fejlede for ${slug}`,
              logs: [...logs, res.stdout || "", res.stderr || ""],
            },
            { status: 500 },
          )
        }
        logs.push(`  ✓ crawled ${slug}`)
      }
    } else {
      logs.push("Step 1/4: Recrawl skipped")
    }

    if (rewriteProducts) {
      logs.push("Step 2/4: Rewriting product content")
      for (const slug of productSlugs) {
        const res = runTsx("scripts/rewrite-product-content.ts", [
          "--slug", slug,
          "--comparison-topic", keyword,
          "--award-context", `Topvalg i vores ${keyword}-test`,
          "--keyword", keyword,
        ], 10 * 60 * 1000)
        if (res.status !== 0) {
          return NextResponse.json(
            {
              error: `Product rewrite fejlede for ${slug}`,
              logs: [...logs, res.stdout || "", res.stderr || ""],
            },
            { status: 500 },
          )
        }
        logs.push(`  ✓ rewritten ${slug}`)
      }
    } else {
      logs.push("Step 2/4: Product rewrite skipped")
    }

    logs.push("Step 3/4: Generating plain category sections")
    const generateSections = runTsx(
      "scripts/regenerate-category-via-api.ts",
      [
        "--category-slug", categorySlug,
        "--keyword", keyword,
        "--section-path", sectionPath,
        "--slugs", productSlugs.join(","),
      ],
      10 * 60 * 1000,
    )
    if (generateSections.status !== 0) {
      return NextResponse.json(
        {
          error: `Kategori-sektionsgenerering fejlede for ${categorySlug}`,
          logs: [...logs, generateSections.stdout || "", generateSections.stderr || ""],
        },
        { status: 500 },
      )
    }
    logs.push(`  ✓ generated sections for ${categorySlug}`)

    logs.push("Step 4/4: Rebuilding category page with legacy layout")
    const rebuild = runTsx("scripts/rebuild-category-pages.ts", [
      categorySlug,
      "--product-slugs",
      productSlugs.join(","),
    ], 8 * 60 * 1000)
    if (rebuild.status !== 0) {
      return NextResponse.json(
        {
          error: `Rebuild fejlede for kategori ${categorySlug}`,
          logs: [...logs, rebuild.stdout || "", rebuild.stderr || ""],
        },
        { status: 500 },
      )
    }
    logs.push(`  ✓ rebuilt ${categorySlug}`)
    logs.push(`Done: /${sectionPath}/${categorySlug}`)

    return NextResponse.json({
      ok: true,
      categorySlug,
      sectionPath,
      productSlugs,
      logs,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Uventet fejl i hybrid-generator"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

