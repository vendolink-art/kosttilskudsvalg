import ClientPage from "./ClientPage"
import { requireAdminAuth } from "@/lib/require-admin-auth"

export const metadata = {
  title: "Generator – Admin",
  description: "Generer og regenerer kategori- og produktsider med AI-generatoren.",
  robots: { index: false, follow: false },
}

export default async function Page() {
  await requireAdminAuth()
  return <ClientPage />
}

