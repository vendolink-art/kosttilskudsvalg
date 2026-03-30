# Category Page Canonical Spec

This document is the canonical source of truth for Danish category pages under `src/app/(da)/kosttilskud/<category-slug>/page.mdx`.

It exists to replace the previous situation where the standard lived partly in generator code, partly in runtime rendering, partly in `.cursorrules`, and partly in "good example" pages.

## Scope

This spec applies to:

- full category rebuilds
- partial category rebuilds triggered by product replacement
- manual QA of generated category pages

Primary implementation files:

- `scripts/rebuild-category-pages.ts`
- `src/lib/category-page-handler.tsx`
- `src/app/(da)/kosttilskud/proteinpulver/page.mdx`
- `.cursorrules`

## Canonical reference page

`src/app/(da)/kosttilskud/proteinpulver/page.mdx` is the live reference page for the preferred category-page standard.

When this document and an older generated page disagree, follow this document and then bring the generator into line.

## Page anatomy

Every rebuilt category page should follow this high-level structure:

1. Frontmatter
2. Mobile toplist
3. Intro + desktop toplist
4. `<Toc />`
5. `Sammenfatning & toppval`
6. Product review sections in final ranked order
7. Comparison table
8. Method section
9. Buying guide
10. Benefits / usage
11. Caveats / before-you-buy
12. FAQ
13. Sources
14. `Læs også`
15. UGC / comments if part of the standard output
16. `SeoJsonLd`

## Frontmatter and hero standard

Hero output is rendered by `src/lib/category-page-handler.tsx`, but the visible page identity comes from frontmatter in the MDX file.

Required frontmatter fields:

- `title`
- `meta_title`
- `description`
- `date`
- `updated`
- `author`
- `category`
- `tags`
- `affiliate_disclosure`
- `slogan`

Canonical hero rules:

- `title` is the visible H1 and must be treated as stable identity.
- `slogan` is the visible tagline under the H1 and must be treated as stable identity.
- Breadcrumbs, H1 and slogan should not drift between rebuilds unless explicitly updated to a better canonical version.
- The preferred pattern follows the quality level of `proteinpulver`, not the older generic `"<keyword> bedst i test <year>"` fallback.

Preferred wording pattern:

- `title`: `"De bedste <keyword> <year> – <shownCount> produkter testet ..."`
- `meta_title`: `"Bedste <keyword> <year> - test af de <shownCount> bedste"`
- `description`: must reflect the actual shown product count
- `slogan`: `"Her er de bedste <keyword> <year> – <shownCount> produkter testet, der leverer mest kvalitet for pengene ifølge vores eksperter."`

## Ranking and award rules

These rules are hard requirements, not soft preferences.

Core visible order must always be:

1. `BEDST I TEST`
2. `BEDSTE PREMIUM`
3. `BEDSTE BUDGET`

This order must be reflected consistently in:

- mobile toplist
- desktop toplist
- `Sammenfatning & toppval`
- product section order
- comparison table row order
- JSON-LD `ItemList` positions

Interpretation:

- Award selection may use heuristics.
- Final visible ordering may be score-shaped to honor the award contract.
- No category-specific exception may move `BEDSTE BUDGET` below visible position `3`.

If a category cannot satisfy all three core awards credibly, the generator should fail loudly or be adjusted, not silently publish a conflicting order.

## Product title rules

Display titles must be clean and user-facing.

Required normalization:

- remove redundant quantity suffixes when they make the title clumsy
- remove incorrect brand prefixes
- keep genuine brand names when they are truly part of the product identity
- avoid awkward marketplace-style titles

Examples:

- prefer concise product names over `"12 x Star Nutrition Protein Bar"`-style ecommerce naming when a cleaner title is clearly better
- avoid titles like `"Body science Delight Bar, 50 gram"` if the quantity is not needed in the visible title

## CTA and store-label rules

CTA standard across category pages:

- button text must be exactly `Til butik`
- buttons must never be underlined in any state

Small toplists:

- no brand line
- no price line
- score above the CTA
- CTA aligned to the right
- text column wider than old compact layout
- do not show store label under the button

Full product cards:

- keep the store label below the CTA as small grey helper text
- store label is presentation-only and must not be merged into the button text

## Product cards and images

Each product section should contain:

- one primary product image / packshot area
- one optional test image in the review body when available
- cleaned award badge
- panel scores / rating bars
- CTA area
- quick facts / comparison-relevant data
- narrative review text grounded in practical use

Do not render extra duplicate "overview" and "detail" images below the product card unless a future spec explicitly changes this.

## Dynamic count rules

Intro and metadata text must reflect actual shown products.

Required consistency:

- if 5 products are shown, copy must say `5`
- count should not drift between `description`, `slogan`, intro copy and comparison-table framing

