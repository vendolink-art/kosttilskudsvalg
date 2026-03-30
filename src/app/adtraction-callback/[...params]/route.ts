import { NextRequest, NextResponse } from "next/server"
import {
  transactionExists,
  saveTransaction,
  parseEpi,
  sendToSlack,
  sendToGA4,
  type AdtractionSale,
} from "@/lib/adtraction"

/**
 * Adtraction callback URL structure:
 * /adtraction-callback/{Program}/{EPI}/{OrderValue}/{Commission}/{IP}/{ClickTime}/{OrderTime}/{TransactionID}
 *
 * Adtraction sends HEAD requests. We process the sale on HEAD (matching PHP behaviour).
 */

async function handleCallback(
  _request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  const segments = (await params).params

  if (!segments || segments.length < 8) {
    return NextResponse.json(
      { error: "Invalid callback URL – expected 8 segments" },
      { status: 400 }
    )
  }

  const [program, rawEpi, orderValue, commission, ip, clickTime, orderTime, transactionId] =
    segments.map((s) => decodeURIComponent(s))

  const ua = _request.headers.get("user-agent") || ""
  if (/yandex/i.test(ua)) {
    return NextResponse.json({ error: "Blocked" }, { status: 400 })
  }

  if (!transactionId) {
    return NextResponse.json({ error: "Missing TransactionID" }, { status: 400 })
  }

  if (transactionExists(transactionId)) {
    return NextResponse.json(
      { error: "TransactionID already exists" },
      { status: 400 }
    )
  }

  const { epi, isPpc } = parseEpi(rawEpi)

  let clickDate: string | null = null
  let orderDate: string | null = null
  try {
    if (clickTime && clickTime !== "0") {
      clickDate = new Date(parseInt(clickTime, 10) * 1000).toISOString()
    }
    if (orderTime && orderTime !== "0") {
      orderDate = new Date(parseInt(orderTime, 10) * 1000).toISOString()
    }
  } catch {
    /* ignore invalid timestamps */
  }

  const sale: AdtractionSale = {
    program: program.replace(/\+/g, " "),
    epi,
    orderValue: parseInt(orderValue, 10) || 0,
    commission: parseInt(commission, 10) || 0,
    ip,
    clickTime: clickDate,
    orderTime: orderDate,
    transactionId,
    isPpc,
    createdAt: new Date().toISOString(),
  }

  saveTransaction(transactionId)

  // Fire and forget – don't block the response
  sendToSlack(sale).catch((e) => console.error("[adtraction] Slack failed:", e))
  sendToGA4(sale).catch((e) => console.error("[adtraction] GA4 failed:", e))

  return new NextResponse("OK", { status: 200 })
}

export const GET = handleCallback
export const HEAD = handleCallback
export const POST = handleCallback

export const dynamic = "force-dynamic"
