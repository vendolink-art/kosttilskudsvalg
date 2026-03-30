import { generateBrokenProductLinksReport } from "../src/lib/broken-product-links"
import { promises as fs } from "fs"
import path from "path"

async function main() {
  console.log("Starting broken links scan...")
  const report = await generateBrokenProductLinksReport((progress) => {
    console.log(
      `[progress] ${progress.completed}/${progress.total} scanned | ${progress.productSlug} | status=${progress.statusCode}`
    )
  })
  const reportPath = path.join(process.cwd(), "content", "broken-links-report.json")
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8")
  console.log(`Scan complete. Found ${report.length} broken links. Saved to ${reportPath}`)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error("Failed to scan broken links:", err)
    process.exit(1)
  })
