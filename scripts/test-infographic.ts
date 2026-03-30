import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs/promises";
import path from "path";

async function ensureCategoryInfographic(catSlug: string, categoryName: string): Promise<string | undefined> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_API_KEY) return undefined

  const imageFilename = `${catSlug}-infographic.png`
  const publicImagePath = `/images/content/${imageFilename}`
  const absoluteOutPath = path.join(process.cwd(), "public", "images", "content", imageFilename)

  console.log(`  [images] Generating infographic for ${categoryName}...`)

  const systemPrompt = `Du er en expert i at skabe pædagogiske infografikker til sundheds- og kosttilskudsartikler.
Din opgave er at skrive en engelsk billed-prompt (maks 2-3 sætninger) til en AI-billedgenerator for at skabe en infografik om "${categoryName}".

Retningslinjer:
- RETURNER KUN SELVE PROMPTEN. Ingen introduktion, ingen forklaring, ingen "Her er prompten".
- Infografikken skal forklare et vigtigt koncept (f.eks. for kreatin: "Loading phase vs Maintenance phase", for proteinpulver: "Whey vs Casein absorption rates", for vitaminer: "Daily recommended dosage").
- Billedet skal have et VERTIKALT (portrait) layout, hvor informationen er stablet oven på hinanden (top-to-bottom) for at være læsevenlig på mobilskærme.
- Stilen skal være ren, moderne, minimalistisk, vektor-baserad (flat design), med tydelige ikoner eller grafer.
- Baggrunden skal være hvid eller meget lys.
- Teksten i billedet skal minimeres, men HVIS der er tekst, SKAL det være på DANSK (f.eks. "Kreatin", "Dosis", "Vand", "Muskler").
- Afslut altid prompten med: "Clean modern vertical vector infographic, flat design, white background, minimal text, medical/health editorial style, high quality. ALL TEXT MUST BE IN DANISH LANGUAGE."`

  const userPrompt = `Kategori: ${categoryName}`

  let imagePrompt = ""
  try {
    const promptRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    })
    const promptData = await promptRes.json()
    imagePrompt = promptData.candidates[0].content.parts[0].text.trim()
    console.log("Image Prompt generated:", imagePrompt)
  } catch (e) {
    console.error(`  [images] Failed to generate infographic prompt for ${categoryName}:`, e)
    return undefined
  }

  try {
    const finalPrompt = `CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. IMAGE FORMAT: Generate a portrait/vertical image (e.g. 9:16 aspect ratio). The layout MUST be vertical, stacking elements from top to bottom.
2. STYLE: Clean, modern vertical vector infographic, flat design, white background.
3. CONTENT: ${imagePrompt}
4. RESTRICTIONS: Keep text to an absolute minimum. Use icons, charts, and visual elements instead of words. ANY TEXT INCLUDED MUST BE IN DANISH (e.g., "Kreatin", "Dosis", "Vand"). No English text allowed. Ensure perfect spelling.`

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: finalPrompt },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    })

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await res.text()}`)
    }

    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts
    let base64Data = null
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data
          break
        }
      }
    }

    if (!base64Data) throw new Error("No image data in response")

    const buffer = Buffer.from(base64Data, 'base64')
    await fs.mkdir(path.dirname(absoluteOutPath), { recursive: true })
    await fs.writeFile(absoluteOutPath, buffer)
    console.log(`  [images] Saved infographic to ${absoluteOutPath}`)
    return publicImagePath
  } catch (e) {
    console.error(`  [images] Failed to generate infographic for ${categoryName}:`, e)
    return undefined
  }
}

ensureCategoryInfographic("kreatin", "Kreatin");