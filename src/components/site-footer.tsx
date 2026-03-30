import Link from "next/link";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50/60" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand & beskrivelse */}
          <div>
            <Link href="/" className="text-lg font-semibold text-slate-900 hover:text-green-700 transition-colors">
              Kosttilskudsvalg
            </Link>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Uafhængige analyser og sammenligninger af kosttilskud på det danske marked.
              Baseret på fast metodik, tydelige kriterier og offentlige kilder.
            </p>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Indholdet er ikke medicinsk rådgivning. Tal altid med din læge, inden du starter på et nyt kosttilskud.{" "}
              <Link href="/metodik#disclaimer" className="underline hover:text-slate-600">Læs mere</Link>
            </p>
          </div>

          {/* Kategorier */}
          <nav aria-label="Kategorier">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">
              Kategorier
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/protein-traening" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Protein & Træning
                </Link>
              </li>
              <li>
                <Link href="/vitaminer" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Vitaminer
                </Link>
              </li>
              <li>
                <Link href="/mineraler" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Mineraler
                </Link>
              </li>
              <li>
                <Link href="/omega-fedtsyrer" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Omega & Fedtsyrer
                </Link>
              </li>
              <li>
                <Link href="/sundhed-velvaere" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Sundhed & Velvære
                </Link>
              </li>
            </ul>
          </nav>

          {/* Tillid & transparens */}
          <nav aria-label="Tillid og transparens">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">
              Tillid &amp; transparens
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/redaktion" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Redaktion
                </Link>
              </li>
              <li>
                <Link href="/metodik" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Sådan vurderer vi
                </Link>
              </li>
              <li>
                <Link href="/kilder-og-faktacheck" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Kilder &amp; faktacheck
                </Link>
              </li>
              <li>
                <Link href="/annoncer-og-affiliate" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Annonce- &amp; affiliatepolitik
                </Link>
              </li>
            </ul>
          </nav>

          {/* Juridisk & kontakt */}
          <nav aria-label="Juridisk information">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">
              Juridisk &amp; kontakt
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/kontakt" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Kontakt
                </Link>
              </li>
              <li>
                <Link href="/om-os" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Om Kosttilskudsvalg
                </Link>
              </li>
              <li>
                <Link href="/integritet" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Privatlivspolitik
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm text-slate-700 hover:text-slate-900 hover:underline underline-offset-4">
                  Cookiepolitik
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-slate-200 pt-6">
          <div className="text-xs text-slate-500">
            &copy; {currentYear} Kosttilskudsvalg (Venerolink AB, org.nr 559128-9151). Alle rettigheder forbeholdes.
          </div>
        </div>
      </div>

      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Kosttilskudsvalg",
            url: "https://www.kosttilskudsvalg.dk",
            description: "Uafhængige analyser og sammenligninger af kosttilskud på det danske marked.",
            foundingDate: "2023",
            founder: {
              "@type": "Organization",
              name: "Venerolink AB",
              legalName: "Venerolink AB",
              taxID: "559128-9151",
            },
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer service",
              email: "redaktion@kosttilskudsvalg.dk",
              availableLanguage: "Danish",
            },
          }),
        }}
      />
    </footer>
  );
}
