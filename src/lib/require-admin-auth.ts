import { redirect } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"

export async function requireAdminAuth() {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect("/admin/login")
  }
}
