import Link from "next/link"

interface ProductCardProps {
  name: string
  brand?: string
  rating?: number
  price?: string
  image?: string
  href?: string
  affiliateUrl?: string
  badge?: string
  children?: React.ReactNode
}

export function ProductCard({
  name,
  brand,
  rating,
  price,
  image,
  href,
  affiliateUrl,
  badge,
  children,
}: ProductCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      {badge && (
        <span className="mb-2 inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          {badge}
        </span>
      )}

      {image && (
        <div className="mb-3 flex items-center justify-center">
          <img
            src={image}
            alt={name}
            className="product-card-img h-32 w-auto object-contain"
            loading="lazy"
          />
        </div>
      )}

      <div>
        {brand && (
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{brand}</p>
        )}
        <h3 className="mt-0.5 text-base font-semibold text-slate-900 leading-snug">
          {href ? (
            <Link href={href} className="hover:text-green-700 hover:underline">
              {name}
            </Link>
          ) : (
            name
          )}
        </h3>

        {rating !== undefined && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-4 w-4 ${star <= Math.round(rating) ? "text-amber-400" : "text-slate-200"}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-medium text-slate-700">{rating.toFixed(1)}</span>
          </div>
        )}

        {price && (
          <p className="mt-1.5 text-sm font-semibold text-green-700">{price}</p>
        )}

        {children}

        {affiliateUrl && (
          <a
            href={affiliateUrl}
            rel="sponsored nofollow"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
          >
            Se pris &rarr;
          </a>
        )}
      </div>
    </div>
  )
}
