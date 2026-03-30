/**
 * Genererar professionella porträttbilder för alla teammedlemmar
 * via OpenAI DALL-E (eller GPT-4o image generation).
 *
 * Kör: npx tsx scripts/generate-author-images.ts
 * Kräver: OPENAI_API_KEY i .env.local
 */

import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

// Load .env.local explicitly
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Fejl: OPENAI_API_KEY mangler i .env.local");
  process.exit(1);
}

const OUTPUT_DIR = path.join(process.cwd(), "public", "authors");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

interface AuthorPrompt {
  filename: string;
  prompt: string;
}

const AUTHORS: AuthorPrompt[] = [
  {
    filename: "line-kragelund.webp",
    prompt:
      "Professional headshot portrait photo of a Scandinavian woman, age 30, with light brown hair in a soft updo, warm friendly expression, wearing a white blouse with a subtle green accent. Clean neutral light grey background with soft studio lighting. She is a nutrition expert: approachable, professional, trustworthy. Photorealistic, high quality, no text, no watermarks.",
  },
  {
    filename: "mikkel-rasmussen.webp",
    prompt:
      "Professional headshot portrait photo of a Scandinavian man, age 37, with short dark blonde hair and a neatly trimmed short beard, confident and trustworthy expression, wearing a light blue button-down shirt. Clean neutral light grey background with soft studio lighting. He is a clinical dietitian: serious, knowledgeable, credible. Photorealistic, high quality, no text, no watermarks.",
  },
  {
    filename: "anna-vestergaard.webp",
    prompt:
      "Professional headshot portrait photo of a Scandinavian woman, age 27, shoulder-length blonde hair, athletic and energetic appearance, warm smile, wearing a fitted dark green polo shirt. Clean neutral light grey background with soft studio lighting. She is a sports nutrition analyst: fit, approachable, youthful but professional. Photorealistic, high quality, no text, no watermarks.",
  },
  {
    filename: "thomas-moeller.webp",
    prompt:
      "Professional headshot portrait photo of a Scandinavian man, age 42, short dark brown hair with slight grey at the temples, glasses with thin dark frames, authoritative but approachable expression, wearing a dark navy blazer over a white shirt without tie. Clean neutral light grey background with soft studio lighting. He is an editor-in-chief: experienced, trustworthy, editorial. Photorealistic, high quality, no text, no watermarks.",
  },
];

async function generateImage(author: AuthorPrompt): Promise<void> {
  const outPath = path.join(OUTPUT_DIR, author.filename.replace(".webp", ".png"));

  console.log(`Genererer: ${author.filename}...`);

  const body = JSON.stringify({
    model: "dall-e-3",
    prompt: author.prompt,
    n: 1,
    size: "1024x1024",
    quality: "hd",
    response_format: "url",
  });

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`Fejl for ${author.filename}: ${response.status} ${err}`);
    return;
  }

  const data = await response.json();
  const imageUrl = data?.data?.[0]?.url;

  if (!imageUrl) {
    console.error(`Ingen bild-URL returnerad for ${author.filename}`);
    return;
  }

  // Download image
  await downloadFile(imageUrl, outPath);
  console.log(`Gemt: ${outPath}`);
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const getter = url.startsWith("https") ? https : http;
    getter.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log("=== Genererer author-billeder via DALL-E 3 ===\n");

  for (const author of AUTHORS) {
    try {
      await generateImage(author);
    } catch (err) {
      console.error(`Fejl for ${author.filename}:`, err);
    }
    // Rate limit: vänta 2s mellan anrop
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\n=== Færdig! ===");
  console.log(`Billeder gemt i: ${OUTPUT_DIR}`);
  console.log(
    "OBS: Filerne er gemt som .png. Konvertér til .webp med:\n" +
    "  npx sharp-cli -i public/authors/*.png -o public/authors/ -f webp"
  );
}

main();
