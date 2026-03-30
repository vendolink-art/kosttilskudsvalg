interface PriceBar {
  name: string
  pricePerDose: number
  pricePerPackage?: number
  doses?: number
  detail?: string
  highlight?: boolean
}

interface PriceEconomyGraphProps {
  title?: string
  bars: PriceBar[]
  unit?: string
}

export function PriceEconomyGraph({
  title = "Pris per dagsdosis – sammenligning",
  bars,
  unit = "kr/dosis",
}: PriceEconomyGraphProps) {
  const maxPrice = Math.max(...bars.map((b) => b.pricePerDose))

  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
          <svg className="h-5 w-5 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>

      <div className="space-y-3">
        {bars
          .sort((a, b) => a.pricePerDose - b.pricePerDose)
          .map((bar, i) => {
            const widthPct = maxPrice > 0 ? (bar.pricePerDose / maxPrice) * 100 : 0
            return (
              <div key={i} className="group">
                <div className="mb-1 flex items-center justify-between">
                  <span className={`text-sm font-medium ${bar.highlight ? "text-green-800" : "text-slate-700"}`}>
                    {bar.name}
                    {bar.highlight && (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                        Bedste værdi
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {bar.pricePerDose.toFixed(1)} {unit}
                  </span>
                </div>
                <div className="h-6 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      bar.highlight
                        ? "bg-gradient-to-r from-green-500 to-green-400"
                        : i === 0
                        ? "bg-gradient-to-r from-green-500 to-green-400"
                        : "bg-gradient-to-r from-slate-400 to-slate-300"
                    }`}
                    style={{ width: `${Math.max(widthPct, 8)}%` }}
                  />
                </div>
                {bar.detail ? (
                  <p className="mt-0.5 text-[11px] text-slate-400">{bar.detail}</p>
                ) : bar.pricePerPackage && bar.doses ? (
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {bar.pricePerPackage} kr / {bar.doses} portioner
                  </p>
                ) : null}
              </div>
            )
          })}
      </div>
    </div>
  )
}
