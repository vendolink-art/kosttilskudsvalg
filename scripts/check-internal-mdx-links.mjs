/**
 * Verifies internal href="/..." targets in product content.mdx and kosttilskud category page.mdx.
 * Mirrors app routing: silo/[slug] → kosttilskud/{slug}/page.mdx, redirects, short links.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const daRoot = path.join(root, "src", "app", "(da)");

/** @type {Set<string>} */
const SILO_IDS = new Set([
  "protein-traening",
  "vitaminer",
  "mineraler",
  "omega-fedtsyrer",
  "sundhed-velvaere",
]);

/** Parse SLUG_TO_SILO from silo-config.ts (avoid tsx dependency) */
function loadSlugToSilo() {
  const p = path.join(root, "src", "lib", "silo-config.ts");
  const text = fs.readFileSync(p, "utf8");
  const map = {};
  const re = /^\s*"([^"]+)":\s*"([^"]+)",?\s*$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    map[m[1]] = m[2];
  }
  return map;
}

const SLUG_TO_SILO = loadSlugToSilo();

function walkDir(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, files);
    else if (e.isFile()) files.push(p);
  }
  return files;
}

function fileExists(p) {
  return fs.existsSync(p);
}

/** Category MDX source of truth */
function categoryMdxPath(slug) {
  return path.join(daRoot, "kosttilskud", slug, "page.mdx");
}

function categoryExists(slug) {
  return fileExists(categoryMdxPath(slug));
}

/** Product page: page.tsx loads content.mdx */
function productExists(slug) {
  const dir = path.join(daRoot, "kosttilskud", "produkter", slug);
  return (
    fileExists(path.join(dir, "content.mdx")) || fileExists(path.join(dir, "page.tsx"))
  );
}

/**
 * @param {string} urlPath pathname only, e.g. /protein-traening/kreatin
 */
function isValidInternalPath(urlPath) {
  const raw = urlPath.replace(/\/+$/, "");
  if (!raw || raw === "/") return false;
  const segs = raw.split("/").filter(Boolean);

  // ── /kosttilskud/... ─────────────────────────────────────
  if (segs[0] === "kosttilskud") {
    if (segs.length === 1) {
      return (
        fileExists(path.join(daRoot, "kosttilskud", "page.mdx")) ||
        fileExists(path.join(daRoot, "kosttilskud", "page.tsx"))
      );
    }
    if (segs.length === 2) {
      return categoryExists(segs[1]);
    }
    if (segs.length === 3 && segs[1] === "produkter") {
      return productExists(segs[2]);
    }
    return false;
  }

  // ── Silo hub / silo/slug ───────────────────────────────────
  if (SILO_IDS.has(segs[0])) {
    const silo = segs[0];
    if (segs.length === 1) {
      return fileExists(path.join(daRoot, silo, "page.tsx"));
    }
    if (segs.length === 2) {
      const urlSlug = segs[1];
      if (silo === "mineraler" && urlSlug === "calcium") {
        return categoryExists("kalktabletter");
      }
      if (silo === "mineraler" && urlSlug === "calcium-og-magnesium") {
        return fileExists(path.join(daRoot, "mineraler", "calcium-og-magnesium", "page.tsx"));
      }
      const mapped = SLUG_TO_SILO[urlSlug];
      if (mapped && mapped !== silo) return false;
      return categoryExists(urlSlug);
    }
    return false;
  }

  // ── Single segment: direct (da)/x or short category slug ──
  if (segs.length === 1) {
    const s = segs[0];
    const direct = path.join(daRoot, s);
    if (fileExists(path.join(direct, "page.mdx")) || fileExists(path.join(direct, "page.tsx"))) {
      return true;
    }
    if (SLUG_TO_SILO[s] && categoryExists(s)) return true;
    return false;
  }

  // ── Fallback: static path under (da) ──────────────────────
  const joined = path.join(daRoot, ...segs);
  if (fileExists(path.join(joined, "page.mdx")) || fileExists(path.join(joined, "page.tsx"))) {
    return true;
  }

  return false;
}

const productFiles = walkDir(path.join(daRoot, "kosttilskud", "produkter")).filter((f) =>
  f.endsWith("content.mdx")
);
const categoryFiles = walkDir(path.join(daRoot, "kosttilskud")).filter(
  (f) => f.endsWith("page.mdx") && !f.includes(`${path.sep}produkter${path.sep}`)
);

const hrefRe = /href="(\/[^"?#]*)/g;

function extractHrefs(file) {
  const text = fs.readFileSync(file, "utf8");
  const out = [];
  let m;
  while ((m = hrefRe.exec(text)) !== null) {
    const u = m[1];
    if (!u || u === "/") continue;
    out.push({ file, path: u });
  }
  return out;
}

const all = [];
for (const f of productFiles) all.push(...extractHrefs(f));
for (const f of categoryFiles) all.push(...extractHrefs(f));

const dead = [];
for (const { file, path: u } of all) {
  if (!isValidInternalPath(u)) {
    dead.push({ file: path.relative(root, file), target: u });
  }
}

const uniqueTargets = [...new Set(all.map((x) => x.path))].sort();

console.log(
  JSON.stringify(
    {
      productContentFiles: productFiles.length,
      categoryPageFiles: categoryFiles.length,
      totalLinks: all.length,
      uniqueTargetCount: uniqueTargets.length,
      deadCount: dead.length,
      dead,
    },
    null,
    2
  )
);
