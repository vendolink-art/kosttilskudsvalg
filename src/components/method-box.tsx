import Link from "next/link"

interface MethodBoxProps {
  criteria?: string[]
  productCount?: number
  lastChecked?: string
}

export function MethodBox({ criteria, productCount, lastChecked }: MethodBoxProps) {
  return (
    <div className="my-6 rounded-xl border border-green-200 bg-green-50/50 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-green-900">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Hvordan vi vurderer
      </h3>

      {criteria && criteria.length > 0 && (
        <ul className="mt-3 space-y-1">
          {criteria.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-green-800">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
              {c}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-green-700">
        {productCount && <span>{productCount} produkter sammenlignet</span>}
        {lastChecked && <span>Priser tjekket: {lastChecked}</span>}
      </div>

      <Link
        href="/metodik"
        className="mt-3 inline-block text-xs font-medium text-green-700 underline hover:text-green-900"
      >
        Læs vores fulde metodik &rarr;
      </Link>
    </div>
  )
}
