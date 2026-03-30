/**
 * generate-product-test-images.ts
 *
 * Generates 1 AI product test image per product using Gemini 3 Pro Image Preview.
 * Adapted from fordonssajten for the Danish supplement/fitness market.
 *
 * Usage:
 *   npx tsx scripts/generate-product-test-images.ts kollagenpulver
 *   npx tsx scripts/generate-product-test-images.ts proteinpulver --force
 */

import path from "path"
import { promises as fs } from "fs"
import sharp from "sharp"
import crypto from "crypto"
import dotenv from "dotenv"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const IMAGES_DIR = path.join(process.cwd(), "public", "generated", "product-tests")
const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const IMAGE_MAPPING_FILE = path.join(process.cwd(), "content", "product-images.json")

// No longer skipping reference images — images should be correct in product-images.json.
// If a product has a wrong image, fix it in the mapping file instead.
function shouldSkipReferenceImage(_slug: string, _imageUrl: string): boolean {
  return false
}

// ═══════════════════════════════════════════════════════════════
// RANDOMIZER BANKS — supplement/fitness context
// ═══════════════════════════════════════════════════════════════

const CAMERA_ANGLES = [
  "eye-level 3/4 view",
  "slight high-angle tabletop perspective",
  "straight-on documentary angle",
  "slight low-angle showing product prominence",
  "close lateral angle with shallow depth of field",
]

const DISTANCES = {
  overview: [
    "approximately 60 cm distance showing the product and its environment",
    "around 80 cm capturing the product and surrounding context",
    "about 50 cm with the product clearly filling the frame",
    "roughly 70 cm with natural framing on a surface",
  ],
  detail: [
    "approximately 20 cm close-up of the label/scoop",
    "around 25 cm showing powder texture or capsule detail",
    "about 30 cm medium close-up with usage context",
    "roughly 15 cm macro-style capturing fine details",
  ],
}

const LIGHTING = [
  "soft natural daylight from a nearby window, Scandinavian interior",
  "bright, clean kitchen lighting with neutral tones",
  "warm morning light on a wooden countertop",
  "neutral daylight, typical Nordic overcast sky through window",
  "soft diffused light in a minimalist Scandinavian room",
  "bright gym/fitness studio lighting with clean white walls",
]

const BACKGROUNDS = {
  kosttilskud: [
    "clean Scandinavian kitchen countertop with marble or wood surface",
    "minimalist white/light gray table in a Nordic home",
    "wooden cutting board on a clean kitchen surface",
    "modern Danish kitchen with light wood cabinets and clean lines",
  ],
  traening: [
    "gym locker room bench with water bottle nearby",
    "clean workout area with dumbbells in background",
    "home gym setup with yoga mat and equipment",
    "fitness studio with clean flooring and mirrors",
  ],
  sundhed: [
    "bathroom shelf with a plant and clean minimalist decor",
    "bedside table in a Scandinavian bedroom",
    "clean white desk with a glass of water nearby",
    "wellness spa-like setting with natural elements",
  ],
  default: [
    "clean Scandinavian tabletop with neutral background",
    "minimalist Nordic interior surface",
    "simple kitchen or bathroom counter",
    "neutral lifestyle setting",
  ],
}

const REALISM_ENHANCERS = [
  "a glass of water or smoothie partially visible in the background",
  "natural shadow from nearby objects or window light",
  "subtle texture of the wooden/marble surface visible",
  "slight reflection on the surface adding depth",
  "a measuring scoop or spoon nearby for scale",
  "soft bokeh from background objects",
  "natural dust particles catching light",
  "a fruit or healthy snack partially visible in background",
]

// ═══════════════════════════════════════════════════════════════
// CATEGORY-SPECIFIC CONFIGS for supplements/fitness
// ═══════════════════════════════════════════════════════════════

