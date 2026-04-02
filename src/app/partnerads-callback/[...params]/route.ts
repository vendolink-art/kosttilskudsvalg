import { NextRequest, NextResponse } from "next/server"
import {
  parsePartnerAdsSegments,
  partnerAdsTransactionExists,
  savePartnerAdsTransaction,
  sendPartnerAdsToGA4,
  sendPartnerAdsToSlack,
} from "@/lib/partner-ads"

/**
 * Partner-ads callback URL structure:
 * /partnerads-callback/{cprogramid}/{uid}|||{uid2}/{omprsalg}/{belob}/0/0/0/0/{cprogramid}-{ordrenummer}
 *
 * Configure in Partner-ads admin as:
 * https://www.kosttilskudsvalg.dk/partnerads-callback/[cprogramid]/[uid]|||[uid2]/[omprsalg]/[belob]/0/0/0/0/[cprogramid]-[ordrenummer]
 */

async function handleCallback(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  const segments = (await params).params

  const ua = request.headers.get("user-agent") || ""
  if (/yandex/i.test(ua)) {
    return NextResponse.json({ error: "Blocked" }, { status: 400 })
  }

  const sale = parsePartnerAdsSegments(segments)
  if (!sale) {
    return NextResponse.json(
      { error: "Invalid callback URL – expected 9 segments" },
      { status: 400 }
    )
  }

  if (partnerAdsTransactionExists(sale.transactionId)) {
    return NextResponse.json(
      { error: "TransactionID already exists" },
      { status: 400 }
    )
  }

  savePartnerAdsTransaction(sale.transactionId)

  sendPartnerAdsToSlack(sale).catch((e) =>
    console.error("[partner-ads] Slack failed:", e)
  )
  sendPartnerAdsToGA4(sale).catch((e) =>
    console.error("[partner-ads] GA4 failed:", e)
  )

  return new NextResponse("OK", { status: 200 })
}

export const GET = handleCallback
export const HEAD = handleCallback
export const POST = handleCallback

export const dynamic = "force-dynamic"
