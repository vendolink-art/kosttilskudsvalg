import type { ReactNode } from "react"

export const metadata = {
  metadataBase: new URL("https://www.kosttilskudsvalg.dk"),
  title: {
    default: "Kosttilskudsvalg – Uafhængige tests og guider om kosttilskud",
    template: "%s | Kosttilskudsvalg",
  },
  description:
    "Uafhængige tests og anmeldelser af kosttilskud. Find de bedste produkter med vores ekspertguider og sammenligninger.",
  openGraph: {
    siteName: "Kosttilskudsvalg",
    type: "website",
  },
}

export default function DaLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
