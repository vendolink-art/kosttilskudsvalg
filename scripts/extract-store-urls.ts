/**
 * extract-store-urls.ts
 *
 * Streamer SQL-dumpen rad för rad och extraherar alla
 * butiksdomäner/affiliate-URL:er från ProductPage-data.
 *
 * Kör: npx tsx scripts/extract-store-urls.ts
 */

import { createReadStream } from "fs"
import { createInterface } from "readline"
import path from "path"

const SQL_FILE = path.join(process.cwd(), "kostmagasinet_dk-db-2026-02-06.sql")

async function main() {
  console.log("=== Extraherer butikslinks fra SQL-dump ===\n")

  const rl = createInterface({
    input: createReadStream(SQL_FILE, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  })

  const allUrls = new Map<string, number>() // domain -> count
  const sampleUrls = new Map<string, string[]>() // domain -> first 3 full URLs
  let linesScanned = 0

  for await (const line of rl) {
    linesScanned++

    // Look for URLs in ProductPage inserts and any table with affiliate/shop links
    // Match http/https URLs
    const urlRegex = /https?:\/\/[^\s'",)\\]+/g
    let match: RegExpExecArray | null
    while ((match = urlRegex.exec(line)) !== null) {
      const url = match[0].replace(/\\+$/, "").replace(/'+$/, "")

      // Skip internal/irrelevant URLs
      if (url.includes("kostmagasinet.dk") || url.includes("kostmag.dk")) continue
      if (url.includes("silverstripe") || url.includes("localhost")) continue
      if (url.includes("google.com") || url.includes("facebook.com") || url.includes("twitter.com")) continue
      if (url.includes("schema.org") || url.includes("w3.org") || url.includes("jquery") || url.includes("cdn.")) continue
      if (url.includes("wordpress") || url.includes("github.com")) continue
      if (url.includes(".css") || url.includes(".js") || url.includes(".png") || url.includes(".jpg") || url.includes(".svg")) continue

      try {
        const domain = new URL(url).hostname.replace(/^www\./, "")

        allUrls.set(domain, (allUrls.get(domain) || 0) + 1)

        if (!sampleUrls.has(domain)) sampleUrls.set(domain, [])
        const samples = sampleUrls.get(domain)!
        if (samples.length < 3) samples.push(url.slice(0, 120))
      } catch {
        // invalid URL, skip
      }
    }
  }

  console.log(`Scannede ${linesScanned.toLocaleString()} linjer\n`)

  // Sort by count (most common first)
  const sorted = [...allUrls.entries()].sort((a, b) => b[1] - a[1])

  console.log(`Fandt ${sorted.length} unikke domæner\n`)
  console.log("═══════════════════════════════════════")
  console.log("  TOP BUTIKKER / AFFILIATE-DOMÆNER")
  console.log("═══════════════════════════════════════\n")

  for (const [domain, count] of sorted.slice(0, 50)) {
    console.log(`  ${domain} (${count} links)`)
    const samples = sampleUrls.get(domain) || []
    for (const s of samples.slice(0, 2)) {
      console.log(`    → ${s}`)
    }
    console.log()
  }

  // Also output as JSON for later use
  const output = sorted.map(([domain, count]) => ({
    domain,
    count,
    samples: (sampleUrls.get(domain) || []).slice(0, 3),
  }))

  const { promises: fs } = await import("fs")
  await fs.writeFile(
    path.join(process.cwd(), "content", "store-domains.json"),
    JSON.stringify(output, null, 2),
    "utf-8"
  )
  console.log(`\nSparede komplet liste til content/store-domains.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
