import { assert, assertEquals } from '@std/assert'
import { CATALOG_VIEWBOX } from 'components/CatalogIcon/types.ts'

/**
 * Integrity/drift guard between three things that must always agree: `CatalogIconName` (the
 * compile-time contract), `CATALOG_VIEWBOX` (its runtime companion), and the real, committed
 * `src/templates/shared/icons/catalog.svg` asset. None of these is generated from another
 * automatically today — this test is what catches the three drifting apart, the same kind of
 * check the Styling Proposal's §07 "chequeo de drift" already called for.
 *
 * Deliberately reads the real file from disk rather than importing it — `catalog.svg` is a
 * template asset, never part of this package's runtime module graph (see `NOTICE.md`, same
 * directory), so nothing here should ever appear in `mod.ts`'s own import chain.
 *
 * @module
 */

const CATALOG_SVG_PATH = new URL(
  '../../../templates/shared/icons/catalog.svg',
  import.meta.url,
)

// Known Zanix/legacy brand & social ids (see the Styling Proposal §5B's inventory of the legacy
// `base.svg`) — none of these may ever appear in the default catalog, by design.
const BRAND_IDS = [
  'google',
  'facebook',
  'facebook-f',
  'linkedin',
  'linkedin-in',
  'x-twitter',
  'tiktok',
  'whatsapp',
  'instagram',
  'apple',
  'amazon',
  'paypal',
  'youtube',
  'pinterest',
  'slack',
  'font-awesome',
]

function readCatalogSvg(): string {
  return Deno.readTextFileSync(CATALOG_SVG_PATH)
}

