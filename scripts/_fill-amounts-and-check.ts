import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const CAT_BASE = "src/app/(da)/kosttilskud";
const PROD_BASE = "src/app/(da)/kosttilskud/produkter";
const DRY_RUN = process.argv.includes("--dry-run");

interface Prod {
  name: string; brand: string; price: string; amount: string;
  rating: number; note: string; slug: string;
}

// ── Extract amount from product content.mdx ──────────────────

function extractAmountFromContent(slug: string): string | null {
  const contentPath = join(PROD_BASE, slug, "content.mdx");
  if (!existsSync(contentPath)) return null;
  const content = readFileSync(contentPath, "utf-8");

  // Look for Pakningsstørrelse in quickfact table
  const pakMatch = content.match(/<td>.*?Pakningsst.*?<\/td><td>([^<]+)<\/td>/i);
  const antalMatch = content.match(/<td>.*?Antal.*?<\/td><td>([^<]+)<\/td>/i);

  // Also try multi-line table format
  const pakMulti = content.match(/<td>.*?Pakningsst.*?<\/td>\s*<td>([^<]+)<\/td>/i);
  const antalMulti = content.match(/<td>.*?Antal.*?<\/td>\s*<td>([^<]+)<\/td>/i);

  const pakVal = pakMatch?.[1]?.trim() || pakMulti?.[1]?.trim() || null;
  const antalVal = antalMatch?.[1]?.trim() || antalMulti?.[1]?.trim() || null;

  if (pakVal && antalVal) {
    // Combine: e.g. "30 g pr. bar" + "15 barer" → "15 x 30 g"
    return `${antalVal}, ${pakVal}`;
  }
  if (pakVal) return pakVal;
  if (antalVal) return antalVal;

  // Fallback: try extracting from product name or prose
  const portionMatch = content.match(/<td>.*?[Pp]ortioner?\s*(?:pr\.?\s*(?:bøtte|pakke|pose))?.*?<\/td>\s*<td>(\d+)<\/td>/i);
  if (portionMatch) return `${portionMatch[1]} portioner`;

  return null;
}

// ── Price parsing ────────────────────────────────────────────

function parsePrice(s: string): number | null {
  if (!s) return null;
  const clean = s.replace(/\s/g, "").replace(",", ".");
  // Handle "1.299" as 1299
  const m = clean.match(/([\d.]+)/);
  if (!m) return null;
  const val = m[1];
  // If it has multiple dots, treat as thousands separator
  if ((val.match(/\./g) || []).length > 1) {
    return parseFloat(val.replace(/\./g, ""));
  }
  // If format like "1.299" (4+ digits after dot), it's thousands
  const dotParts = val.split(".");
  if (dotParts.length === 2 && dotParts[1].length >= 3) {
    return parseFloat(val.replace(".", ""));
  }
  return parseFloat(val);
}

function parseWeight(text: string): number | null {
  const kg = text.match(/([\d]+[.,]?\d*)\s*kg/i);
  if (kg) return parseFloat(kg[1].replace(",", ".")) * 1000;
  const g = text.match(/([\d]+[.,]?\d*)\s*g(?:ram)?(?:\b|$)/i);
  if (g) return parseFloat(g[1].replace(",", "."));
  const ml = text.match(/([\d]+[.,]?\d*)\s*ml/i);
  if (ml) return parseFloat(ml[1].replace(",", "."));
  const l = text.match(/([\d]+[.,]?\d*)\s*(?:liter|l)\b/i);
  if (l) return parseFloat(l[1].replace(",", ".")) * 1000;
  return null;
}

function parseCount(text: string): number | null {
  const patterns = [
    /([\d]+)\s*(kapsler|kaps|capsules|caps)\b/i,
    /([\d]+)\s*(tabletter|tabl|tablets|tabs)\b/i,
    /([\d]+)\s*(stk|stykker|pieces)\b/i,
    /([\d]+)\s*(softgels|gummies|chews|pastiller|tyggetabl|tyggetabletter)\b/i,
    /([\d]+)\s*(breve|sachets|portioner)\b/i,
    /([\d]+)\s*(barer|bars)\b/i,
    /([\d]+)\s*(dåser|dser|cans)\b/i,
    /([\d]+)\s*(poser|bags)\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return parseInt(m[1]);
  }
  return null;
}

// Handle compound amounts like "15 barer, 30 g pr. bar" → total weight
function parseCompoundAmount(amount: string): { value: number; unit: string } | null {
  // "N x Mg" or "N barer, Mg pr. bar" patterns
  const multiWeight = amount.match(/(\d+)\s*(?:x|barer|stk|stykker)[,\s]+(\d+[.,]?\d*)\s*(g|kg|ml)/i);
  if (multiWeight) {
    const count = parseInt(multiWeight[1]);
    let unitWeight = parseFloat(multiWeight[2].replace(",", "."));
    if (multiWeight[3].toLowerCase() === "kg") unitWeight *= 1000;
    return { value: count * unitWeight, unit: "g" };
  }

  // "N dåser, 330 ml" → count
  const multiCount = amount.match(/(\d+)\s*(?:dåser|dser|cans)[,\s]+(\d+)\s*ml/i);
  if (multiCount) {
    return { value: parseInt(multiCount[1]) * parseInt(multiCount[2]), unit: "ml" };
  }

  return null;
}

interface NormPrice { value: number; unit: string; }

function normalizePrice(price: number, amount: string): NormPrice | null {
  if (price <= 0) return null;

  // Try compound amount first
  const compound = parseCompoundAmount(amount);
  if (compound) {
    if (compound.unit === "g" || compound.unit === "ml") {
      return { value: (price / compound.value) * 1000, unit: "kr/kg" };
    }
  }

  // Try weight
  const weight = parseWeight(amount);
  if (weight && weight > 0) {
    return { value: (price / weight) * 1000, unit: "kr/kg" };
  }

  // Try count
  const count = parseCount(amount);
  if (count && count > 0) {
    return { value: price / count, unit: "kr/stk" };
  }

  return null;
}

