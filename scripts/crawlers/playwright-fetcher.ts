/**
 * playwright-fetcher.ts
 *
 * Headless browser fetcher using Playwright (Chromium).
 * Used for stores that render product data via JavaScript (React, Vue, etc.)
 * instead of serving it in the initial HTML.
 *
 * Singleton pattern: one browser instance is shared across all fetches
 * within a crawl session. Call closeBrowser() when done.
 */

import { existsSync } from "fs"
import { chromium, type Browser, type BrowserContext, type Page } from "playwright"

let browser: Browser | null = null
let context: BrowserContext | null = null
const SYSTEM_BROWSER_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
]

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

/**
 * Launch browser (singleton). Reuses existing instance if available.
 */
async function ensureBrowser(): Promise<BrowserContext> {
  if (context) return context

  console.log("  🌐 Launching headless Chromium...")
  const executablePath = SYSTEM_BROWSER_PATHS.find((candidate) => existsSync(candidate))
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
    ],
  })

  context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "da-DK",
    viewport: { width: 1440, height: 900 },
    // Block heavy resources we don't need
    bypassCSP: true,
  })

  // Block images/fonts/media to speed up loading
  await context.route("**/*.{png,jpg,jpeg,gif,svg,webp,woff,woff2,ttf,eot,mp4,mp3}", (route) =>
    route.abort()
  )
  // Block tracking/analytics scripts
  await context.route(
    /google-analytics|googletagmanager|facebook|hotjar|segment|mixpanel|sentry/,
    (route) => route.abort()
  )

  return context
}

/**
 * Fetch a page using Playwright, wait for JS to render, return final HTML.
 *
 * @param url - The URL to fetch
 * @param waitForSelector - Optional CSS selector to wait for before capturing HTML
 * @param timeoutMs - Max time to wait for page load (default 15s)
 */
export async function fetchWithPlaywright(
  url: string,
  waitForSelector?: string,
  timeoutMs = 15000,
  actions?: Array<{
    type: "click"
    selector: string
    waitForSelector?: string
    timeoutMs?: number
  }>
): Promise<string> {
  const ctx = await ensureBrowser()
  const page = await ctx.newPage()

  try {
    // Navigate and wait for network to settle
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    })

    // Wait for JS-rendered content to appear
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 8000 })
      } catch {
        // Selector not found, but page may still have useful content
      }
    }

    // Optional pre-capture actions to reveal lazy-loaded sections (e.g. tabs/accordions).
    if (actions?.length) {
      for (const a of actions) {
        if (a.type === "click") {
          try {
            await page.click(a.selector, { timeout: a.timeoutMs ?? 5000 })
          } catch {
            // Non-fatal: some pages differ per locale/variant.
          }
          if (a.waitForSelector) {
            try {
              await page.waitForSelector(a.waitForSelector, { timeout: a.timeoutMs ?? 8000 })
            } catch {
              // Non-fatal: still return whatever we have.
            }
          }
        }
      }
    }

    // Give JS a moment to hydrate/render
    await page.waitForTimeout(2000)

    // Additional wait: wait for network to be mostly idle
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 })
    } catch {
      // Timeout on networkidle is OK — some pages keep polling
    }

    // Capture the fully-rendered HTML
    const html = await page.content()
    return html
  } finally {
    await page.close()
  }
}

/**
 * Close the shared browser instance. Call at end of crawl session.
 */
export async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close()
    context = null
  }
  if (browser) {
    await browser.close()
    browser = null
  }
}
