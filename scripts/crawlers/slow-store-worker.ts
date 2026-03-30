/**
 * slow-store-worker.ts
 *
 * Background worker that crawls ONE product URL per interval
 * for selected stores (default: corenutrition + healthwell).
 *
 * Usage examples:
 *   npx tsx scripts/crawlers/slow-store-worker.ts
 *   npx tsx scripts/crawlers/slow-store-worker.ts --interval-seconds 300
 *   npx tsx scripts/crawlers/slow-store-worker.ts --stores corenutrition,healthwell --max-runs 10
 */

import { promises as fs } from "fs"
import path from "path"
import { exec as execCb } from "child_process"
import { promisify } from "util"

const exec = promisify(execCb)

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const STATE_FILE = path.join(process.cwd(), "content", "crawled-products", "_slow-store-worker-state.json")

type StoreId = "corenutrition" | "healthwell"
type State = {
  perStoreIndex: Partial<Record<StoreId, number>>
  lastStore: StoreId | null
  runs: number
  updatedAt: string
}

const DOMAIN_TO_STORE: Record<string, StoreId> = {
  "corenutrition.dk": "corenutrition",
  "healthwell.dk": "healthwell",
}

const DEFAULT_STATE: State = {
  perStoreIndex: {},
  lastStore: null,
  runs: 0,
  updatedAt: new Date().toISOString(),
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function parseArg(args: string[], flag: string, fallback?: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx === -1) return fallback
  return args[idx + 1] ?? fallback
}

function normalizeDomain(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, "").toLowerCase()
  } catch {
    return null
  }
}

async function loadState(): Promise<State> {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8")
    const parsed = JSON.parse(raw.replace(/^\uFEFF/, "")) as State
    return {
      perStoreIndex: parsed.perStoreIndex || {},
      lastStore: parsed.lastStore || null,
      runs: parsed.runs || 0,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

async function saveState(state: State): Promise<void> {
  await fs.mkdir(path.dirname(STATE_FILE), { recursive: true })
  state.updatedAt = new Date().toISOString()
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8")
}

async function loadStoreUrls(stores: StoreId[]): Promise<Record<StoreId, string[]>> {
  const raw = await fs.readFile(BUY_LINKS_FILE, "utf8")
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, "")) as Record<string, string>

  const out: Record<StoreId, string[]> = {
    corenutrition: [],
    healthwell: [],
  }
  const seen = new Set<string>()

  for (const url of Object.values(parsed)) {
    const normalized = String(url || "").trim()
    if (!/^https?:\/\//i.test(normalized)) continue
    const domain = normalizeDomain(normalized)
    if (!domain) continue
    const store = DOMAIN_TO_STORE[domain]
    if (!store || !stores.includes(store)) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    out[store].push(normalized)
  }

  return out
}

function pickNextStore(stores: StoreId[], lastStore: StoreId | null): StoreId {
  if (stores.length === 1) return stores[0]
  if (!lastStore) return stores[0]
  const idx = stores.indexOf(lastStore)
  if (idx === -1) return stores[0]
  return stores[(idx + 1) % stores.length]
}

async function crawlSingleUrl(url: string): Promise<void> {
  const escaped = url.replace(/"/g, '\\"')
  const cmd = `npx tsx scripts/crawlers/crawl.ts --url "${escaped}"`
  await exec(cmd, {
    cwd: process.cwd(),
    timeout: 240000,
    windowsHide: true,
  })
}

async function main() {
  const args = process.argv.slice(2)
  const intervalSeconds = Math.max(30, parseInt(parseArg(args, "--interval-seconds", "300") || "300", 10) || 300)
  const storesArg = parseArg(args, "--stores", "corenutrition,healthwell") || "corenutrition,healthwell"
  const maxRunsRaw = parseArg(args, "--max-runs")
  const maxRuns = maxRunsRaw ? Math.max(1, parseInt(maxRunsRaw, 10) || 1) : null
  const once = args.includes("--once")

  const stores = storesArg
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is StoreId => s === "corenutrition" || s === "healthwell")

  if (stores.length === 0) {
    console.error("No valid stores selected. Use --stores corenutrition,healthwell")
    process.exit(1)
  }

  console.log("═══════════════════════════════════════")
  console.log("  Slow Store Worker")
  console.log("═══════════════════════════════════════")
  console.log(`Stores: ${stores.join(", ")}`)
  console.log(`Interval: ${intervalSeconds}s`)
  console.log(`State file: ${STATE_FILE}`)
  if (maxRuns) console.log(`Max runs: ${maxRuns}`)
  if (once) console.log("Mode: once")
  console.log()

  let runs = 0
  while (true) {
    const urlsByStore = await loadStoreUrls(stores)
    const state = await loadState()
    const activeStores = stores.filter((s) => (urlsByStore[s] || []).length > 0)

    if (activeStores.length === 0) {
      console.log("No URLs found for selected stores.")
      break
    }

    const store = pickNextStore(activeStores, state.lastStore)
    const list = urlsByStore[store] || []
    if (list.length === 0) {
      console.log(`[${new Date().toISOString()}] No URLs for ${store}, skipping.`)
      if (once) break
      await sleep(intervalSeconds * 1000)
      continue
    }

    const idx = state.perStoreIndex[store] || 0
    const safeIdx = idx >= list.length ? 0 : idx
    const url = list[safeIdx]

    console.log(`[${new Date().toISOString()}] Crawling ${store} (${safeIdx + 1}/${list.length})`)
    console.log(`  ${url}`)
    try {
      await crawlSingleUrl(url)
      console.log("  ✓ done")
    } catch (e: any) {
      console.log(`  ✗ failed: ${e?.message || "unknown error"}`)
    }

    state.perStoreIndex[store] = safeIdx + 1 >= list.length ? 0 : safeIdx + 1
    state.lastStore = store
    state.runs = (state.runs || 0) + 1
    await saveState(state)

    runs += 1
    if (once) break
    if (maxRuns && runs >= maxRuns) break

    console.log(`Waiting ${intervalSeconds}s...\n`)
    await sleep(intervalSeconds * 1000)
  }

  console.log("Worker stopped.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

