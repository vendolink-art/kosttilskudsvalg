interface Article {
  title: string
  href: string
  description?: string
}

export function RelatedArticles({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null

  return (
    <div className="my-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-base font-semibold text-slate-900">
        Relaterede artikler
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {articles.map((a, i) => (
          <a
            key={i}
            href={a.href}
            className="group rounded-lg border border-slate-100 p-3 transition-colors hover:border-green-200 hover:bg-green-50/50"
          >
            <p className="text-sm font-medium text-slate-900 group-hover:text-green-700">
              {a.title}
            </p>
            {a.description && (
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{a.description}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
