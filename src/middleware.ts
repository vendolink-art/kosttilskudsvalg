// middleware.ts – Silo-redirects + admin-route auth
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SLUG_TO_SILO } from "@/lib/silo-config"

const SESSION_COOKIE_NAME = "admin_session"
const SESSION_DURATION = 24 * 60 * 60 * 1000
function requireEnvMiddleware(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val
}

async function hmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(data)
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const signature = await crypto.subtle.sign("HMAC", key, messageData)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

async function validateSessionToken(token: string, secret: string, username: string, password: string): Promise<boolean> {
  try {
    const [timestampStr, hash] = token.split(":")
    const timestamp = parseInt(timestampStr, 10)
    if (Date.now() - timestamp > SESSION_DURATION) return false
    const data = `${timestamp}:${username}:${password}`
    const expectedHash = await hmacSha256(secret, data)
    return hash === expectedHash
  } catch {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Silo redirect: /kosttilskud/<slug> → /<silo>/<slug> (public, no env needed)
  const kosttilskudMatch = pathname.match(/^\/kosttilskud\/([^/]+)$/)
  if (kosttilskudMatch) {
    const slug = kosttilskudMatch[1]
    const silo = SLUG_TO_SILO[slug]
    if (silo) {
      const url = request.nextUrl.clone()
      url.pathname = `/${silo}/${slug}`
      return NextResponse.redirect(url, 301)
    }
  }

  // Admin auth (only load env for protected routes)
  const needsAuth =
    (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) ||
    /\/kosttilskud\/[^/]+\/edit/.test(pathname)

  if (needsAuth) {
    const sessionSecret = requireEnvMiddleware("SESSION_SECRET")
    const adminUsername = requireEnvMiddleware("ADMIN_USERNAME")
    const adminPassword = requireEnvMiddleware("ADMIN_PASSWORD")

    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
    const isValid = sessionCookie?.value &&
      await validateSessionToken(sessionCookie.value, sessionSecret, adminUsername, adminPassword)
    if (!isValid) {
      const loginUrl = new URL("/admin/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/kosttilskud/:slug/edit",
    "/kosttilskud/:slug",
  ],
}
