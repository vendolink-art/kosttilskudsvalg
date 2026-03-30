// auth.ts – Enkel autentificering for admin-sider
import { cookies } from "next/headers"
import crypto from "crypto"

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val
}

const ADMIN_USERNAME = requireEnv("ADMIN_USERNAME")
const ADMIN_PASSWORD = requireEnv("ADMIN_PASSWORD")
const SESSION_SECRET = requireEnv("SESSION_SECRET")
const SESSION_COOKIE_NAME = "admin_session"
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 timer

function generateSessionToken(timestamp: number): string {
  const data = `${timestamp}:${ADMIN_USERNAME}:${ADMIN_PASSWORD}`
  const hmac = crypto.createHmac("sha256", SESSION_SECRET)
  hmac.update(data)
  return `${timestamp}:${hmac.digest("hex")}`
}

function validateSessionToken(token: string): boolean {
  try {
    const [timestampStr] = token.split(":")
    const timestamp = parseInt(timestampStr, 10)
    if (Date.now() - timestamp > SESSION_DURATION) return false
    const expectedToken = generateSessionToken(timestamp)
    return token === expectedToken
  } catch {
    return false
  }
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    if (!sessionCookie?.value) return false
    return validateSessionToken(sessionCookie.value)
  } catch {
    return false
  }
}

export async function login(username: string, password: string): Promise<boolean> {
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) return false
  const timestamp = Date.now()
  const token = generateSessionToken(timestamp)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  })
  return true
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
    return sessionCookie?.value || null
  } catch {
    return null
  }
}
