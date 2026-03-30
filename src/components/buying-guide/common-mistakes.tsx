interface Mistake {
  mistake: string
  consequence: string
  solution: string
}

interface CommonMistakesProps {
  title?: string
  mistakes: Mistake[]
}

export function CommonMistakes({
  title = "Almindelige fejl ved brug af kosttilskud",
  mistakes,
}: CommonMistakesProps) {
  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <svg className="h-5 w-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Fejl</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Konsekvens</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Løsning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mistakes.map((m, i) => (
              <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3">
                  <span className="flex items-start gap-2">
                    <span className="mt-0.5 text-red-500">✗</span>
                    <span className="font-medium text-slate-900">{m.mistake}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{m.consequence}</td>
                <td className="px-4 py-3">
                  <span className="flex items-start gap-2">
                    <span className="mt-0.5 text-green-500">✓</span>
                    <span className="text-green-800">{m.solution}</span>
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