type CategoryConfig = {
  environments: string[]
  usageContexts: string[]
  setupElements: string[]
  functionDetails: string[]
  criticalDetails: string[]
  textureBehaviors: string[]
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  proteinpulver: {
    environments: [
      "modern Nordic kitchen with a blender and shaker visible",
      "gym changing room with gym bag and shaker bottle",
      "clean kitchen countertop with a smoothie glass",
    ],
    usageContexts: [
      "protein powder being scooped into a shaker bottle",
      "preparation of a protein shake after workout",
      "measuring a serving of protein powder",
    ],
    setupElements: [
      "shaker bottle, measuring scoop, and the product container",
      "blender, fruits, and the protein powder tub",
      "gym bag, water bottle, and protein container",
    ],
    functionDetails: [
      "powder being poured from the scoop into a shaker bottle",
      "the fine texture of the powder visible on the scoop",
      "shaker being prepared with water and protein powder",
    ],
    criticalDetails: [
      "powder consistency and texture on the scoop",
      "mixability shown with powder dissolving in liquid",
      "serving size measurement with the included scoop",
    ],
    textureBehaviors: [
      "fine powder texture visible on the scoop surface",
      "smooth dissolution when mixed with liquid",
      "powder granularity showing quality",
    ],
  },
  kollagenpulver: {
    environments: [
      "Scandinavian kitchen with morning light and a coffee cup",
      "clean bathroom counter with skincare products nearby",
      "bright wellness-inspired kitchen with fruits and smoothie",
    ],
    usageContexts: [
      "collagen powder being mixed into morning coffee or smoothie",
      "measuring collagen with a spoon over a warm beverage",
      "preparing a collagen drink in a beautiful glass",
    ],
    setupElements: [
      "coffee cup, collagen container, and wooden spoon",
      "smoothie glass, fruits, and the collagen product",
      "warm beverage, the product, and a Scandinavian setting",
    ],
    functionDetails: [
      "fine collagen powder dissolving in a warm beverage",
      "spoonful of collagen being stirred into coffee or juice",
      "the delicate, fine powder texture of collagen on a spoon",
    ],
    criticalDetails: [
      "fine, dissolvable powder texture on the spoon",
      "powder dissolving cleanly without clumps in liquid",
      "the lightness and purity of the collagen powder",
    ],
    textureBehaviors: [
      "ultra-fine powder that dissolves without residue",
      "light, airy powder consistency on the measuring spoon",
      "clean dissolution in warm liquid showing quality",
    ],
  },
  kreatin: {
    environments: [
      "gym locker room bench with workout accessories",
      "kitchen counter with a shaker bottle and gym bag nearby",
      "home workout area with weights and supplements",
    ],
    usageContexts: [
      "creatine powder being measured into a shaker",
      "pre-workout preparation with creatine scoop",
      "mixing creatine into a drink before training",
    ],
    setupElements: [
      "shaker bottle, creatine container, and gym towel",
      "water bottle, scoop, and training log nearby",
      "pre-workout setup with creatine and water",
    ],
    functionDetails: [
      "crystalline creatine powder being scooped precisely",
      "creatine dissolving in water in a shaker bottle",
      "exact measured serving on the included scoop",
    ],
    criticalDetails: [
      "white, crystalline powder texture showing purity",
      "precise 5g serving measurement on scoop",
      "clean dissolution without residue",
    ],
    textureBehaviors: [
      "fine crystalline powder structure",
      "clean white powder on measuring scoop",
      "monohydrate crystals catching light",
    ],
  },
  omega3: {
    environments: [
      "Scandinavian breakfast table with wholesome food",
      "clean kitchen counter with glass of water",
      "bathroom shelf with daily supplement routine",
    ],
    usageContexts: [
      "omega-3 capsule being taken from the bottle",
      "daily supplement routine with capsules laid out",
      "capsule being held between fingers ready to take",
    ],
    setupElements: [
      "glass of water, the omega-3 bottle, and breakfast items",
      "capsules on a small dish next to the bottle",
      "daily supplement organizer with omega-3 capsules",
    ],
    functionDetails: [
      "translucent golden capsule held between fingers",
      "soft gel capsules spilling from the bottle opening",
      "capsule size comparison with a coin or finger",
    ],
    criticalDetails: [
      "golden/amber soft gel capsule clarity and color",
      "capsule integrity without leaking or cloudiness",
      "gel shell thickness and quality visible",
    ],
    textureBehaviors: [
      "clear, golden-amber color through the soft gel shell",
      "smooth capsule surface catching light",
      "consistent capsule size and shape",
    ],
  },
  vitaminer: {
    environments: [
      "bright Scandinavian kitchen window sill in morning light",
      "bathroom medicine cabinet shelf, organized and clean",
      "breakfast table with juice and whole foods visible",
    ],
    usageContexts: [
      "vitamin tablets being poured from bottle into hand",
      "daily vitamin routine with glass of water",
      "organizing daily supplement intake",
    ],
    setupElements: [
      "glass of water, vitamin bottle, and fresh fruit",
      "supplement organizer box and vitamin container",
      "breakfast setting with the vitamin product visible",
    ],
    functionDetails: [
      "tablet or capsule in palm of hand ready to take",
      "tablets pouring from the bottle opening",
      "supplement next to a glass of water on clean surface",
    ],
    criticalDetails: [
      "tablet coating quality and consistent shape",
      "readable dosage marking on tablets",
      "capsule fill and color consistency",
    ],
    textureBehaviors: [
      "smooth, professional tablet coating",
      "consistent color throughout the supplement",
      "even tablet surface without defects",
    ],
  },
  pwo: {
    environments: [
      "gym setting just before a workout session",
      "home gym area with weights and equipment",
      "locker room bench with workout gear ready",
    ],
    usageContexts: [
      "pre-workout being mixed in a shaker with intensity",
      "scooping vibrant pre-workout powder from the container",
      "shaking a pre-workout drink before training",
    ],
    setupElements: [
      "shaker bottle, gym gloves, and the PWO container",
      "water bottle, earbuds, and pre-workout on a bench",
      "gym bag, towel, and pre-workout supplement",
    ],
    functionDetails: [
      "brightly colored PWO powder being scooped",
      "the vibrant drink color after mixing in shaker",
      "powder dissolving into a colorful pre-workout drink",
    ],
    criticalDetails: [
      "vibrant powder color showing active ingredients",
      "fizzy/dissolving texture when mixed with water",
      "serving size accuracy on the scoop",
    ],
    textureBehaviors: [
      "finely textured, colorful powder",
      "bright, appetizing drink color after mixing",
      "quick dissolution without clumps",
    ],
  },
  udstyr: {
    environments: [
      "home gym floor or yoga mat area",
      "fitness studio with clean equipment",
      "living room setup for home exercise",
    ],
    usageContexts: [
      "fitness equipment being set up for a workout",
      "equipment placed on exercise mat ready for use",
      "someone about to use the fitness equipment",
    ],
    setupElements: [
      "exercise mat, water bottle, and the equipment",
      "gym towel, mirror, and the fitness product",
      "clean workout space with the product centered",
    ],
    functionDetails: [
      "grip texture or build quality of the equipment",
      "adjustment mechanism or key feature close-up",
      "material quality showing durability",
    ],
    criticalDetails: [
      "build quality and material finish",
      "ergonomic grip or contact surface",
      "mechanism or adjustment detail",
    ],
    textureBehaviors: [
      "rubber grip texture or metal finish",
      "foam padding quality and resilience",
      "stitching or construction quality detail",
    ],
  },
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function detectCategoryGroup(categorySlug: string): string {
  const s = categorySlug.toLowerCase()
  if (["proteinpulver", "kasein", "whey", "vegansk-proteinpulver", "sojaprotein", "risprotein", "hamp-protein", "aggeprotein", "arteprotein", "weight-gainer", "laktosefrit-proteinpulver", "proteinpulver-til-vaegttab", "proteinpulver-til-restitution", "proteinpulver-uden-sodestoffer", "proteinpulver-uden-tilsat-sukker"].some(k => s.includes(k))) return "proteinpulver"
  if (["kollagen", "collagen"].some(k => s.includes(k))) return "kollagenpulver"
  if (["kreatin", "creatine"].some(k => s.includes(k))) return "kreatin"
  if (["omega", "fiskeolie", "krillolie", "vegansk-omega"].some(k => s.includes(k))) return "omega3"
  if (["pre-workout", "pwo", "pwo-med"].some(k => s.includes(k))) return "pwo"
  if (["vitamin", "b-vitamin", "c-vitamin", "d-vitamin", "e-vitamin", "multivitamin", "biotin", "folinsyre", "niacin", "pantotensyre"].some(k => s.includes(k))) return "vitaminer"
  if (["foam-roller", "massagepistol", "massagebold", "mavehjul", "hoppereb", "yogamatte", "pigmatte", "loftestropper", "gym-kalk", "ankelvaegt", "rygstotte", "personvaegt", "gymnastiktaske", "fodmassageapparat"].some(k => s.includes(k))) return "udstyr"
  return "default"
}

function getCategoryConfig(categorySlug: string): CategoryConfig {
  const group = detectCategoryGroup(categorySlug)
  return CATEGORY_CONFIGS[group] || {
    environments: BACKGROUNDS.default,
    usageContexts: ["product positioned in a healthy lifestyle setting"],
    setupElements: ["the product, a glass of water, and a clean surface"],
    functionDetails: ["product feature or content being examined"],
    criticalDetails: ["key quality indicator visible"],
    textureBehaviors: ["product texture or form visible"],
  }
}

// ═══════════════════════════════════════════════════════════════
// PROMPT BUILDERS — adapted for supplements
// ═══════════════════════════════════════════════════════════════

function buildOverviewPrompt(productName: string, categorySlug: string): string {
  const config = getCategoryConfig(categorySlug)
  const group = detectCategoryGroup(categorySlug)

  const cameraAngle = randomPick(CAMERA_ANGLES)
  const distance = randomPick(DISTANCES.overview)
  const lighting = randomPick(LIGHTING)
  const bgGroup = group === "udstyr" ? "traening" : (["proteinpulver", "kreatin", "pwo"].includes(group) ? "traening" : "kosttilskud")
  const background = randomPick(BACKGROUNDS[bgGroup as keyof typeof BACKGROUNDS] || BACKGROUNDS.default)
  const realismEnhancer = randomPick(REALISM_ENHANCERS)
  const environment = randomPick(config.environments)
  const setupElement = randomPick(config.setupElements)

  return `Photorealistic documentary-style photograph of the exact "${productName}" product in a real-world Scandinavian/Danish health & wellness setting.

CRITICAL — PRODUCT IDENTITY (MANDATORY):
- This is a product called "${productName}"
- The generated product must match the reference image exactly in container type, proportions, label layout, and branding
- Preserve original brand name, original product name, and visual identity from the reference image
- Do NOT invent a different label, brand, or package design
- Product name "${productName}" should remain identifiable in the scene

CRITICAL — PRODUCT POSITIONING (MANDATORY):
- Show ONLY ONE product — do NOT duplicate the product
- The product must be placed on a stable surface (countertop, table, shelf, bench)
- Products must NEVER float in the air
- NO hands holding the product in this image — the product simply stands on a surface
- This is a static, documentary placement shot — NOT an action shot

SCENE SETUP:
- Environment: ${environment}
- Nearby elements: ${setupElement}
- Background: ${background}
- This should feel like a "before we start testing" setup photo for an independent Danish product review site

CAMERA & COMPOSITION:
- Angle: ${cameraAngle}
- Distance: ${distance}
- The product is clearly visible with branding facing the camera in sharp focus
- Product branding must be well-lit and readable

LIGHTING:
${lighting}

REALISM DETAILS:
- ${realismEnhancer}
- Natural, muted Scandinavian tones — no oversaturated colors
- Shallow depth of field with background softly blurred

RESTRICTIONS:
- NO hands or arms in this image — product stands alone on surface
- NO duplicate products — show exactly ONE product
- NO floating products
- NO changing brand identity, product label, or package design from the reference image
- NO faces or identifiable people
- NO text overlays, watermarks, or logos added by you
- NO exaggerated studio lighting — this is documentary, not advertising

FORMAT:
- Generate a SQUARE image (1:1 aspect ratio)

OVERALL FEEL:
An honest, documentary-style product photograph for an independent Danish supplement and health test site (kostmag.dk). The product must clearly be the same real product as in the reference image.`
}

function buildDetailPrompt(productName: string, categorySlug: string): string {
  const config = getCategoryConfig(categorySlug)
  const group = detectCategoryGroup(categorySlug)

  const cameraAngle = randomPick(CAMERA_ANGLES)
  const distance = randomPick(DISTANCES.detail)
  const lighting = randomPick(LIGHTING)
  const realismEnhancer = randomPick(REALISM_ENHANCERS)
  const functionDetail = randomPick(config.functionDetails)
  const criticalDetail = randomPick(config.criticalDetails)
  const textureBehavior = randomPick(config.textureBehaviors)

  const isEquipment = group === "udstyr"
  const isCapsule = ["omega3", "vitaminer"].includes(group)
  const isPowder = ["proteinpulver", "kollagenpulver", "kreatin", "pwo"].includes(group)

  let positioningInstructions: string
  if (isPowder) {
    positioningInstructions = `- The product MUST be held naturally by a realistic human hand, or a scoop should be shown measuring the powder
- Show the powder being scooped, poured, or mixed — an active usage moment
- A realistic human hand and forearm MUST be visible holding/using the product
- The hand should look natural with correct anatomy (5 fingers, proper grip)`
  } else if (isCapsule) {
    positioningInstructions = `- Show a capsule or tablet being held between fingers, or poured from the bottle
- Focus on the capsule quality, color, and size
- A realistic human hand holding the supplement
- Show the moment of daily usage — taking the supplement`
  } else if (isEquipment) {
    positioningInstructions = `- Show the equipment in use or a close-up of its key feature
- Focus on build quality, grip texture, or mechanism detail
- Hands may be shown demonstrating the equipment`
  } else {
    positioningInstructions = `- Show the product being used or examined closely
- A realistic human hand may be holding or using the product
- Focus on the quality and key features of the product`
  }

  return `Close-up photorealistic documentary-style photograph showing the exact "${productName}" product during a real product test.

CRITICAL — PRODUCT IDENTITY (MANDATORY):
- This is a product called "${productName}"
- Match the reference image exactly for container shape, proportions, label design, and brand identity
- Preserve original brand name and product naming from the reference image
- Do NOT replace the brand or redesign the package
- Product name "${productName}" must be at least partially identifiable

CRITICAL — PRODUCT POSITIONING (MANDATORY):
${positioningInstructions}

FOCUS & DETAIL:
- Primary focus: ${functionDetail}
- Critical detail in sharp focus: ${criticalDetail}
- Texture/quality visible: ${textureBehavior}
- Product branding visible in the frame (at least partially)

CAMERA & COMPOSITION:
- Angle: ${cameraAngle}
- Distance: ${distance}
- Sharp focus on the key detail with shallow depth of field
- Background softly blurred showing the same Danish/Scandinavian test environment

LIGHTING:
${lighting}

TEXTURE & REALISM:
- Show realistic textures — powder grain, capsule sheen, material quality
- ${realismEnhancer}
- Fine details visible without being artificially sharp
- Natural Scandinavian color grading, slightly muted

RESTRICTIONS:
- NO floating products
- NO changing the product brand or label identity from the reference image
- NO faces (hands/arms visible only, from wrist down)
- NO text overlays, watermarks, or logos added by you
- NO artificial studio lighting
- NO overly shiny or unrealistic surfaces

FORMAT:
- Generate a SQUARE image (1:1 aspect ratio)

OVERALL FEEL:
An honest, technical review photo showing a detail of the actual product in use. The product must clearly be identical to the reference image in branding and package design. Documentary realism for an independent Danish supplement and health test site (kostmag.dk).`
}

// ═══════════════════════════════════════════════════════════════
// GEMINI API
// ═══════════════════════════════════════════════════════════════

async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: any
  for (let i = 0; i < tries; i++) {
    try { return await fn() } catch (e) {
      lastErr = e
      const wait = 2000 * Math.pow(2, i)
      console.log(`    Retry ${i + 1}/${tries} after ${wait}ms...`)
      await new Promise(r => setTimeout(r, wait))
    }
  }
  throw lastErr
}

