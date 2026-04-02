import { transactionExists, saveTransaction } from "@/lib/adtraction"

export interface PartnerAdsSale {
  program: string
  programId: string
  epi: string
  orderValue: number
  commission: number
  transactionId: string
  isPpc: boolean
  createdAt: string
}

export function parsePartnerAdsParams(params: URLSearchParams): PartnerAdsSale | null {
  const transactionId = params.get("orderid") || params.get("transactionid") || ""
  if (!transactionId) return null

  const rawEpi = params.get("epi") || params.get("epi1") || ""
  const isPpc = /ppc/i.test(rawEpi)

  return {
    program: params.get("program") || params.get("programname") || "Partner-ads",
    programId: params.get("programid") || "",
    epi: rawEpi,
    orderValue: Math.round(parseFloat(params.get("ordervalue") || "0") * 100),
    commission: Math.round(parseFloat(params.get("commission") || "0") * 100),
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
              item_id: `PA_${sale.programId || "unknown"}`,
              item_name: sale.program,
              item_brand: sale.program,
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
    `Program: ${sale.program}`,
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
