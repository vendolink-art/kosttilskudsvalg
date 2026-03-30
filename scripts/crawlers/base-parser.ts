/**
 * base-parser.ts
 *
 * Shared utilities for all store parsers.
 * Uses cheerio for HTML parsing.
 */

import * as cheerio from "cheerio"
import type { CrawledProduct } from "./types"

export type $ = cheerio.CheerioAPI

export function load(html: string): $ {
  return cheerio.load(html)
}

/** Extract text, trimmed */
export function text($el: cheerio.Cheerio<any>): string {
  return $el.text().replace(/\s+/g, " ").trim()
}

/** Extract first matching meta content */
export function meta($: $, name: string): string {
  return (
    $(`meta[property="${name}"]`).attr("content") ||
    $(`meta[name="${name}"]`).attr("content") ||
    ""
  ).trim()
}

/** Extract price from text (handles "279 kr", "279,00 DKK", "kr 279", "229.00", etc.) */
export function extractPrice(raw: string): { price: string; priceNumeric: number | null } {
  if (!raw) return { price: "", priceNumeric: null }

  // Detect format: "229.00" (international, dot=decimal) vs "1.299,00" (Danish, dot=thousands)
  const trimmed = raw.trim()
  let cleaned: string

  if (/^\d+\.\d{1,2}$/.test(trimmed)) {
    // Pure international format like "229.00", "156.0", "99.5"
    cleaned = trimmed
  } else if (/\d+\.\d{3}/.test(trimmed)) {
    // Danish thousands separator: "1.299" or "1.299,00"
    cleaned = trimmed.replace(/\./g, "").replace(",", ".")
  } else if (/\d+,\d{1,2}$/.test(trimmed) && !trimmed.includes(".")) {
    // Danish decimal with comma: "279,00", "83,25"
    cleaned = trimmed.replace(",", ".")
  } else {
    // Default: dots are thousands, comma is decimal (Danish standard)
    cleaned = trimmed.replace(/\./g, "").replace(",", ".")
  }

  const match = cleaned.match(/([\d]+(?:\.\d+)?)/)
  if (!match) return { price: trimmed, priceNumeric: null }
  return {
    price: trimmed,
    priceNumeric: parseFloat(match[1]),
  }
}

/** Build an empty CrawledProduct with defaults */
export function emptyProduct(url: string, store: string): CrawledProduct {
  return {
    sourceUrl: url,
    store,
    name: "",
    brand: "",
    price: "",
    priceNumeric: null,
    currency: "DKK",
    imageUrl: "",
    images: [],
    description: "",
    fullDescription: "",
    highlights: [],
    storeCategory: "",
    ean: "",
    size: "",
    inStock: true,
    storeRating: "",
    reviewCount: 0,
    reviews: [],
    qa: [],
    ingredients: "",
    dosage: "",
    nutritionInfo: "",
    originCountry: "",
    crawledAt: new Date().toISOString(),
  }
}

/** Try to resolve relative URL */
export function resolveUrl(base: string, relative: unknown): string {
  if (!relative || typeof relative !== "string") return ""
  if (relative.startsWith("http")) return relative
  if (relative.startsWith("//")) return "https:" + relative
  try {
    return new URL(relative, base).toString()
  } catch {
    return relative
  }
}
