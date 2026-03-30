import { promises as fs } from "fs"
import path from "path"
import { getSlugsForSilo, type SiloId } from "./silo-config"

const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")

export async function getCategorySlugs(): Promise<string[]> {
  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })
  const slugs: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "produkter" || entry.name === "[slug]") continue
    try {
      await fs.access(path.join(KOSTTILSKUD_DIR, entry.name, "page.mdx"))
      slugs.push(entry.name)
    } catch {}
  }
  return slugs
}

export async function getSiloCategorySlugs(siloId: SiloId): Promise<string[]> {
  const siloSlugs = new Set(getSlugsForSilo(siloId))
  const allSlugs = await getCategorySlugs()
  return allSlugs.filter((s) => siloSlugs.has(s))
}

