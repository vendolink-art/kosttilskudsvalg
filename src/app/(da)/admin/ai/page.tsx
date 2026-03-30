import ClientPage from "./ClientPage"
import { requireAdminAuth } from "@/lib/require-admin-auth"

export const metadata = {
  title: "Redaktionellt AI-verktyg",
  description: "Skapa kategoritester och produktrecensioner med SEO-optimerad MDX.",
  robots: { index: false, follow: false },
}

export default async function Page() {
  await requireAdminAuth()
  return <ClientPage />
}
