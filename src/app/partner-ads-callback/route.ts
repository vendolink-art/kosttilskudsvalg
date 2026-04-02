import { NextRequest, NextResponse } from "next/server"
import {
  parsePartnerAdsParams,
  partnerAdsTransactionExists,
  savePartnerAdsTransaction,
  sendPartnerAdsToGA4,
  sendPartnerAdsToSlack,
} from "@/lib/partner-ads"

/**
 * Partner-ads postback URL (configure in Partner-ads admin):
 * https://www.kosttilskudsvalg.dk/partner-ads-callback?programid={programid}&program={programname}&orderid={orderid}&ordervalue={ordervalue}&commission={commission}&epi={epi}
 *
 * Partner-ads sends GET requests with query parameters.
 */

async function handleCallback(request: NextRequest) {
  const ua = request.headers.get("user-agent") || ""
  if (/yandex/i.test(ua)) {
    return NextResponse.json({ error: "Blocked" }, { status: 400 })
  }

  const params = request.nextUrl.searchParams

  const sale = parsePartnerAdsParams(params)
  if (!sale) {
    return NextResponse.json(
      { error: "Missing required parameter: orderid" },
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
