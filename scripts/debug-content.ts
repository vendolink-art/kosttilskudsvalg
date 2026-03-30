import { createReadStream } from "fs"
import * as readline from "readline"
import path from "path"

const SQL = path.join(process.cwd(), "kostmagasinet_dk-db-2026-02-06.sql")

function parseRows(line: string, maxRows: number): string[][] {
  const rows: string[][] = []
  const vi = line.indexOf(" VALUES ")
  if (vi === -1) return rows
  let p = vi + 8, L = line.length
  while (p < L && rows.length < maxRows) {
    while (p < L && line[p] !== "(") p++
    if (p >= L) break
    p++
    const row: string[] = []
    while (p < L && line[p] !== ")") {
      while (p < L && line[p] === " ") p++
      if (line[p] === "'") {
        p++; let v = ""
        while (p < L) {
          if (line[p] === "\\" && p + 1 < L) { p++; v += line[p] }
          else if (line[p] === "'" && line[p + 1] === "'") { v += "'"; p++ }
          else if (line[p] === "'") { p++; break }
          else v += line[p]
          p++
        }
        row.push(v)
      } else if (line.slice(p, p + 4) === "NULL") { row.push(""); p += 4 }
      else { let v = ""; while (p < L && line[p] !== "," && line[p] !== ")") { v += line[p]; p++ }; row.push(v.trim()) }
      if (p < L && line[p] === ",") p++
    }
    if (p < L) p++
    if (p < L && (line[p] === "," || line[p] === ";")) p++
    if (row.length > 0) rows.push(row)
  }
  return rows
}

async function main() {
  const rl = readline.createInterface({ input: createReadStream(SQL, { encoding: "utf-8" }), crlfDelay: Infinity })
  let found = 0
  for await (const line of rl) {
    if (!line.startsWith("INSERT INTO `SiteTree_Live`")) continue
    const rows = parseRows(line, 2000)
    for (const row of rows) {
      if (row[1] === "ProductPage" && found < 3) {
        found++
        const slug = row[4]
        const content = row[7] || "(empty)"
        console.log(`--- Product: ${slug} ---`)
        console.log(`Content length: ${content.length}`)
        console.log(`Content preview: ${content.slice(0, 400)}`)
        console.log(`Has href: ${content.includes("href")}`)
        // look for any URL patterns
        const urls = content.match(/https?:\/\/[^\s"'<>]+/g)
        console.log(`URLs found: ${urls ? urls.length : 0}`)
        if (urls) console.log(`First URLs:`, urls.slice(0, 3))
        console.log()
      }
    }
    if (found >= 3) break
  }
  if (found === 0) console.log("No ProductPage rows found in SiteTree_Live")
}
main()
