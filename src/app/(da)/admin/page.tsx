import Link from "next/link"
import { redirect } from "next/navigation"
import { logout } from "@/lib/auth"
import { requireAdminAuth } from "@/lib/require-admin-auth"

export const metadata = {
  title: "Admin – Kosttilskudsvalg",
  robots: { index: false, follow: false },
}

async function handleLogout() {
  "use server"
  await logout()
  redirect("/admin/login")
}

export default async function AdminPage() {
  await requireAdminAuth()
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin</h1>
          <p className="mt-1 text-sm text-slate-600">Interna verktyg och länkbevakning.</p>
        </div>
        <form action={handleLogout}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Logga ut
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/admin/generator" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300">
          <h2 className="text-base font-semibold text-slate-900">Generator</h2>
          <p className="mt-1 text-sm text-slate-600">Byg og regenerer produkt- og kategorisider med AI-prompts.</p>
        </Link>

        <Link href="/admin/ai" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300">
          <h2 className="text-base font-semibold text-slate-900">AI-verktyg</h2>
          <p className="mt-1 text-sm text-slate-600">Generera och publicera kategoriinnehåll.</p>
        </Link>

        <Link href="/admin/404" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300">
          <h2 className="text-base font-semibold text-slate-900">404-linkrapport</h2>
          <p className="mt-1 text-sm text-slate-600">Se utgående produktlänkar som returnerar 404.</p>
        </Link>

        <Link href="/admin/data-quality" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300">
          <h2 className="text-base font-semibold text-slate-900">Datakvalitet</h2>
          <p className="mt-1 text-sm text-slate-600">Överblick av signal-confidence per produkt och kategori.</p>
        </Link>
      </div>
    </div>
  )
}
