/**
 * Reads the pre-generated winner-images.json that maps
 * every category slug to the image path of the #1 ranked product.
 */

import fs from "fs"
import path from "path"

let cache: Record<string, string> | null = null

export function getWinnerImages(): Record<string, string> {
  if (cache) return cache
  const filePath = path.join(process.cwd(), "content", "winner-images.json")
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "")
  cache = JSON.parse(raw) as Record<string, string>
  return cache
}

/** Get the winner image for a single slug (returns undefined if not found) */
export function getWinnerImage(slug: string): string | undefined {
  return getWinnerImages()[slug]
}
