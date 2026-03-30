interface IngredientRow {
  ingredient: string
  function: string
  optimalDose: string
  absorption: string
  sideEffects?: string
  evidenceLevel: "Stærk" | "Moderat" | "Begrænset" | "Svag"
}

interface IngredientComparisonTableProps {
  rows: IngredientRow[]
  title?: string
}

const EVIDENCE_STYLES: Record<string, string> = {
  "Stærk": "bg-green-100 text-green-800",
  "Moderat": "bg-blue-100 text-blue-800",
  "Begrænset": "bg-amber-100 text-amber-800",
  "Svag": "bg-red-100 text-red-800",
}

export function IngredientComparisonTable({
  rows,
  title = "Ingredienssammenligning",
}: IngredientComparisonTableProps) {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ingrediens</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Funktion</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Optimal dosis</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Absorption</th>
              {rows.some(r => r.sideEffects) && (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Bivirkninger</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Evidens</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-900">{row.ingredient}</td>
                <td className="px-4 py-3 text-slate-600">{row.function}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{row.optimalDose}</td>
                <td className="px-4 py-3 text-slate-600">{row.absorption}</td>
                {rows.some(r => r.sideEffects) && (
                  <td className="px-4 py-3 text-slate-500 text-xs">{row.sideEffects || "—"}</td>
                )}
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${EVIDENCE_STYLES[row.evidenceLevel] || "bg-slate-100 text-slate-600"}`}>
                    {row.evidenceLevel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