// ── Phase 1: Fill empty amounts ──────────────────────────────

const catDirs = readdirSync(CAT_BASE, { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== "produkter")
  .map(d => d.name);

let totalProducts = 0;
let emptyAmounts = 0;
let filled = 0;
let stillEmpty = 0;
let filesUpdated = 0;

for (const dir of catDirs) {
  const filePath = join(CAT_BASE, dir, "page.mdx");
  let content: string;
  try { content = readFileSync(filePath, "utf-8"); } catch { continue; }

  const ctMatch = content.match(/<ComparisonTable\s+products=\{(\[[\s\S]*?\])\}\s*\/>/);
  if (!ctMatch) continue;

  let products: Prod[];
  try { products = JSON.parse(ctMatch[1]); } catch { continue; }

  let changed = false;
  for (const p of products) {
    totalProducts++;
    if (p.amount && p.amount.trim()) continue;
    emptyAmounts++;

    const extracted = extractAmountFromContent(p.slug);
    if (extracted) {
      p.amount = extracted;
      filled++;
      changed = true;
    } else {
      stillEmpty++;
    }
  }

  if (changed && !DRY_RUN) {
    const newJson = JSON.stringify(products);
    content = content.replace(ctMatch[1], newJson);
    writeFileSync(filePath, content, "utf-8");
    filesUpdated++;
  }
}

console.log(`\n=== PHASE 1: FILL AMOUNTS ===`);
console.log(`Total products scanned: ${totalProducts}`);
console.log(`Empty amount fields: ${emptyAmounts}`);
console.log(`Filled from content.mdx: ${filled}`);
console.log(`Still empty (no content page): ${stillEmpty}`);
console.log(`Files updated: ${DRY_RUN ? 0 : filesUpdated}`);

// ── Phase 2: Budget consistency check with unit prices ───────

interface Issue {
  slug: string;
  budgetName: string;
  budgetPos: number;
  budgetUnitPrice: number;
  budgetUnit: string;
  budgetAmount: string;
  cheaperName: string;
  cheaperPos: number;
  cheaperUnitPrice: number;
  cheaperAmount: string;
  cheaperNote: string;
  pctCheaper: number;
}

const issues: Issue[] = [];
let pagesChecked = 0;
let pagesNoUnit = 0;

for (const dir of catDirs) {
  const filePath = join(CAT_BASE, dir, "page.mdx");
  let content: string;
  try { content = readFileSync(filePath, "utf-8"); } catch { continue; }

  const ctMatch = content.match(/<ComparisonTable\s+products=\{(\[[\s\S]*?\])\}\s*\/>/);
  if (!ctMatch) continue;

  let products: Prod[];
  try { products = JSON.parse(ctMatch[1]); } catch { continue; }
  if (products.length < 3) continue;

  const budgetIdx = products.findIndex(p => p.note === "BEDSTE BUDGET");
  if (budgetIdx < 0) continue;
  pagesChecked++;

  const budgetProd = products[budgetIdx];
  const budgetPrice = parsePrice(budgetProd.price);
  if (!budgetPrice) continue;

  const budgetNorm = normalizePrice(budgetPrice, budgetProd.amount || budgetProd.name);
  if (!budgetNorm) { pagesNoUnit++; continue; }

  for (let i = 0; i < products.length; i++) {
    if (i === budgetIdx) continue;
    const p = products[i];
    const pPrice = parsePrice(p.price);
    if (!pPrice) continue;

    const pNorm = normalizePrice(pPrice, p.amount || p.name);
    if (!pNorm) continue;
    if (pNorm.unit !== budgetNorm.unit) continue;

    const pctCheaper = ((budgetNorm.value - pNorm.value) / budgetNorm.value) * 100;
    if (pctCheaper > 5) {
      issues.push({
        slug: dir,
        budgetName: budgetProd.name,
        budgetPos: budgetIdx + 1,
        budgetUnitPrice: budgetNorm.value,
        budgetUnit: budgetNorm.unit,
        budgetAmount: budgetProd.amount,
        cheaperName: p.name,
        cheaperPos: i + 1,
        cheaperUnitPrice: pNorm.value,
        cheaperAmount: p.amount,
        cheaperNote: p.note || "(ingen)",
        pctCheaper,
      });
    }
  }
}

issues.sort((a, b) => b.pctCheaper - a.pctCheaper);

console.log(`\n=== PHASE 2: BUDGET CONSISTENCY (UNIT PRICES) ===`);
console.log(`Pages with BEDSTE BUDGET: ${pagesChecked}`);
console.log(`Pages where unit price could not be calculated: ${pagesNoUnit}`);
console.log(`Problems found (>5% cheaper by unit price): ${issues.length} across ${new Set(issues.map(i => i.slug)).size} pages\n`);

for (const iss of issues) {
  console.log(`  ${iss.slug} (${iss.pctCheaper.toFixed(0)}% billigare per ${iss.budgetUnit}):`);
  console.log(`    BUDGET pos ${iss.budgetPos}: ${iss.budgetName} [${iss.budgetAmount}]`);
  console.log(`      → ${iss.budgetUnitPrice.toFixed(2)} ${iss.budgetUnit}`);
  console.log(`    BILLIGARE pos ${iss.cheaperPos}: ${iss.cheaperName} [${iss.cheaperAmount}] — "${iss.cheaperNote}"`);
  console.log(`      → ${iss.cheaperUnitPrice.toFixed(2)} ${iss.cheaperUnit || iss.budgetUnit}`);
  console.log();
}
