import Link from "next/link"

interface Category {
  name: string
  slug: string
  productCount: number
  icon: string
  description?: string
}

interface CategoryGridProps {
  categories: Category[]
  title?: string
}

export function CategoryGrid({ categories, title = "Populære kategorier" }: CategoryGridProps) {
  return (
    <section className="my-12">
      <h2 className="mb-6 text-2xl font-bold text-slate-900">{title}</h2>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/kosttilskud/${cat.slug}`}
            className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-green-300 hover:shadow-md"
          >
            <div className="text-2xl">{cat.icon}</div>
            <h3 className="mt-2 text-sm font-bold text-slate-900 group-hover:text-green-700">{cat.name}</h3>
            {cat.description && (
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{cat.description}</p>
            )}
            <p className="mt-2 text-[10px] font-medium text-slate-400">
              {cat.productCount} produkter testet
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
