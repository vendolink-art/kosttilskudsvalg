import Link from "next/link"

interface BreadcrumbItem {
  name: string
  href: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items, variant = "light" }: BreadcrumbsProps & { variant?: "light" | "dark" }) {
  const allItems = [{ name: "Hjem", href: "/" }, ...items]
  const isDark = variant === "dark"

  return (
    <nav aria-label="Brødkrumme" className="mb-4">
      <ol className={`flex flex-wrap items-center gap-1.5 text-sm ${isDark ? "text-white/70" : "text-slate-500"}`}>
        {allItems.map((item, i) => (
          <li key={item.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg className={`h-3.5 w-3.5 ${isDark ? "text-white/40" : "text-slate-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {i === allItems.length - 1 ? (
              <span className={`font-medium ${isDark ? "text-white" : "text-slate-700"}`}>{item.name}</span>
            ) : (
              <Link href={item.href} className={`underline-offset-2 ${isDark ? "hover:text-white hover:underline" : "hover:text-green-700 hover:underline"}`}>
                {item.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
