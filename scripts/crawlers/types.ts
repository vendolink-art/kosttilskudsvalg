/**
 * Shared types for all store crawlers.
 */

export interface CrawledProduct {
  /** Source URL that was crawled */
  sourceUrl: string
  /** Store domain */
  store: string
  /** Product name */
  name: string
  /** Brand / manufacturer */
  brand: string
  /** Price in DKK (string, e.g. "279 kr") */
  price: string
  /** Numeric price (for sorting/comparison) */
  priceNumeric: number | null
  /** Currency (almost always DKK) */
  currency: string
  /** Main product image URL */
  imageUrl: string
  /** Additional images */
  images: string[]
  /** Short description (first ~500 chars) */
  description: string
  /** Full product description */
  fullDescription: string
  /** Short bullet highlights (USPs) if present */
  highlights?: string[]
  /** Flavor variants shown on the product page (if present) */
  flavors?: string[]
  /** Category / breadcrumb from the store */
  storeCategory: string
  /** EAN / barcode if available */
  ean: string
  /** Weight / volume (e.g. "750 g", "60 kapsler") */
  size: string
  /** In stock? */
  inStock: boolean
  /** Rating from the store (if any) */
  storeRating: string
  /** Number of reviews on store */
  reviewCount: number
  /** Parsed review snippets (only when available) */
  reviews?: CrawledReview[]
  /** Parsed Q&A (questions and answers), when exposed */
  qa?: CrawledQa[]
  /** Ingredients / active substances */
  ingredients: string
  /** Suggested usage / dosage instructions (if present) */
  dosage: string
  /** Nutritional info / supplement facts */
  nutritionInfo: string
  /** Country of origin (if present on the page) */
  originCountry: string
  /** Timestamp of crawl */
  crawledAt: string
}

export interface CrawledReview {
  author: string
  ratingValue: number | null
  bestRating: number | null
  datePublished: string
  headline: string
  body: string
}

export interface CrawledQa {
  author: string
  authorLabel: string
  question: string
  datePublished: string
  answers: CrawledQaAnswer[]
}

export interface CrawledQaAnswer {
  author: string
  authorTitle: string
  datePublished: string
  body: string
}

export interface StoreCrawler {
  /** Store identifier */
  storeId: string
  /** Domain(s) this crawler handles */
  domains: string[]
  /** Does this store render product data via JavaScript? (needs Playwright) */
  needsJs?: boolean
  /** CSS selector to wait for before capturing HTML (only used with Playwright) */
  waitForSelector?: string
  /** Optional interactions to perform before capturing HTML (Playwright only) */
  preCaptureActions?: Array<{
    type: "click"
    selector: string
    /** Optional selector to wait for after the action */
    waitForSelector?: string
    /** Optional timeout for waits (ms) */
    timeoutMs?: number
  }>
  /** Parse a product page HTML into CrawledProduct */
  parse(html: string, url: string): CrawledProduct
}
