import { notFound } from "next/navigation"
import { getGuideBySlug, getAllGuides } from "@/lib/mdx"
import { getAuthor, getReviewer } from "@/config/authors"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ReadingProgress } from "@/components/reading-progress"
import { GuideToc } from "@/components/guide-toc"
import Link from "next/link"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const all = await getAllGuides()
  return all
    .filter((g) => (g.category || "").toLowerCase() === "guider")
    .map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { meta } = await getGuideBySlug(slug)
    return {
      title: meta.meta_title || meta.title,
      description: meta.description,
      alternates: {
        canonical: `https://www.kosttilskudsvalg.dk/guider/${slug}`,
      },
      openGraph: {
        title: meta.meta_title || meta.title,
        description: meta.description,
        url: `https://www.kosttilskudsvalg.dk/guider/${slug}`,
        type: "article",
        locale: "da_DK",
        siteName: "Kosttilskudsvalg",
      },
    }
  } catch {
    return { title: "Guide ikke fundet" }
  }
}

function formatDate(d: string | undefined): string {
  if (!d) return ""
  try {
    return new Date(d).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return d
  }
}

function estimateReadingTime(text: string): number {
  const words = text.replace(/<[^>]*>/g, "").split(/\s+/).length
  return Math.max(1, Math.round(words / 220))
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params
  let guide: Awaited<ReturnType<typeof getGuideBySlug>>
  try {
    guide = await getGuideBySlug(slug)
  } catch {
    notFound()
  }

  const { Content, meta } = guide
  const author = getAuthor(meta.author)
  const reviewer = getReviewer()

  const allGuides = await getAllGuides()
  const relatedGuides = allGuides
    .filter(g => (g.category || "").toLowerCase() === "guider" && g.slug !== slug)
    .slice(0, 3)

  const readingTime = estimateReadingTime(meta.description || "")

  return (
    <>
      <ReadingProgress />

      <article className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden mb-10 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900"></div>

          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] w-[45%] h-[45%] rounded-full bg-emerald-500/20 blur-[80px]"></div>
            <div className="absolute top-[20%] right-[5%] w-[30%] h-[30%] rounded-full bg-teal-400/10 blur-[60px]"></div>
            <div className="absolute bottom-[5%] left-[30%] w-[35%] h-[35%] rounded-full bg-cyan-500/8 blur-[70px]"></div>
          </div>

          <div className="relative p-8 md:p-12 lg:p-14">
            <div className="mb-6">
              <Breadcrumbs
                items={[
                  { name: "Guider", href: "/guider" },
                  { name: meta.title, href: `/guider/${slug}` },
                ]}
                variant="dark"
              />
            </div>

            {meta.tags && meta.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {meta.tags
                  .filter((t) => t !== "guide")
                  .slice(0, 5)
                  .map((tag) => (
                    <span
                      key={tag}
                      className="inline-block rounded-full bg-white/10 px-3.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur-sm border border-white/5"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-5 leading-[1.15]">
              {meta.title}
            </h1>

            {meta.description && (
              <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-8">
                {meta.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
              {author ? (
                <Link
                  href={`/redaktion#${author.slug}`}
                  className="flex items-center gap-2.5 text-slate-400 hover:text-white transition-colors"
                >
                  {author.avatar && (
                    <img
                      src={author.avatar}
                      alt={author.name}
                      className="w-8 h-8 rounded-full ring-2 ring-white/20 object-cover"
                    />
                  )}
                  <span>
                    Af <span className="font-medium text-slate-200">{author.name}</span>
                  </span>
                </Link>
              ) : meta.author ? (
                <span className="flex items-center gap-2 text-slate-400">
                  <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <span>Af <span className="font-medium text-slate-200">{meta.author}</span></span>
                </span>
              ) : null}

              {reviewer && (
                <Link
                  href={`/redaktion#${reviewer.slug}`}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>
                    Faktatjekket af <span className="font-medium text-slate-200">{reviewer.name}</span>
                  </span>
                </Link>
              )}

              <span className="h-4 w-px bg-white/20 hidden sm:block" />

              {meta.updated && (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(meta.updated)}
                </span>
              )}

              <span className="flex items-center gap-1.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {readingTime || 8} min. læsetid
              </span>
            </div>
          </div>
        </div>

        {/* TOC */}
        <div className="mb-10">
          <GuideToc />
        </div>

        {/* Article body */}
        <div
          data-guide-body=""
          className={[
            "prose prose-slate prose-lg max-w-none",
            "prose-headings:scroll-mt-24 prose-headings:font-bold",
            "prose-h2:text-2xl prose-h2:mt-14 prose-h2:mb-5 prose-h2:pb-3 prose-h2:border-b prose-h2:border-slate-200",
            "prose-h3:text-xl prose-h3:mt-10 prose-h3:mb-3",
            "prose-a:text-emerald-700 prose-a:underline-offset-2 hover:prose-a:text-emerald-600 prose-a:decoration-emerald-300/50",
            "prose-img:rounded-xl prose-img:shadow-md",
            "prose-blockquote:border-l-4 prose-blockquote:border-emerald-400 prose-blockquote:bg-emerald-50/50 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:pl-6 prose-blockquote:pr-4 prose-blockquote:not-italic",
            "prose-strong:text-slate-800",
            "prose-li:marker:text-emerald-500",
            "prose-table:rounded-xl prose-table:overflow-hidden prose-table:shadow-sm prose-table:border prose-table:border-slate-200",
            "prose-thead:bg-slate-50 prose-th:font-bold prose-th:text-slate-800 prose-th:text-sm",
            "prose-td:text-sm prose-tr:border-slate-100",
            "prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-medium prose-code:before:content-none prose-code:after:content-none",
          ].join(" ")}
        >
          {Content}
        </div>

        {/* Author / reviewer card */}
        <div className="mt-16 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Om forfatteren</p>
          </div>

          {author ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {author.avatar && (
                <img
                  src={author.avatar}
                  alt={author.name}
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-slate-100 shadow-sm"
                  loading="lazy"
                />
              )}
              <div className="flex-1">
                <Link href={`/redaktion#${author.slug}`} className="group">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {author.name}
                  </h3>
                </Link>
                <p className="text-sm font-medium text-emerald-700">{author.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{author.bio}</p>
                {author.specialties.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {author.specialties.map((s) => (
                      <span
                        key={s}
                        className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="h-20 w-20 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center shadow-sm">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900">Redaktionen</h3>
                <p className="text-sm font-medium text-emerald-700">Kosttilskudsvalgs redaktion</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Denne guide er udarbejdet af Kosttilskudsvalgs redaktion, som består af skribenter med faglig baggrund inden for ernæring, sportsernæring og kosttilskudsanalyse.
                </p>
              </div>
            </div>
          )}

          {reviewer && (
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-4">
              {reviewer.avatar && (
                <img
                  src={reviewer.avatar}
                  alt={reviewer.name}
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-slate-100"
                  loading="lazy"
                />
              )}
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="text-xs font-medium text-emerald-700">Faktatjekket</p>
                </div>
                <Link href={`/redaktion#${reviewer.slug}`} className="text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors">
                  {reviewer.name}
                </Link>
                <span className="text-xs text-slate-500"> – {reviewer.title}</span>
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-8 rounded-2xl bg-amber-50/50 border border-amber-200/60 p-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-600 shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900 mb-1">Medicinsk disclaimer</p>
              <p className="text-sm text-amber-800/80 leading-relaxed">
                Indholdet i denne guide er <strong className="text-amber-900">ikke</strong> medicinsk rådgivning. Kosttilskud er ikke en erstatning for en varieret og balanceret kost. Tal altid med din læge, inden du begynder på et nyt kosttilskud.
              </p>
            </div>
          </div>
        </div>

        {/* Related guides */}
        {relatedGuides.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900">Relaterede guider</h2>
              </div>
              <Link
                href="/guider"
                className="text-sm font-medium text-emerald-700 hover:text-emerald-600 transition-colors flex items-center gap-1"
              >
                Se alle guider
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedGuides.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guider/${g.slug}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all"
                >
                  <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors mb-2">
                    {g.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
                    {g.description}
                  </p>
                  <span className="text-xs font-medium text-emerald-600 group-hover:text-emerald-700 flex items-center gap-1">
                    Læs guide
                    <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back to guides */}
        <div className="mt-10 text-center">
          <Link
            href="/guider"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Tilbage til alle guider
          </Link>
        </div>
      </article>
    </>
  )
}
