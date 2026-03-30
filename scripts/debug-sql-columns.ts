/**
 * debug-sql-columns.ts
 * Quick script to inspect the SiteTree INSERT structure and find correct parentID index.
 */

import { createReadStream } from "fs"
import { createInterface } from "readline"
import path from "path"

const SQL_FILE = path.join(process.cwd(), "kostmagasinet_dk-db-2026-02-06.sql")

async function main() {
  const rl = createInterface({
    input: createReadStream(SQL_FILE, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  })

  let found = 0

  for await (const line of rl) {
    // Also look for CREATE TABLE to get exact column order
    if (line.includes("CREATE TABLE") && line.includes("SiteTree")) {
      console.log("=== CREATE TABLE ===")
      console.log(line.substring(0, 500))
      console.log("...")
    }

    // Look for column definitions near SiteTree
    if (line.includes("`ParentID`") && !line.startsWith("INSERT")) {
      console.log("Column def:", line.trim().substring(0, 200))
    }

    if (line.startsWith("INSERT INTO `SiteTree` VALUES") || line.startsWith("INSERT INTO `SiteTree_Live` VALUES")) {
      found++
      if (found > 1) continue

      // Get the column definition from the INSERT if available
      const colMatch = line.match(/INSERT INTO `\w+` \(([^)]+)\)/)
      if (colMatch) {
        const cols = colMatch[1].split(",").map(c => c.trim())
        console.log("=== Column order from INSERT ===")
        cols.forEach((c, i) => console.log(`  [${i}] ${c}`))
      }

      // Extract first tuple and print fields with indices
      const idx = line.indexOf("VALUES ")
      if (idx === -1) continue
      const rest = line.substring(idx + 7)

      // Find first tuple
      let depth = 0
      let start = -1
      let inStr = false
      let esc = false
      let firstTuple = ""

      for (let i = 0; i < rest.length && i < 50000; i++) {
        const ch = rest[i]
        if (esc) { esc = false; continue }
        if (ch === "\\") { esc = true; continue }
        if (ch === "'" && !inStr) { inStr = true; continue }
        if (ch === "'" && inStr) { inStr = false; continue }
        if (inStr) continue
        if (ch === "(") {
          if (depth === 0) start = i + 1
          depth++
        } else if (ch === ")") {
          depth--
          if (depth === 0 && start >= 0) {
            firstTuple = rest.substring(start, i)
            break
          }
        }
      }

      if (!firstTuple) continue

      // Parse fields
      const fields: string[] = []
      let cur = ""
      let inString2 = false
      let escape2 = false

      for (let i = 0; i < firstTuple.length; i++) {
        const ch = firstTuple[i]
        if (escape2) { cur += ch; escape2 = false; continue }
        if (ch === "\\") { escape2 = true; cur += ch; continue }
        if (ch === "'" && !inString2) { inString2 = true; cur += ch; continue }
        if (ch === "'" && inString2) { inString2 = false; cur += ch; continue }
        if (ch === "," && !inString2) {
          fields.push(cur.trim())
          cur = ""
          continue
        }
        cur += ch
      }
      if (cur.trim()) fields.push(cur.trim())

      console.log("\n=== First tuple fields ===")
      for (let i = 0; i < fields.length; i++) {
        let val = fields[i]
        if (val.length > 80) val = val.substring(0, 80) + "..."
        console.log(`  [${i}] ${val}`)
      }
    }

    // Find ProductPage rows to see their structure
    if (found >= 1 && line.startsWith("INSERT INTO `SiteTree`") && line.includes("ProductPage")) {
      // Already found
    }
  }

  // Also check for a specific ProductPage
  console.log("\n=== Searching for sample ProductPage rows ===")
  const rl2 = createInterface({
    input: createReadStream(SQL_FILE, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  })

  let ppCount = 0
  for await (const line of rl2) {
    if (!line.startsWith("INSERT INTO `SiteTree` VALUES")) continue

    // Find ProductPage tuples
    if (line.includes("ProductPage") && ppCount < 3) {
      // Find a ProductPage tuple
      const idx = line.indexOf("VALUES ")
      if (idx === -1) continue
      const rest = line.substring(idx + 7)

      let depth = 0
      let start = -1
      let inStr = false
      let esc = false

      for (let i = 0; i < rest.length; i++) {
        const ch = rest[i]
        if (esc) { esc = false; continue }
        if (ch === "\\") { esc = true; continue }
        if (ch === "'" && !inStr) { inStr = true; continue }
        if (ch === "'" && inStr) { inStr = false; continue }
        if (inStr) continue
        if (ch === "(") {
          if (depth === 0) start = i + 1
          depth++
        } else if (ch === ")") {
          depth--
          if (depth === 0 && start >= 0) {
            const tuple = rest.substring(start, i)
            start = -1

            if (!tuple.includes("ProductPage")) continue

            // Parse it
            const fields: string[] = []
            let cur = ""
            let inString2 = false
            let escape2 = false

            for (let j = 0; j < tuple.length; j++) {
              const c = tuple[j]
              if (escape2) { cur += c; escape2 = false; continue }
              if (c === "\\") { escape2 = true; cur += c; continue }
              if (c === "'" && !inString2) { inString2 = true; cur += c; continue }
              if (c === "'" && inString2) { inString2 = false; cur += c; continue }
              if (c === "," && !inString2) {
                fields.push(cur.trim())
                cur = ""
                continue
              }
              cur += c
            }
            if (cur.trim()) fields.push(cur.trim())

            console.log(`\n--- ProductPage #${ppCount + 1} ---`)
            for (let k = 0; k < fields.length; k++) {
              let val = fields[k]
              if (val.length > 100) val = val.substring(0, 100) + "..."
              console.log(`  [${k}] ${val}`)
            }

            ppCount++
            if (ppCount >= 2) break
          }
        }
      }
      if (ppCount >= 2) break
    }
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