async function generateImageWithGemini(
  prompt: string,
  referenceImageBase64?: string
): Promise<Buffer | null> {
  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not configured!")
    return null
  }

  const contents: any[] = []

  if (referenceImageBase64) {
    const base64Data = referenceImageBase64.includes(",")
      ? referenceImageBase64.split(",")[1]
      : referenceImageBase64
    const mimeType = referenceImageBase64.includes("image/jpeg") ? "image/jpeg" : "image/png"

    contents.push({
      role: "user",
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        {
          text: `CRITICAL INSTRUCTIONS — READ CAREFULLY:

0. IMAGE FORMAT (MANDATORY):
   - Generate a SQUARE image (1:1 aspect ratio)

1. PRODUCT SHAPE PRESERVATION (MANDATORY):
   - The product in the generated image MUST have the EXACT SAME SHAPE as shown in the reference image
   - If the reference shows a cylindrical container, generate that exact shape — NOT a different shape
   - The product's proportions (height, width, cap style) must match the reference EXACTLY

2. PRODUCT COLOR PRESERVATION (MANDATORY):
   - The product's EXACT COLORS must match the reference image PRECISELY
   - NEVER substitute colors — a green product must stay green, a black product must stay black
   - The container color, cap color, and label colors must ALL match

3. PRODUCT LABEL/BRANDING (MANDATORY):
   - Reproduce all text, logos, and graphics on the product label EXACTLY as shown
   - The brand name and product name must be clearly readable

4. PRODUCT POSITIONING (MANDATORY):
   - The product must exist physically within the photograph
   - Products must NEVER float in the air
   - NO composite/collage effects

${prompt}`,
        },
      ],
    })
  } else {
    contents.push({ role: "user", parts: [{ text: prompt }] })
  }

  const requestBody = {
    contents,
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 8192,
    },
  }

  async function generateWithModel(model: string): Promise<Buffer | null> {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`

    const response = await withRetry(async () => {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`)
      }
      return await res.json()
    })

    const parts = response?.candidates?.[0]?.content?.parts
    if (!parts) return null

    for (const part of parts) {
      if (part.inlineData?.data) {
        return Buffer.from(part.inlineData.data, "base64")
      }
    }
    return null
  }

  try {
    return await generateWithModel("gemini-3-pro-image-preview")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const shouldFallback = /Gemini API 429|RESOURCE_EXHAUSTED|quota/i.test(message)
    if (!shouldFallback) throw error
    console.log(`    Falling back to gemini-3.1-flash-image-preview...`)
    return await generateWithModel("gemini-3.1-flash-image-preview")
  }
}

