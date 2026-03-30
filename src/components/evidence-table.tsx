interface EvidenceRow {
  product: string
  activeIngredient: string
  dosePerServing: string
  servingsPerPackage: string | number
  pricePerDailyDose: string
  additives: string
  certification?: string
  evidenceLevel?: "A" | "B" | "C" | "D"
}

interface EvidenceTableProps {
  rows: EvidenceRow[]
  caption?: string
}

const EVIDENCE_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-blue-100 text-blue-800",
  C: "bg-amber-100 text-amber-800",
  D: "bg-red-100 text-red-800",
}

export function EvidenceTable({ rows, caption }: EvidenceTableProps) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-slate-200">
      {caption && (
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <p className="text-xs font-semibold text-slate-700">{caption}</p>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Produkt</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Aktiv ingrediens</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Dosis/portion</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Portioner</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Pris/dagsdosis</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Tilsætnings.</th>
            {rows.some(r => r.certification) && (
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Cert.</th>
            )}
            {rows.some(r => r.evidenceLevel) && (
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600">Evidens</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/50">
              <td className="px-3 py-2.5 font-medium text-slate-900">{row.product}</td>
              <td className="px-3 py-2.5 text-slate-700">{row.activeIngredient}</td>
              <td className="px-3 py-2.5 text-slate-700">{row.dosePerServing}</td>
              <td className="px-3 py-2.5 text-slate-700">{row.servingsPerPackage}</td>
              <td className="px-3 py-2.5 font-medium text-slate-900">{row.pricePerDailyDose}</td>
              <td className="px-3 py-2.5 text-slate-600">{row.additives}</td>
              {rows.some(r => r.certification) && (
                <td className="px-3 py-2.5 text-slate-600">{row.certification || "—"}</td>
              )}
              {rows.some(r => r.evidenceLevel) && (
                <td className="px-3 py-2.5">
                  {row.evidenceLevel ? (
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${EVIDENCE_COLORS[row.evidenceLevel]}`}>
                      {row.evidenceLevel}
                    </span>
                  ) : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
