interface TrustSignalsProps {
  productsTestedCount?: number
  categoriesCount?: number
  lastUpdated?: string
}

export function TrustSignals({
  productsTestedCount = 500,
  categoriesCount = 180,
  lastUpdated = "februar 2026",
}: TrustSignalsProps) {
  const signals = [
    { icon: "🔬", value: `${productsTestedCount}+`, label: "Produkter testet" },
    { icon: "📊", value: `${categoriesCount}+`, label: "Kategorier analyseret" },
    { icon: "🇩🇰", value: "100%", label: "Uafhængig dansk redaktion" },
    { icon: "📅", value: lastUpdated, label: "Sidst opdateret" },
  ]

  return (
    <div className="my-10 rounded-2xl border border-slate-200 bg-gradient-to-r from-green-50 to-white p-6">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {signals.map((s, i) => (
          <div key={i} className="text-center">
            <div className="text-2xl">{s.icon}</div>
            <p className="mt-1 text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