// ═══════════════════════════════════════════════════════════════
// PRODUCT EXTRACTION FROM MDX
// ═══════════════════════════════════════════════════════════════

type ProductInfo = {
  slug: string
  name: string
  imageUrl: string // local reference image path
}

type TestImageEntry = {
  // Keep the legacy shape for compatibility with existing rebuild logic.
  overview: string | null
  detail: string | null
}

async function extractProductsFromMDX(categorySlug: string): Promise<ProductInfo[]> {
  const mdxPath = path.join(KOSTTILSKUD_DIR, categorySlug, "page.mdx")
  const raw = await fs.readFile(mdxPath, "utf-8")
  
  const products: ProductInfo[] = []
  const seen = new Set<string>()
  
  // Load image mapping
  let imageMapping: Record<string, string> = {}
  try {
    imageMapping = JSON.parse(await fs.readFile(IMAGE_MAPPING_FILE, "utf-8"))
  } catch {}

  // Strategy: find all <a id="product-SLUG"> anchors, then find the product name
  // from the product-card-img alt text nearby
  const anchorRegex = /<a id="product-([^"]+)"><\/a>/g
  let match: RegExpExecArray | null

  while ((match = anchorRegex.exec(raw)) !== null) {
    const slug = match[1]
    if (seen.has(slug)) continue
    seen.add(slug)

    // Find the product name from nearby product-card-img alt text
    const after = raw.slice(match.index, match.index + 1500)
    const altMatch = after.match(/alt="([^"]+)"/)
    const name = altMatch ? altMatch[1] : slug.replace(/-/g, " ")
    
    const imageUrl = imageMapping[slug] || ""
    products.push({ slug, name, imageUrl })
  }

  return products
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const categorySlug = process.argv[2]
  const force = process.argv.includes("--force")

  if (!categorySlug) {
    console.error("Usage: npx tsx scripts/generate-product-test-images.ts <category-slug> [--force]")
    console.error("Example: npx tsx scripts/generate-product-test-images.ts kollagenpulver")
    process.exit(1)
  }

  if (!GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY not found in .env.local")
    process.exit(1)
  }

  await fs.mkdir(IMAGES_DIR, { recursive: true })

  console.log("═══════════════════════════════════════════════")
  console.log(`  Generate Product Test Images`)
  console.log(`  Category: ${categorySlug}`)
  console.log(`  Model: gemini-3-pro-image-preview`)
  console.log("═══════════════════════════════════════════════\n")

  // Extract products from the category's MDX file
  const products = await extractProductsFromMDX(categorySlug)
  console.log(`  Found ${products.length} products in ${categorySlug}\n`)

  if (products.length === 0) {
    console.error("  No products found! Check the MDX file.")
    process.exit(1)
  }

  // Track results
  const results: Record<string, TestImageEntry> = {}
  let generated = 0

  for (const product of products) {
    console.log(`  ┌─ ${product.name}`)
    console.log(`  │  Slug: ${product.slug}`)
    console.log(`  │  Reference image: ${product.imageUrl || "(none)"}`)

    // Check if images already exist
    const existingFiles = await fs.readdir(IMAGES_DIR).catch(() => [])
    const singleFile = existingFiles.find(f => f.startsWith(product.slug) && f.includes("-single-"))
    const overviewFile = existingFiles.find(f => f.startsWith(product.slug) && f.includes("-overview-"))
    const detailFile = existingFiles.find(f => f.startsWith(product.slug) && f.includes("-detail-"))
    const existingPrimaryFile = singleFile || overviewFile || detailFile || null

    if (existingPrimaryFile && !force) {
      console.log(`  │  ✓ Existing test image found, keeping current file`)
      results[product.slug] = {
        overview: `/generated/product-tests/${existingPrimaryFile}`,
        detail: null,
      }
      console.log(`  └─ Skipped\n`)
      continue
    }

    // Load reference image as base64 — but skip if branding likely mismatches
    let referenceBase64: string | undefined
    if (product.imageUrl && !shouldSkipReferenceImage(product.slug, product.imageUrl)) {
      try {
        const imgPath = path.join(process.cwd(), "public", product.imageUrl)
        const buf = await fs.readFile(imgPath)
        const ext = path.extname(product.imageUrl).toLowerCase()
        const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png"
        referenceBase64 = `data:${mime};base64,${buf.toString("base64")}`
        console.log(`  │  Reference loaded (${(buf.length / 1024).toFixed(0)} KB)`)
      } catch {
        console.log(`  │  ⚠ Could not load reference image`)
      }
    } else if (product.imageUrl) {
      console.log(`  │  ⚠ Skipping reference image (possible branding mismatch for ${product.slug})`)
    }

    let generatedPath: string | null = existingPrimaryFile ? `/generated/product-tests/${existingPrimaryFile}` : null
    const prompt = buildOverviewPrompt(product.name, categorySlug)
    console.log(`  │  Generating test image...`)
    const imageBuf = await generateImageWithGemini(prompt, referenceBase64)

    if (imageBuf) {
      const hash = crypto.randomBytes(4).toString("hex")
      const filename = `${product.slug}-single-${Date.now()}-${hash}.webp`
      const webp = await sharp(imageBuf).resize(1024, 1024, { fit: "cover" }).webp({ quality: 88 }).toBuffer()
      await fs.writeFile(path.join(IMAGES_DIR, filename), webp)
      generatedPath = `/generated/product-tests/${filename}`
      generated++
      console.log(`  │  ✓ Test image saved (${(webp.length / 1024).toFixed(0)} KB)`)
    } else {
      console.log(`  │  ✗ Test image generation failed`)
    }

    results[product.slug] = { overview: generatedPath, detail: null }
    console.log(`  └─ Done (${generated}/${products.length})\n`)

    // Delay between products
    await new Promise(r => setTimeout(r, 3000))
  }

  // Save results mapping
  const mappingFile = path.join(process.cwd(), "content", "product-test-images.json")
  let existing: Record<string, any> = {}
  try { existing = JSON.parse(await fs.readFile(mappingFile, "utf-8")) } catch {}
  const merged = { ...existing, ...results }
  const tempMappingFile = `${mappingFile}.tmp`
  await fs.writeFile(tempMappingFile, JSON.stringify(merged, null, 2), "utf-8")
  await fs.rename(tempMappingFile, mappingFile)

  console.log("═══════════════════════════════════════════════")
  console.log(`  Generated: ${generated} products`)
  console.log(`  Total mapped: ${Object.keys(merged).length}`)
  console.log(`  Saved to: ${mappingFile}`)
  console.log("═══════════════════════════════════════════════")
}

main().catch(e => { console.error(e); process.exit(1) })
