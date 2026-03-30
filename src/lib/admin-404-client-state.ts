export type Admin404RowSnapshot = {
  productSlug: string
  outgoingUrl: string
  statusCode: number
  testPageUrl: string | null
  testPosition: number | null
  categoryPageUrls: string[]
}

export type Admin404StickyRow = Admin404RowSnapshot & {
  statusMessage: string
  completedAt: number
}

export const ADMIN_404_STICKY_ROWS_KEY = "admin404:sticky-rows:v1"
export const ADMIN_404_UNLOAD_MARKER_KEY = "admin404:clear-next-load:v1"

export function getAdmin404RowKey(row: Pick<Admin404RowSnapshot, "productSlug" | "outgoingUrl">): string {
  return `${row.productSlug}::${row.outgoingUrl}`
}
