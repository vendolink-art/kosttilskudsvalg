import Link from "next/link"

export function AffiliateDisclosure() {
  return (
    <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs leading-relaxed text-slate-500">
        <strong>Affiliateoplysning:</strong> Denne side indeholder affiliatelinks. Hvis du køber
        et produkt via et link, modtager vi en kommission &ndash; uden ekstra omkostning for dig.
        Vores vurderinger er uafhængige af affiliateindtægter.{" "}
        <Link href="/annoncer-og-affiliate" className="text-green-700 underline hover:text-green-800">
          Læs vores affiliatepolitik
        </Link>
      </p>
    </div>
  )
}
