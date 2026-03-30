/**
 * find-replacement-product.ts
 *
 * Searches e-commerce stores for replacement products when a buy link is broken (404/410).
 * Returns candidate product page URLs in priority order.
 *
 * Usage:
 *   npx tsx scripts/find-replacement-product.ts --query "multivitamin børn"
 *   npx tsx scripts/find-replacement-product.ts --query "kreatin monohydrat" --stores healthwell,corenutrition
 *   npx tsx scripts/find-replacement-product.ts --query "omega 3" --limit 3
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function resolveUrl(base: string, relative: string): string {
  if (!relative || typeof relative !== "string") return ""
  if (relative.startsWith("http")) return relative
  if (relative.startsWith("//")) return "https:" + relative
  try {
    return new URL(relative, base).toString()
  } catch {
    return relative
  }
}

interface ProductCandidate {
  store: string
  name: string
  url: string
  price: string
  imageUrl: string
}

interface StoreSearcher {
  id: string
  baseUrl: string
  searchUrl: (query: string) => string
  extractProducts: (html: string, baseUrl: string) => ProductCandidate[]
}

// Healthwell: search results are rendered server-side with product cards
const healthwell: StoreSearcher = {
  id: "healthwell",
  baseUrl: "https://www.healthwell.dk",
  searchUrl: (q) =>
    `https://www.healthwell.dk/soeg?q=${encodeURIComponent(q)}`,
  extractProducts: (html, base) => {
    const results: ProductCandidate[] = []
    // Healthwell renders product cards with <a> links containing product URLs
    // Pattern: <a href="/product-slug" class="...product...">...<img>...<span class="name">...</span>...<span class="price">...</span>
    const cardPattern =
      /<a[^>]*href="(\/[^"]+)"[^>]*class="[^"]*product[^"]*"[^>]*>[\s\S]*?<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = cardPattern.exec(html)) !== null) {
      const card = m[0]
      const href = m[1]
      if (
        href.includes("/soeg") ||
        href.includes("/search") ||
        href.includes("/kategori")
      )
        continue

      const nameMatch = card.match(
        /class="[^"]*(?:name|title)[^"]*"[^>]*>([^<]+)/i,
      )
      const priceMatch = card.match(
        /class="[^"]*price[^"]*"[^>]*>([^<]+)/i,
      )
      const imgMatch = card.match(/<img[^>]*src="([^"]{20,})"/i)

      results.push({
        store: "healthwell",
        name: nameMatch?.[1]?.trim() || "",
        url: resolveUrl(base, href),
        price: priceMatch?.[1]?.trim() || "",
        imageUrl: imgMatch?.[1] ? resolveUrl(base, imgMatch[1]) : "",
      })
    }

    // Fallback: extract any product-like <a> tags with href patterns
    if (results.length === 0) {
      const linkPattern =
        /<a[^>]*href="(\/(?:produkter\/|[a-z0-9][-a-z0-9]*[a-z0-9])(?:\?[^"]*)?)"[^>]*>/gi
      while ((m = linkPattern.exec(html)) !== null) {
        const href = m[1]
        if (
          href.includes("/soeg") ||
          href.includes("/kategori") ||
          href.length < 5
        )
          continue
        // Try to get a name from surrounding text
        const after = html.slice(m.index, m.index + 500)
        const titleMatch = after.match(/>([^<]{3,80})</i)
        results.push({
          store: "healthwell",
          name: titleMatch?.[1]?.trim() || href.split("/").pop() || "",
          url: resolveUrl(base, href),
          price: "",
          imageUrl: "",
        })
      }
    }

    // Dedupe by URL
    const seen = new Set<string>()
    return results.filter((r) => {
      if (seen.has(r.url)) return false
      seen.add(r.url)
      return true
    })
  },
}

// Generic store searcher for stores with standard HTML search results
function makeGenericSearcher(
  id: string,
  domain: string,
  searchPath: (q: string) => string,
): StoreSearcher {
  const baseUrl = `https://www.${domain}`
  return {
    id,
    baseUrl,
    searchUrl: (q) => `${baseUrl}${searchPath(q)}`,
    extractProducts: (html, base) => {
      const results: ProductCandidate[] = []
      // Generic approach: find <a> tags with product-like hrefs near product content
      // Most stores use product cards with <a href="/product-slug">
      const cardPattern =
        /<a[^>]*href="(\/[a-z0-9][-a-z0-9/]*[a-z0-9](?:\?[^"]*)?)"[^>]*>[\s\S]*?(?:<\/a>|<img)/gi
      let m: RegExpExecArray | null
      while ((m = cardPattern.exec(html)) !== null) {
        const href = m[1]
        if (
          href.includes("/search") ||
          href.includes("/soeg") ||
          href.includes("/kategori") ||
          href.includes("/category") ||
          href.includes("/brand/") ||
          href.includes("/page/") ||
          href.includes("/cart") ||
          href.includes("/login") ||
          href.includes("/account") ||
          href.length < 5 ||
          href.split("/").filter(Boolean).length > 4
        )
          continue

        const after = html.slice(m.index, m.index + 800)
        const titleMatch = after.match(
          /(?:class="[^"]*(?:name|title|product-title)[^"]*"[^>]*>|<h[23456][^>]*>)([^<]{3,100})/i,
        )
        const priceMatch = after.match(
          /(?:class="[^"]*price[^"]*"[^>]*>|<span[^>]*>)\s*(\d[\d.,]+\s*(?:kr|DKK))/i,
        )

        const url = resolveUrl(base, href)
        results.push({
          store: id,
          name: titleMatch?.[1]?.trim() || href.split("/").pop()?.replace(/-/g, " ") || "",
          url,
          price: priceMatch?.[1]?.trim() || "",
          imageUrl: "",
        })
      }

      const seen = new Set<string>()
      return results.filter((r) => {
        if (seen.has(r.url)) return false
        seen.add(r.url)
        return true
      })
    },
  }
}

const corenutrition = makeGenericSearcher(
  "corenutrition",
  "corenutrition.dk",
  (q) => `/search?q=${encodeURIComponent(q)}`,
)

const weightworld = makeGenericSearcher(
  "weightworld",
  "weightworld.dk",
  (q) => `/search?q=${encodeURIComponent(q)}`,
)

const bodystore = makeGenericSearcher(
  "bodystore",
  "bodystore.dk",
  (q) => `/search?q=${encodeURIComponent(q)}`,
)

const bodylab = makeGenericSearcher(
  "bodylab",
  "bodylab.dk",
  (q) => `/shop/search.html?search=${encodeURIComponent(q)}`,
)

const helsegrossisten = makeGenericSearcher(
  "helsegrossisten",
  "helsegrossisten.dk",
  (q) => `/search?q=${encodeURIComponent(q)}`,
)

const med24 = makeGenericSearcher(
  "med24",
  "med24.dk",
  (q) => `/catalogsearch/result/?q=${encodeURIComponent(q)}`,
)

const mmsportsstore = makeGenericSearcher(
  "mmsportsstore",
  "mmsportsstore.dk",
  (q) => `/search?q=${encodeURIComponent(q)}`,
)

const ALL_STORES: StoreSearcher[] = [
  healthwell,
  corenutrition,
  weightworld,
  bodystore,
  bodylab,
  helsegrossisten,
  med24,
  mmsportsstore,
]

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return await res.text()
}

async function searchStore(
  store: StoreSearcher,
  query: string,
): Promise<ProductCandidate[]> {
  const url = store.searchUrl(query)
  console.log(`  Searching ${store.id}: ${url}`)
  try {
    const html = await fetchHtml(url)
    const products = store.extractProducts(html, store.baseUrl)
    console.log(`    Found ${products.length} candidates`)
    return products
  } catch (e: any) {
    console.log(`    Error: ${e.message}`)
    return []
  }
}

async function searchAllStores(
  query: string,
  storeFilter?: string[],
  limit = 5,
): Promise<ProductCandidate[]> {
  const stores = storeFilter
    ? ALL_STORES.filter((s) => storeFilter.includes(s.id))
    : ALL_STORES

  const allResults: ProductCandidate[] = []

  for (const store of stores) {
    const results = await searchStore(store, query)
    allResults.push(...results.slice(0, limit))
    if (results.length > 0) {
      // Show top results
      for (const r of results.slice(0, 3)) {
        console.log(`      - ${r.name || "(no name)"} → ${r.url}`)
      }
    }
    await sleep(2000)
  }

  return allResults
}

async function main() {
  const args = process.argv.slice(2)
  const getArg = (flag: string): string | undefined => {
    const i = args.indexOf(flag)
    return i !== -1 ? args[i + 1] : undefined
  }

  const query = getArg("--query")
  const storesArg = getArg("--stores")
  const limit = parseInt(getArg("--limit") || "5") || 5

  if (!query) {
    console.log("Usage: npx tsx scripts/find-replacement-product.ts --query <search terms>")
    console.log("  --stores healthwell,corenutrition  (optional: limit to specific stores)")
    console.log("  --limit 5                          (optional: max results per store)")
    console.log("")
    console.log("Available stores:", ALL_STORES.map((s) => s.id).join(", "))
    return
  }

  const storeFilter = storesArg
    ? storesArg.split(",").map((s) => s.trim())
    : undefined

  console.log(`\nSearching for: "${query}"`)
  console.log(
    `Stores: ${storeFilter ? storeFilter.join(", ") : "all (priority order)"}`,
  )
  console.log("")

  const results = await searchAllStores(query, storeFilter, limit)

  console.log(`\n${"=".repeat(60)}`)
  console.log(`Total candidates found: ${results.length}`)
  console.log(`${"=".repeat(60)}\n`)

  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    console.log(`[${i + 1}] ${r.store}: ${r.name || "(no name)"}`)
    console.log(`    URL: ${r.url}`)
    if (r.price) console.log(`    Price: ${r.price}`)
    console.log("")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
