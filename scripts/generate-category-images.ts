import { promises as fs } from "fs"
import path from "path"

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

async function generateImagePrompt(h2: string, intro: string, products: any[]): Promise<string> {
  const productContext = products.slice(0, 3).map(p => p.title).join(", ")
  
  const systemPrompt = `Du er en ekspert i redaktionel fotografering og AI-billedgenerering. 
Jeg giver dig en overskrift og en introduktionstekst til en sektion på en premium-side om kosttilskud.
Din opgave er at skrive en engelsk prompt (maks 2-3 sætninger), der beskriver et fotorealistiskt, stilrent fotografi, der passer perfekt til teksten.

VIGTIGE REGLER FOR BILDET:
1. Det skal være et fotografi (editorial style, premium, high quality).
2. Det må ABSOLUT IKKE indeholde nogen tekst, bogstaver, tal eller logoer.
3. Motivet skal være subtilt og relevant (f.eks. pulver på en ske, en shaker i et gym, et glas vand).
4. I baggrunden (ude af fokus / stærk bokeh) kan der stå produkter, der minder om disse: ${productContext}.
5. Afslut altid prompten med disse style-tags: "Premium editorial photography, shallow depth of field, natural lighting, 8k resolution, photorealistic, absolutely no text, no words, no letters, no logos."`

  const userPrompt = `Overskrift: ${h2}\nTekst: ${intro}`

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
      generationConfig: { temperature: 0.7 }
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to generate prompt: ${response.statusText}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text.trim()
}

async function generateImage(prompt: string, outputPath: string) {
  console.log(`Generating image for prompt: ${prompt}`)
  
  // Using gemini-3-pro-image-preview via generateContent (like in fordonssajten)
  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
    },
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to generate image: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const parts = data?.candidates?.[0]?.content?.parts
  if (!parts) {
    throw new Error("No parts in Gemini response")
  }

  let base64Data = null
  for (const part of parts) {
    if (part.inlineData?.data) {
      base64Data = part.inlineData.data
      break
    }
  }

  if (!base64Data) {
    throw new Error("No image data found in response")
  }

  const buffer = Buffer.from(base64Data, 'base64')
  
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, buffer)
  console.log(`Saved image to ${outputPath}`)
}

async function main() {
  const catSlug = process.argv[2]
  if (!catSlug) {
    console.error("Please provide a category slug (e.g. kreatin)")
    process.exit(1)
  }

  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY environment variable is required")
    process.exit(1)
  }

  console.log(`Generating images for ${catSlug}...`)
  
  const testH2 = "Købeguide: sådan vælger du den rigtige kreatin"
  const testIntro = "Kreatin er et af de mest brugte kosttilskud til styrketræning. Effekten afhænger dog af type, dosering, renhed og hvordan du faktisk får det brugt i hverdagen. Her er de vigtigste valg, du typisk står med på det danske marked."
  const testProducts = [{ title: "Bodylab Creatine" }, { title: "Star Nutrition Kreatin" }]

  try {
    const imagePrompt = await generateImagePrompt(testH2, testIntro, testProducts)
    console.log("\nGenerated Image Prompt:")
    console.log(imagePrompt)
    
    const outputPath = path.join(process.cwd(), "public", "images", "content", `${catSlug}-guide.png`)
    await generateImage(imagePrompt, outputPath)
    
    console.log("\nSuccess!")
  } catch (error) {
    console.error("Error:", error)
  }
}

main()