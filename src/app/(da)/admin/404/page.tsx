import Link from "next/link"
import { getBrokenProductLinksReport } from "@/lib/broken-product-links"
import { Admin404Table } from "./Admin404Table"
import { redirect } from "next/navigation"
import { requireAdminAuth } from "@/lib/require-admin-auth"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin 404-länkkontroll – Kosttilskudsvalg",
  robots: { index: false, follow: false },
}

export default async function Admin404Page({ searchParams }: { searchParams: Promise<{ scanning?: string }> }) {
  await requireAdminAuth()
  const broken = await getBrokenProductLinksReport()
  const resolvedParams = await searchParams
  const isScanning = resolvedParams.scanning === "true"

  async function forceRefresh() {
    "use server"

    const { isAuthenticated } = await import("@/lib/auth")
    if (!(await isAuthenticated())) {
      const { redirect: authRedirect } = await import("next/navigation")
      authRedirect("/admin/login")
    }

    const pathMod = await import("path")
    const { spawn: spawnBg } = await import("child_process")

    const scriptPath = pathMod.join(process.cwd(), "scripts", "update-broken-links.ts")
    const child = spawnBg("npx", ["tsx", scriptPath], {
      detached: true,
      stdio: "ignore",
      cwd: process.cwd(),
      windowsHide: true,
      shell: process.platform === "win32",
    })
    child.unref()

    redirect("/admin/404?scanning=true")
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brutna eller utgångna produktlänkar</h1>
          <p className="mt-1 text-sm text-slate-600">
            Visar produktlänkar som just nu svarar med HTTP 404 eller leder till sidor där produkten markerats som utgången. Listan uppdateras automatiskt en gång per dygn.
          </p>
        </div>
        <div className="flex gap-3">
          {isScanning ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Genomsökning startad. Det tar ca 2-3 minuter. Ladda om sidan senare.
            </div>
          ) : (
            <form action={forceRefresh}>
              <button 
                type="submit"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                title="Tvingar fram en ny genomsökning av alla länkar i bakgrunden (tar ca 2-3 minuter)"
              >
                Tvinga ny genomsökning
              </button>
            </form>
          )}
          <Link href="/admin" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Tillbaka till admin
          </Link>
        </div>
      </div>

      <div className="mb-4 text-sm text-slate-600">
        Hittade <strong>{broken.length}</strong> brutna eller utgångna produktlänkar.
      </div>

      <Admin404Table rows={broken} />
    </div>
  )
}

