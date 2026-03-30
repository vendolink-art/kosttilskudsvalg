import fs from "fs"
import path from "path"

export interface AdtractionSale {
  program: string
  epi: string
  orderValue: number
  commission: number
  ip: string
  clickTime: string | null
  orderTime: string | null
  transactionId: string
  isPpc: boolean
  createdAt: string
}

const TX_FILE = path.join(process.cwd(), "data", "transactions.json")

function ensureDataDir() {
  const dir = path.dirname(TX_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function readTransactions(): string[] {
  ensureDataDir()
  if (!fs.existsSync(TX_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(TX_FILE, "utf-8"))
  } catch {
    return []
  }
}

function writeTransaction(txId: string) {
  const txs = readTransactions()
  txs.push(txId)
  // Keep last 10 000 to avoid unbounded growth
  const trimmed = txs.slice(-10_000)
  fs.writeFileSync(TX_FILE, JSON.stringify(trimmed), "utf-8")
}

export function transactionExists(txId: string): boolean {
  return readTransactions().includes(txId)
}

export function saveTransaction(txId: string) {
  writeTransaction(txId)
}

export function parseEpi(rawEpi: string): { epi: string; isPpc: boolean } {
  const parts = rawEpi.split("|||")
  let epi = parts[0]
  let epi2 = parts.length > 1 ? parts[1] : ""

  if (/^50-(.+)-50$/.test(epi2)) {
    epi2 = epi2.replace(/^50-(.+)-50$/, "$1")
  }

  if (epi2 && /ppc/.test(epi)) {
    const epiArr = epi.split("--").slice(0, 4)
    epiArr.push(epi2)
    epi = epiArr.join("--")
  }

  return { epi, isPpc: /ppc/.test(epi) }
}

export async function sendToSlack(sale: AdtractionSale) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn("[adtraction] SLACK_WEBHOOK_URL not set, skipping")
    return
  }

  const ppcText = sale.isPpc ? "Ads " : ""
  const commissionDkk = (sale.commission / 100).toFixed(2)
  const orderDkk = (sale.orderValue / 100).toFixed(2)

  const text = [
    `Nytt ${ppcText}sälj *kosttilskudsvalg.dk*`,
    `Program: ${sale.program}`,
    `Ordervärde: ${orderDkk} DKK`,
    `Provision: ${commissionDkk} DKK`,
    sale.orderTime ? `Tid: ${sale.orderTime}` : null,
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
    console.error("[adtraction] Slack error:", err)
  }
}

export async function sendToGA4(sale: AdtractionSale) {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const apiSecret = process.env.GA4_API_SECRET
  if (!measurementId || !apiSecret) {
    console.warn("[adtraction] GA4 credentials not set, skipping")
    return
  }

  const epiParts = sale.epi.split("--")
  let clientId = epiParts.length >= 4 ? epiParts[3] : `adtraction-${Date.now()}`

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`

  const payload = {
    client_id: clientId,
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: `T_${sale.transactionId}`,
          value: sale.commission / 100,
          tax: 0,
          shipping: 0,
          currency: "DKK",
          items: [
            {
              item_id: `ADT_${epiParts[0] || "unknown"}`,
              item_name: sale.program,
              item_brand: sale.program.split("+")[0] || sale.program,
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
    console.error("[adtraction] GA4 error:", err)
  }
}
