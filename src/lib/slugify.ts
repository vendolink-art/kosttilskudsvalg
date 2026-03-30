const diacriticsMap: Record<string, string> = {
  å: "a", Å: "a",
  ä: "a", Ä: "a",
  ö: "o", Ö: "o",
  æ: "ae", Æ: "ae",
  ø: "o", Ø: "o",
  ü: "u", Ü: "u",
}

export function slugifyDa(text: string): string {
  return text
    .split("")
    .map((c) => diacriticsMap[c] ?? c)
    .join("")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}
