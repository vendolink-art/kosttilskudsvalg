"use client"

export type ProductFitData = {
  summary: string
  idealFor: string[]
  notIdealFor?: string[]
}

interface ProductFitProps {
  productName: string
  fit: ProductFitData
  compact?: boolean
  hideTitle?: boolean
}

export function ProductFit({ productName, fit, compact = false, hideTitle = false }: ProductFitProps) {
  if (compact) {
    return (
      <div className="mt-4 pt-4 border-t border-zinc-100">
        <div className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
          Passer til dig hvis
        </div>
        <ul className="space-y-1">
          {fit.idealFor.slice(0, 3).map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-zinc-600">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        {fit.notIdealFor && fit.notIdealFor.length > 0 && (
          <div className="mt-2 text-sm text-zinc-500 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{fit.notIdealFor[0]}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="my-6 rounded-xl bg-gradient-to-br from-zinc-50 to-slate-50 border border-zinc-200 p-5">
      {!hideTitle && (
        <h4 className="text-base font-semibold text-zinc-900 mb-2">
          Hvem passer {productName} til?
        </h4>
      )}
      <p className="text-sm text-zinc-700 mb-4 leading-relaxed">
        {fit.summary}
      </p>
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-sm font-medium text-zinc-800">Passer til dig hvis</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 ml-7">
          {fit.idealFor.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-zinc-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      {fit.notIdealFor && fit.notIdealFor.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-3 h-3 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm font-medium text-zinc-800">Passer ikke hvis</span>
          </div>
          <ul className="ml-7 space-y-1">
            {fit.notIdealFor.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ProductFit
