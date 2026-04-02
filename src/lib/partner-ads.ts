import { transactionExists, saveTransaction, parseEpi } from "@/lib/adtraction"

export interface PartnerAdsSale {
  programId: string
  epi: string
  orderValue: number
  commission: number
  transactionId: string
  isPpc: boolean
  createdAt: string
}

/**
 * Partner-ads callback URL structure (path segments):
 * /partnerads-callback/{cprogramid}/{uid}|||{uid2}/{omprsalg}/{belob}/0/0/0/0/{cprogramid}-{ordrenummer}
 *
 * Segments: [programId, epi, orderValue, commission, 0, 0, 0, 0, transactionId]
 * Values in øre (divide by 100 for DKK).
 */
export function parsePartnerAdsSegments(segments: string[]): PartnerAdsSale | null {
  if (!segments || segments.length < 9) return null

  const decoded = segments.map((s) => decodeURIComponent(s))
  const [programId, rawEpi, orderValue, commission, , , , , transactionId] = decoded

  if (!transactionId) return null

  const { epi, isPpc } = parseEpi(rawEpi)

  return {
    programId,
    epi,
    orderValue: parseInt(orderValue, 10) || 0,
    commission: parseInt(commission, 10) || 0,
    transactionId,
    isPpc,
    createdAt: new Date().toISOString(),
  }
}

export function partnerAdsTransactionExists(txId: string): boolean {
  return transactionExists(`PA_${txId}`)
}

export function savePartnerAdsTransaction(txId: string) {
  saveTransaction(`PA_${txId}`)
}

export async function sendPartnerAdsToGA4(sale: PartnerAdsSale) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const apiSecret = process.env.GA4_API_SECRET
  if (!measurementId || !apiSecret) {
    console.warn("[partner-ads] GA4 credentials not set, skipping")
    return
  }

  const epiParts = sale.epi.split("--")
  const clientId = epiParts.length >= 4 ? epiParts[3] : `partner-ads-${Date.now()}`

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`

  const payload = {
    client_id: clientId,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: `PA_${sale.transactionId}`,
          affiliation: "partner-ads",
          value: sale.commission / 100,
          tax: 0,
          shipping: 0,
          currency: "DKK",
          items: [
            {
              item_id: `PA_${sale.programId}`,
              item_name: `Program ${sale.programId}`,
              item_brand: `PA_${sale.programId}`,
              price: sale.commission / 100,
              quantity: 1,
            },
          ],
        },
      },
    ],
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error("[partner-ads] GA4 error:", err)
  }
}

export async function sendPartnerAdsToSlack(sale: PartnerAdsSale) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn("[partner-ads] SLACK_WEBHOOK_URL not set, skipping")
    return
  }

  const ppcText = sale.isPpc ? "Ads " : ""
  const commissionDkk = (sale.commission / 100).toFixed(2)
  const orderDkk = (sale.orderValue / 100).toFixed(2)

  const text = [
    `Nytt ${ppcText}sälj *kosttilskudsvalg.dk* (Partner-ads)`,
    `Program: ${sale.programId}`,
    `Ordervärde: ${orderDkk} DKK`,
    `Provision: ${commissionDkk} DKK`,
    `TX: \`${sale.transactionId}\``,
  ]
    .filter(Boolean)
    .join("\n")

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
  } catch (err) {
    console.error("[partner-ads] Slack error:", err)
  }
}
