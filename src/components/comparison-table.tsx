"use client"

interface Product {
  name: string
  brand?: string
  price?: string
  amount?: string
  rating?: number
  note?: string
  slug: string
}

function getRatingColor(rating: number): string {
  if (rating >= 9) return "bg-emerald-100 text-emerald-800"
  if (rating >= 8) return "bg-orange-100 text-orange-800"
  if (rating >= 6) return "bg-amber-100 text-amber-800"
  return "bg-slate-100 text-slate-700"
}

function getNoteStyle(note?: string): string {
  if (!note) return ""
  const lower = note.toLowerCase()
  if (lower.includes("bedst i test")) return "bg-amber-50 text-amber-800 border-amber-200"
  if (lower.includes("budget")) return "bg-green-50 text-green-800 border-green-200"
  if (lower.includes("premium")) return "bg-orange-50 text-orange-800 border-orange-200"
  if (lower.includes("anbefalet")) return "bg-blue-50 text-blue-800 border-blue-200"
  return "bg-slate-50 text-slate-700 border-slate-200"
}

export function ComparisonTable({
  products,
  amountLabel,
}: {
  products: Product[]
  amountLabel?: string
}) {
  const showAmountColumn = Boolean(amountLabel && products.some((p) => p.amount && p.amount.trim()))
  return (
    <div className="my-8 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200 bg-slate-50">
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Produkt</th>
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Mærke</th>
            <th className="px-3 py-3 text-right font-semibold text-slate-700">Pris</th>
            {showAmountColumn ? (
              <th className="px-3 py-3 text-right font-semibold text-slate-700">{amountLabel}</th>
            ) : null}
            <th className="px-3 py-3 text-center font-semibold text-slate-700">Bedømmelse</th>
            <th className="px-3 py-3 text-left font-semibold text-slate-700">Note</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((p, i) => (
            <tr key={i} className="transition-colors hover:bg-slate-50/50">
              <td className="px-3 py-3">
                <a
                  href={`#product-${p.slug}`}
                  className="font-medium text-green-700 hover:underline"
                >
                  {p.name}
                </a>
              </td>
              <td className="px-3 py-3 text-slate-600">{p.brand || "–"}</td>
              <td className="px-3 py-3 text-right font-medium text-slate-800">
                {p.price || "Se pris"}
              </td>
              {showAmountColumn ? (
                <td className="px-3 py-3 text-right font-medium text-slate-700">
                  {p.amount || "–"}
                </td>
              ) : null}
              <td className="px-3 py-3 text-center">
                {p.rating ? (
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getRatingColor(p.rating)}`}>
                    {p.rating.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-slate-400">–</span>
                )}
              </td>
              <td className="px-3 py-3">
                {p.note ? (
                  <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${getNoteStyle(p.note)}`}>
                    {p.note}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