`testedCount` may differ from `shownCount`, but that distinction must be intentional and defensible.

## Internal links

Internal links should be present in:

- intro content where natural
- product review body copy where natural
- relevant informational sections
- `Læs også`

Guardrail:

- internal-link insertion must never modify YAML frontmatter
- product review paragraphs should also receive natural inline links when a relevant target page exists
- product links are part of the canonical standard, not an optional extra
- max 1 in-content link per target subpage under `/protein-traening/` on a given category page, regardless of destination topic
- this limit applies generically to all target subpages such as `proteinpulver`, `pwo`, `betain`, etc.
- `Læs også` cards are exempt from the duplicate-target rule
- internal links inside product-content `<p>` tags are allowed when natural

## Non-product sections

Canonical non-product section set:

- intro
- method
- buyers guide
- benefits / usage
- caveats / before-you-buy
- FAQ
- sources

If a category is missing generated sections, the rebuild pipeline should generate them before publishing the page.

## Rebuild modes

### Full rebuild

Use when the whole page should be refreshed to the latest standard.

Expected behavior:

- product-linked sections may change
- existing intro and non-product sections should be preserved when they already match the canonical standard
- existing images and infographics should be preserved when they already exist and are correct
- regenerate only missing, invalid or non-compliant sections/assets
- every active product on the page must have verified parsed source data behind it; if crawled/raw product data is missing, stale, or too thin to support a compliant review, the product must be recrawled/reparsed before the page can be marked complete
- page should end in full canonical structure

### Targeted replacement / preserve rebuild

Use for `/admin/404` or any single-slot product swap.

Hard rules:

- preserve slug/slot identity on the category page
- preserve rank/order of all unaffected products
- update only product-linked sections
- preserve intro, buying guide, FAQ and other non-product content
- use `scripts/rebuild-category-pages.ts --preserve-non-product-content`

### Preserve-if-compliant standard

This is the default expectation for reruns, not an optional nice-to-have.

- if an existing category intro already follows the correct template, keep it
- if existing non-product sections already follow the canonical structure, keep them
- if an existing product review block is already substantive and compliant, keep it
- if a required section is missing, structurally wrong, placeholder-like or otherwise non-compliant, regenerate it
- if an image/test image/infographic already exists and is correct, reuse it instead of generating a new one
- `--force` style behavior should only be used when explicit regeneration is intended

## Source-of-truth ownership

Use these ownership rules when debugging rebuild output:

- layout generation: `scripts/rebuild-category-pages.ts`
- runtime hero/breadcrumb rendering: `src/lib/category-page-handler.tsx`
- canonical live example: `src/app/(da)/kosttilskud/proteinpulver/page.mdx`
- persistent project guardrails: `.cursorrules`

## Rebuild QA checklist

After every substantive category rebuild, verify all of the following:

1. Parsed product source data
- every active product slug on the page has real parsed/crawled product data or equivalent verified raw source backing it
- every active product file must carry the matching `source_url`, `source_store` and `source_crawled_at` in frontmatter before content generation or rebuild sign-off
- a product review is never accepted as correct purely because the rendered page looks plausible
- if a product lacks verified parsed source data, the page is not `klar` and the product must be reparsed or replaced before sign-off
- if important source facts are missing from the written review, treat that as a content failure even if layout QA passes

2. Frontmatter
- H1/title matches the canonical quality level
- `meta_title`, `description` and `slogan` reflect the shown product count

3. Ranking contract
- visible position `1` is `BEDST I TEST`
- visible position `2` is `BEDSTE PREMIUM`
- visible position `3` is `BEDSTE BUDGET`
- any non-core/special award must start at visible position `4` or later
- same order appears in toplists, summary, product anchors, comparison table and JSON-LD

4. Small toplist
- no brand line
- no price line
- no underlined buttons
- score above button
- button right-aligned

5. Product cards
- store label appears below CTA
- no duplicated extra image blocks
- quick facts use sane, user-facing values
- no store-wide trustpilot ratings in product review content

6. Sections
- `Toc` exists
- method exists
- buyers guide exists
- benefits exists
- caveats exists
- FAQ exists
- sources exists
- `Læs også` exists

7. Internal linking
- inline internal links exist where natural
- frontmatter is untouched
- no target subpage is linked more than once in the in-content body of the same page
- `Læs også` may repeat a target that is already linked earlier in the page

8. Targeted replacement safety
- preserved non-product content stayed intact
- only affected product-linked sections changed

## Suggested verification command

Use the verification helper after rebuilds:

```bash
npx tsx scripts/verify-category-page-output.ts <category-slug>
```

This helper should be treated as a regression guard, not as a replacement for visual QA in the browser.
