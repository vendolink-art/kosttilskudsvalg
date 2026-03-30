export type Author = {
  slug: string
  name: string
  title: string
  role: "skribent" | "faglig-reviewer" | "redaktoer"
  bio: string
  experienceYears: number
  education: string
  specialties: string[]
  avatar?: string
  email?: string
}

export const AUTHORS: Author[] = [
  {
    slug: "line-kragelund",
    name: "Line Kragelund",
    title: "Ernæringsrådgiver & skribent",
    role: "skribent",
    bio:
      "Line har en kandidatgrad i human ernæring og 6 års erfaring med kosttilskudsanalyse. Hun fokuserer på evidensbaseret rådgivning og skriver primært om vitaminer, mineraler og superfoods.",
    experienceYears: 6,
    education: "Cand.scient. i human ernæring",
    specialties: ["Vitaminer & mineraler", "Superfoods", "Ernæringskemi", "Evidensvurdering"],
    avatar: "/authors/line-kragelund.jpg",
    email: "line@kosttilskudsvalg.dk",
  },
  {
    slug: "mikkel-rasmussen",
    name: "Mikkel Rasmussen",
    title: "Klinisk diætist & faglig reviewer",
    role: "faglig-reviewer",
    bio:
      "Mikkel er autoriseret klinisk diætist med 9 års klinisk erfaring. Han faktatjekker alt sundhedsrelateret indhold og sikrer, at vurderinger bygger på anerkendte retningslinjer og klinisk evidens.",
    experienceYears: 9,
    education: "Prof.bach. i klinisk diætetik",
    specialties: ["Klinisk ernæring", "Kosttilskud & interaktioner", "Faktatjek", "YMYL-compliance"],
    avatar: "/authors/mikkel-rasmussen.jpg",
    email: "mikkel@kosttilskudsvalg.dk",
  },
  {
    slug: "anna-vestergaard",
    name: "Anna Vestergaard",
    title: "Sportsernæring & produktanalytiker",
    role: "skribent",
    bio:
      "Anna har en baggrund i idræt og ernæring og specialiserer sig i sportsernæring, proteinprodukter og pre-workout-tilskud. Hun analyserer ingrediensprofiler, doser og pris pr. dagsdosis.",
    experienceYears: 4,
    education: "B.Sc. i idræt og sundhed",
    specialties: ["Sportsernæring", "Protein", "Pre-workout", "Prisanalyse"],
    avatar: "/authors/anna-vestergaard.jpg",
  },
  {
    slug: "thomas-moeller",
    name: "Thomas Møller",
    title: "Ansvarshavende redaktør",
    role: "redaktoer",
    bio:
      "Thomas er ansvarshavende redaktør for Kosttilskudsvalg og har det overordnede ansvar for redaktionel kvalitet, metodik og compliance. Med en baggrund i sundhedsjournalistik sikrer han, at alt publiceret indhold lever op til vores redaktionelle standarder.",
    experienceYears: 11,
    education: "Cand.comm. i sundhedsjournalistik",
    specialties: ["Redaktionel ledelse", "Sundhedsjournalistik", "EEAT-compliance", "Kvalitetssikring"],
    avatar: "/authors/thomas-moeller.jpg",
    email: "thomas@kosttilskudsvalg.dk",
  },
]

export function getAuthor(by: string | undefined) {
  if (!by) return undefined
  const key = by.toLowerCase().trim().replace(/\s+/g, "-")
  const bySlug = AUTHORS.find(a => a.slug === by || a.slug === key)
  if (bySlug) return bySlug
  const byName = AUTHORS.find(a => a.name.toLowerCase().trim() === by.toLowerCase().trim())
  return byName
}

export function getReviewer() {
  return AUTHORS.find(a => a.role === "faglig-reviewer")
}

export function getEditor() {
  return AUTHORS.find(a => a.role === "redaktoer")
}
