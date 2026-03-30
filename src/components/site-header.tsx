"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useRef, useEffect, useCallback } from "react"
import { MAIN_SECTIONS } from "@/config/nav"
import type { NavSection } from "@/config/nav"
import { Container } from "@/components/container"
import { Logo } from "@/components/logo"

/* ──────────────── Desktop dropdown: simple list (Om os) ──────────────── */
function SimpleDropdown({ section }: { section: NavSection }) {
  return (
    <div className="absolute left-0 top-full z-50 mt-0 w-56 rounded-lg border border-slate-200 bg-white py-1.5 shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-1 duration-150">
      {section.children!.map((child) => (
        <Link
          key={child.href}
          href={child.href}
          className="block px-4 py-2 text-sm text-slate-700 hover:bg-green-50 hover:text-green-800 transition-colors"
        >
          {child.label}
        </Link>
      ))}
    </div>
  )
}

/* ──────────────── Desktop dropdown: grouped mega-menu ──────────────── */
function MegaMenu({ section }: { section: NavSection }) {
  const groups = section.groups!
  const groupCount = groups.length
  // Adapt columns and width based on number of groups
  const cols = groupCount <= 2 ? 2 : groupCount <= 4 ? 3 : 4
  const widthMap: Record<number, string> = { 2: "w-[480px]", 3: "w-[680px]", 4: "w-[900px]" }
  const width = widthMap[cols] || "w-[900px]"
  // For large menus, limit height and enable scroll
  const needsScroll = groupCount > 6

  return (
    <div className={`absolute left-1/2 top-full z-50 mt-0 -translate-x-1/2 ${width} rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-top-1 duration-150`}>
      <div className={`grid gap-0 p-4 grid-cols-${cols} ${needsScroll ? "max-h-[70vh] overflow-y-auto" : ""}`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {groups.map((group) => (
          <div key={group.heading} className="px-2 pb-3">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-green-700">
              {group.heading}
            </div>
            <ul className="space-y-0">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-md px-2 py-1 text-[12.5px] text-slate-700 hover:bg-green-50 hover:text-green-800 transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {section.cta && (
        <div className="border-t border-slate-100 px-5 py-2.5 bg-slate-50/60 rounded-b-xl">
          <Link
            href={section.cta.href}
            className="text-sm font-medium text-green-700 hover:text-green-900 transition-colors"
          >
            {section.cta.label}
          </Link>
        </div>
      )}
    </div>
  )
}

/* ──────────────── Mobile accordion ──────────────── */
function MobileSection({ section, onClose }: { section: NavSection; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  const hasSubmenu = (section.children && section.children.length > 0) || (section.groups && section.groups.length > 0)

  if (!hasSubmenu) {
    return (
      <li>
        <Link
          href={section.href}
          className="block rounded-md px-3 py-2.5 text-base font-medium text-slate-800 hover:bg-green-50 hover:text-green-800"
          onClick={onClose}
        >
          {section.label}
        </Link>
      </li>
    )
  }

  return (
    <li>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-base font-medium text-slate-800 hover:bg-green-50 hover:text-green-800"
      >
        {section.label}
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="ml-3 mt-1 border-l-2 border-green-100 pl-3 pb-2 space-y-2">
          {/* Simple children (Om os) */}
          {section.children?.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className="block rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-green-50 hover:text-green-800"
              onClick={onClose}
            >
              {child.label}
            </Link>
          ))}
          {/* Grouped children (mega-menu sections) */}
          {section.groups?.map((group) => (
            <div key={group.heading}>
              <div className="mb-1 mt-2 text-[11px] font-bold uppercase tracking-wider text-green-700">
                {group.heading}
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-green-50 hover:text-green-800"
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          {section.cta && (
            <Link
              href={section.cta.href}
              className="mt-2 block px-2 text-sm font-medium text-green-700 hover:text-green-900"
              onClick={onClose}
            >
              {section.cta.label}
            </Link>
          )}
        </div>
      )}
    </li>
  )
}

/* ──────────────── Main Header ──────────────── */
export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const pathname = usePathname()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Close on route change
  useEffect(() => {
    setOpenDropdown(null)
    setMobileOpen(false)
  }, [pathname])

  const handleMouseEnter = useCallback((key: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpenDropdown(key)
  }, [])

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpenDropdown(null), 120)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <Container className="flex items-center justify-between py-2 max-w-6xl">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Kosttilskudsvalg">
          <Logo withWordmark />
        </Link>

        {/* ── Desktop nav ── */}
        <nav aria-label="Hovedmenu" className="hidden items-center gap-0 xl:flex">
          {MAIN_SECTIONS.map((section) => {
            const active = pathname.startsWith(section.href)
            const hasDropdown = !!(section.children?.length || section.groups?.length)
            const isOpen = openDropdown === section.label

            return (
              <div
                key={section.label}
                className="relative"
                onMouseEnter={() => hasDropdown && handleMouseEnter(section.label)}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  href={section.href}
                  className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded-md px-2 py-2 text-[13px] font-medium transition-colors hover:bg-green-50 hover:text-green-800 ${
                    active ? "text-green-800 bg-green-50" : "text-slate-700"
                  }`}
                >
                  {section.label}
                  {hasDropdown && (
                    <svg
                      className={`ml-0.5 h-3 w-3 transition-transform ${isOpen ? "rotate-180 text-green-600" : "text-slate-400"}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </Link>

                {hasDropdown && isOpen && (
                  section.groups ? <MegaMenu section={section} /> : <SimpleDropdown section={section} />
                )}
              </div>
            )
          })}
        </nav>

        {/* ── Mobile hamburger ── */}
        <button
          aria-label={mobileOpen ? "Luk menu" : "Åbn menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
          className="xl:hidden rounded-lg p-2 text-slate-700 hover:bg-slate-100 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </Container>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div id="mobile-menu" className="border-t border-slate-200 bg-white xl:hidden max-h-[85vh] overflow-y-auto">
          <Container className="py-4 max-w-6xl">
            <nav>
              <ul className="flex flex-col gap-0.5">
                {MAIN_SECTIONS.map((section) => (
                  <MobileSection key={section.label} section={section} onClose={() => setMobileOpen(false)} />
                ))}
              </ul>
            </nav>
          </Container>
        </div>
      )}
    </header>
  )
}