function extractSymbols(svg: string): { id: string; viewBox: string }[] {
  const symbols: { id: string; viewBox: string }[] = []
  const re = /<symbol id="([^"]+)" viewBox="([^"]+)">/g
  let m: RegExpExecArray | null
  while ((m = re.exec(svg))) {
    symbols.push({ id: m[1], viewBox: m[2] })
  }
  return symbols
}

Deno.test('catalog.svg: exists and is well-formed enough to extract symbols from', () => {
  const svg = readCatalogSvg()
  assert(svg.startsWith('<svg'), 'catalog.svg must start with <svg')
  assert(svg.includes('</svg>'), 'catalog.svg must be a closed document')
})

Deno.test('catalog.svg: exactly one <symbol> per CatalogIconName, no more, no fewer', () => {
  const svg = readCatalogSvg()
  const symbolIds = extractSymbols(svg).map((s) => s.id)
  const expectedNames = Object.keys(CATALOG_VIEWBOX).sort()

  assertEquals(symbolIds.length, expectedNames.length, 'symbol count must match CATALOG_VIEWBOX')
  assertEquals(
    [...symbolIds].sort(),
    expectedNames,
    'every <symbol id> must correspond 1:1 to a CatalogIconName — no orphan symbol, no missing one',
  )
})

Deno.test('catalog.svg: every symbol id is a valid CatalogIconName — no unknown id', () => {
  const svg = readCatalogSvg()
  const known = new Set(Object.keys(CATALOG_VIEWBOX))

  for (const { id } of extractSymbols(svg)) {
    assert(known.has(id), `<symbol id="${id}"> is not a declared CatalogIconName`)
  }
})

Deno.test('catalog.svg: each symbol real viewBox matches CATALOG_VIEWBOX exactly', () => {
  const svg = readCatalogSvg()
  const symbols = extractSymbols(svg)

  assert(symbols.length > 0, 'no symbols were parsed — regex or file path likely wrong')

  for (const { id, viewBox } of symbols) {
    assertEquals(
      viewBox,
      CATALOG_VIEWBOX[id as keyof typeof CATALOG_VIEWBOX],
      `<symbol id="${id}">'s real viewBox must match CATALOG_VIEWBOX[${id}] — never normalized`,
    )
  }

  // The specific claim this whole catalog exists to prove false: NOT every icon shares one
  // viewBox. If this ever collapses to 1, something re-normalized the set — the exact mistake an
  // earlier draft of this proposal made and was corrected on.
  const distinctViewBoxes = new Set(symbols.map((s) => s.viewBox))
  assert(distinctViewBoxes.size > 1, 'catalog.svg must not normalize every icon to one viewBox')
})

Deno.test('catalog.svg: contains zero brand/social icons', () => {
  const svg = readCatalogSvg()
  const symbolIds = new Set(extractSymbols(svg).map((s) => s.id))

  for (const brandId of BRAND_IDS) {
    assert(!symbolIds.has(brandId), `brand/social icon "${brandId}" must never be in this catalog`)
  }
})

Deno.test('catalog.svg: is a small curated set, not the legacy 1446-symbol base.svg', () => {
  const svg = readCatalogSvg()
  const count = extractSymbols(svg).length

  assertEquals(count, 17, 'expected exactly the 17 approved icons — not the full legacy sprite')
  assert(count < 50, 'catalog.svg must stay a small curated set, never a full icon library')
})

Deno.test('catalog.svg: every path uses fill="currentColor", no hardcoded color', () => {
  const svg = readCatalogSvg()

  assert(!/#[0-9a-fA-F]{3,8}\b/.test(svg), 'catalog.svg must not hardcode any hex color')
  assert(!/\brgb\(/.test(svg), 'catalog.svg must not hardcode any rgb() color')
  const fillCount = (svg.match(/fill="currentColor"/g) ?? []).length
  assertEquals(fillCount, 17, 'every one of the 17 symbols must use fill="currentColor"')
})

Deno.test('catalog.svg: no external dependency — no script, no remote href/src target', () => {
  const svg = readCatalogSvg()

  assert(!svg.includes('<script'), 'catalog.svg must not contain a <script> element')
  assert(!/\bhref="https?:\/\//.test(svg), 'no element may reference an external URL via href')
  assert(!/\bsrc="https?:\/\//.test(svg), 'no element may reference an external URL via src')
  assert(!svg.includes('@import'), 'catalog.svg must not @import anything')
  // The only "http(s)://" strings allowed are the SVG namespace URI and the license/attribution
  // comment text — never a live resource reference.
  const urls = svg.match(/https?:\/\/[^"\s]*/g) ?? []
  for (const url of urls) {
    assert(
      url.startsWith('http://www.w3.org/2000/svg') || url.startsWith('https://fontawesome.com'),
      `unexpected external URL found in catalog.svg: ${url}`,
    )
  }
})

Deno.test('catalog.svg: usable via <use> — every symbol id is a valid fragment target', () => {
  const svg = readCatalogSvg()
  // A valid SVG fragment identifier target is any non-empty id without a leading digit issue for
  // CSS-selector use, and without whitespace — `Icon`'s own `<use href={`${href}#${name}`}>`
  // pattern needs exactly this.
  for (const { id } of extractSymbols(svg)) {
    assert(/^[a-z][a-z0-9-]*$/.test(id), `"${id}" is not a safe, simple fragment identifier`)
  }
})

Deno.test('catalog.svg: carries the required Font Awesome attribution comment, once', () => {
  const svg = readCatalogSvg()
  const occurrences = (svg.match(/Font Awesome Free 7\.3\.1 by @fontawesome/g) ?? []).length

  assertEquals(occurrences, 1, 'the attribution comment must be present exactly once')
  assert(svg.includes('CC BY 4.0'), 'the attribution comment must name the icon license')
})

Deno.test('NOTICE.md and LICENSES/ exist alongside catalog.svg', () => {
  const dir = new URL('../../../templates/shared/icons/', import.meta.url)

  const noticeStat = Deno.statSync(new URL('NOTICE.md', dir))
  const licenseStat = Deno.statSync(new URL('LICENSES/fontawesome-free-7.3.1.txt', dir))

  assert(noticeStat.isFile)
  assert(licenseStat.isFile)
})
