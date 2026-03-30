interface TestSummaryProps {
  productCount: number
  testPeriod?: string
  methodology?: string[]
}

export function TestSummary({ productCount, testPeriod, methodology }: TestSummaryProps) {
  return (
    <div className="my-8 rounded-xl border border-green-200 bg-green-50/50 p-5">
      <h4 className="mb-3 flex items-center gap-2 text-base font-semibold text-green-900">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Sådan har vi testet
      </h4>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-green-700">Produkter</dt>
          <dd className="mt-1 text-lg font-bold text-green-900">{productCount}</dd>
        </div>
        {testPeriod && (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-green-700">Testperiode</dt>
            <dd className="mt-1 text-lg font-bold text-green-900">{testPeriod}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-green-700">Metode</dt>
          <dd className="mt-1 text-sm font-medium text-green-900">Analyse & sammenligning</dd>
        </div>
      </dl>
      {methodology && methodology.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-green-200 pt-4">
          {methodology.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-green-800">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
