import { NextRequest, NextResponse } from "next/server"
import {
  partnerAdsTransactionExists,
  savePartnerAdsTransaction,
  sendPartnerAdsToGA4,
  sendPartnerAdsToSlack,
  type PartnerAdsSale,
} from "@/lib/partner-ads"

/**
 * Polls Partner-ads XML sales feed and forwards sales originating from
 * kosttilskudsvalg.dk (identified by EPI prefix "ktv") to GA4 and Slack.
 *
 * GET /api/partner-ads-sync              → syncs last 2 days
 * GET /api/partner-ads-sync?days=7       → syncs last 7 days
 * GET /api/partner-ads-sync?fra=26-3-1&til=26-3-31  → custom range
 *
 * Intended to be called by a cron job (e.g. every hour).
 * Protected by SESSION_SECRET as a bearer token.
 */

const EPI_PREFIX = "ktv"

function formatPaDate(d: Date): string {
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1)
  const dd = String(d.getDate())
  return `${yy}-${mm}-${dd}`
}

interface PaSaleXml {
  programid: string
  programnavn: string
  uid: string
  ordrenummer: string
  omsaetning: string
  kommission: string
  tidspunkt: string
  status: string
}

function parseXmlSales(xml: string): PaSaleXml[] {
  const sales: PaSaleXml[] = []
  const saleRegex = /<salg>([\s\S]*?)<\/salg>/g
  let match: RegExpExecArray | null

  while ((match = saleRegex.exec(xml)) !== null) {
    const block = match[1]
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
      return m ? m[1].trim() : ""
    }

    sales.push({
      programid: get("programid"),
      programnavn: get("programnavn"),
      uid: get("uid"),
      ordrenummer: get("ordrenummer"),
      omsaetning: get("omsaetning"),
      kommission: get("kommission"),
      tidspunkt: get("tidspunkt"),
      status: get("status"),
    })
  }
  return sales
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || ""
  const expectedToken = process.env.CRON_SECRET || process.env.SESSION_SECRET
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.PARTNER_ADS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "PARTNER_ADS_API_KEY not set" }, { status: 500 })
  }

  const params = request.nextUrl.searchParams
  let fra: string
  let til: string

  if (params.has("fra") && params.has("til")) {
    fra = params.get("fra")!
    til = params.get("til")!
  } else {
    const days = parseInt(params.get("days") || "2", 10)
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - days)
    fra = formatPaDate(from)
    til = formatPaDate(now)
  }

  const feedUrl = `https://www.partner-ads.com/dk/vissalg_xml.php?key=${apiKey}&fra=${fra}&til=${til}`

  let xml: string
  try {
    const resp = await fetch(feedUrl, { cache: "no-store" })
    xml = await resp.text()
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch Partner-ads feed", detail: String(err) }, { status: 502 })
  }

  const allSales = parseXmlSales(xml)
  const ktvSales = allSales.filter((s) => s.uid.startsWith(EPI_PREFIX))

  let synced = 0
  let skipped = 0
  const errors: string[] = []

  for (const s of ktvSales) {
    const txId = `${s.programid}-${s.ordrenummer}`

    if (partnerAdsTransactionExists(txId)) {
      skipped++
      continue
    }

    const sale: PartnerAdsSale = {
      programId: s.programid,
      epi: s.uid,
      orderValue: Math.round(parseFloat(s.omsaetning || "0") * 100),
      commission: Math.round(parseFloat(s.kommission || "0") * 100),
      transactionId: txId,
      isPpc: /ppc/i.test(s.uid),
      createdAt: new Date().toISOString(),
    }

    try {
      savePartnerAdsTransaction(txId)
      await sendPartnerAdsToGA4(sale)
      await sendPartnerAdsToSlack(sale)
      synced++
    } catch (err) {
      errors.push(`${txId}: ${String(err)}`)
    }
  }

  return NextResponse.json({
    period: { fra, til },
    totalSales: allSales.length,
    ktvSales: ktvSales.length,
    synced,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  })
}

export const dynamic = "force-dynamic"
