/**
 * Verifies product/static image paths from product-images.json and category page.mdx
 * resolve to files under public/.
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "public");
const PRODUCTS_JSON = path.join(ROOT, "content", "product-images.json");
const KOSTTILSKUD = path.join(ROOT, "src", "app", "(da)", "kosttilskud");

type Ref = { source: string; detail?: string };

function normalizeUrlPath(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return null;
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  const pathname = (trimmed.split("?")[0] ?? "").split("#")[0] ?? "";
  if (!pathname || pathname === "/") return null;
  return pathname;
}

function diskPath(urlPath: string): string {
  const parts = urlPath.replace(/^\/+/, "").split("/").filter(Boolean);
  return path.join(PUBLIC, ...parts);
}

function fileExists(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function walkPageMdx(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkPageMdx(full));
    else if (ent.name === "page.mdx") out.push(full);
  }
  return out;
}

const pathToRefs = new Map<string, Ref[]>();

function addRef(urlPath: string, ref: Ref) {
  const arr = pathToRefs.get(urlPath) ?? [];
  arr.push(ref);
  pathToRefs.set(urlPath, arr);
}

let jsonLocalPaths = 0;
let jsonSkippedExternal = 0;
let jsonSkippedOther = 0;

const rawJson = fs.readFileSync(PRODUCTS_JSON, "utf8");
const productMap = JSON.parse(rawJson) as Record<string, string>;

for (const [slug, val] of Object.entries(productMap)) {
  if (typeof val !== "string") {
    jsonSkippedOther++;
    continue;
  }
  const n = normalizeUrlPath(val);
  if (!n) {
    if (/^https?:\/\//i.test(val.trim())) jsonSkippedExternal++;
    else jsonSkippedOther++;
    continue;
  }
  if (!n.startsWith("/vendor/products/") && !n.startsWith("/generated/")) {
    jsonSkippedOther++;
    continue;
  }
  jsonLocalPaths++;
  addRef(n, { source: "product-images.json", detail: slug });
}

const srcRegex = /\bsrc\s*=\s*(["'])([^"']+)\1/gi;
let mdxSrcHits = 0;

for (const file of walkPageMdx(KOSTTILSKUD)) {
  const content = fs.readFileSync(file, "utf8");
  let m: RegExpExecArray | null;
  srcRegex.lastIndex = 0;
  while ((m = srcRegex.exec(content)) !== null) {
    const raw = m[2];
    const n = normalizeUrlPath(raw);
    if (!n) continue;
    const likelyPublic =
      n.startsWith("/vendor/") ||
      n.startsWith("/generated/") ||
      n.startsWith("/images/") ||
      n.startsWith("/authors/");
    if (!likelyPublic) continue;
    mdxSrcHits++;
    addRef(n, { source: path.relative(ROOT, file).replace(/\\/g, "/") });
  }
}

const uniquePaths = [...pathToRefs.keys()].sort();
const missing: { urlPath: string; disk: string; refs: Ref[] }[] = [];

for (const urlPath of uniquePaths) {
  const d = diskPath(urlPath);
  if (!fileExists(d)) {
    missing.push({ urlPath, disk: d, refs: pathToRefs.get(urlPath)! });
  }
}

console.log("=== Product / static image disk check ===\n");
console.log(`Root: ${ROOT}`);
console.log(`Public: ${PUBLIC}\n`);
console.log("Sources:");
console.log(`  product-images.json: ${jsonLocalPaths} local paths (/vendor/products/ or /generated/)`);
console.log(`    skipped: ${jsonSkippedExternal} external URLs, ${jsonSkippedOther} other/non-local`);
console.log(`  page.mdx (under kosttilskud): ${mdxSrcHits} src= hits under /vendor/, /generated/, /images/, /authors/`);
console.log(`\nUnique paths verified on disk: ${uniquePaths.length}`);
console.log(`Missing on disk: ${missing.length}\n`);

if (missing.length === 0) {
  console.log("All checked paths exist under public/.\n");
  process.exit(0);
}

console.log("--- Missing files ---\n");
for (const row of missing) {
  console.log(`URL path: ${row.urlPath}`);
  console.log(`Expected file: ${row.disk}`);
  console.log("Referenced from:");
  for (const r of row.refs) {
    const extra = r.detail ? ` (product slug: ${r.detail})` : "";
    console.log(`  - ${r.source}${extra}`);
  }
  console.log("");
}

process.exit(1);
