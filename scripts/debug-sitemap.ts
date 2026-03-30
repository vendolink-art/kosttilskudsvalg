const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

async function main() {
  // Healthwell products sitemap
  console.log("═══ Healthwell Product Sitemap ═══")
  const hw = await fetch("https://www.healthwell.dk/sitemap_products.xml", { headers: { "User-Agent": UA } })
  const hwXml = await hw.text()
  console.log(`Length: ${hwXml.length}`)
  
  // Check if it has image tags
  const hasImage = hwXml.includes("<image:image>") || hwXml.includes("image:loc")
  console.log(`Has image tags: ${hasImage}`)

  // Count URLs
  const urls = hwXml.match(/<loc>(https:\/\/www\.healthwell\.dk\/[^<]+)<\/loc>/gi) || []
  console.log(`Total URLs: ${urls.length}`)
  
  // Show first 5
  urls.slice(0, 5).forEach(u => console.log(`  ${u}`))

  // Check for "ashwagandha" in URLs
  const ashwa = urls.filter(u => u.toLowerCase().includes("ashwagandha"))
  console.log(`\nAshwagandha URLs: ${ashwa.length}`)
  ashwa.forEach(u => console.log(`  ${u}`))

  // Check for "acai" 
  const acai = urls.filter(u => u.toLowerCase().includes("acai"))
  console.log(`\nAcai URLs: ${acai.length}`)
  acai.forEach(u => console.log(`  ${u}`))

  // Show a snippet with image data if present
  const imageSnippet = hwXml.match(/<url>[\s\S]*?<image:[\s\S]*?<\/url>/i)
  if (imageSnippet) {
    console.log(`\nSample URL with image:\n${imageSnippet[0].slice(0, 500)}`)
  }

  // Sample a few product URLs and check
  console.log(`\nLast 3 URLs:`)
  urls.slice(-3).forEach(u => console.log(`  ${u}`))

  // Bodylab sitemap check
  console.log("\n═══ Bodylab Sitemap ═══")
  try {
    const bl = await fetch("https://www.bodylab.dk/sitemap.xml", { headers: { "User-Agent": UA } })
    console.log(`Status: ${bl.status}`)
    const blText = await bl.text()
    console.log(`Length: ${blText.length}`)
    console.log(`First 500: ${blText.slice(0, 500)}`)
  } catch (e: any) { console.log(`Error: ${e.message}`) }

  // MM Sports sitemap check
  console.log("\n═══ MM Sports Sitemap ═══")
  try {
    const mm = await fetch("https://www.mmsportsstore.dk/sitemap.xml", { headers: { "User-Agent": UA } })
    console.log(`Status: ${mm.status}`)
    const mmText = await mm.text()
    console.log(`Length: ${mmText.length}`)
    console.log(`First 500: ${mmText.slice(0, 500)}`)
  } catch (e: any) { console.log(`Error: ${e.message}`) }
}

main()
