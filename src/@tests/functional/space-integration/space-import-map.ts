// deno-coverage-ignore-file

import { fromFileUrl, join } from '@std/path'

/**
 * Shared support for every test in this directory that needs to drive a real `@zanix/space`
 * render — never a test file itself (no `.test.ts` suffix, so `deno test`'s own glob never
 * discovers it).
 *
 * `space-ui` is the package genuinely allowed to depend downward on `space` (same direction
 * `Video`/`Image`/`RichText` already use for `assets-manifest`/`video-source`), so this is where
 * the coupling these integration tests need lives — built fresh per test run into an ephemeral
 * import map, never committed to either project's own checked-in config. This is the corrected,
 * one-way replacement for a coupling `space` itself used to own (a prior revision of its own
 * `deno.jsonc` declared `@zanix/space-ui/intl` as a committed, TEST-ONLY entry — a real circular
 * DECLARATION between the two sibling packages regardless of it never reaching either's PUBLISHED
 * graph).
 *
 * @module
 */

/** Absolute path to the sibling `@zanix/space` repo's own root. */
export const SPACE_ROOT: string = fromFileUrl(import.meta.resolve('../../../../../space/'))

/** Absolute path to THIS package's own `src/intl/` — reached via a plain relative import from any
 * fixture that physically lives inside this repo, or via this absolute path from a generated
 * script written to an ephemeral temp file elsewhere (a relative import wouldn't resolve from
 * there). Never through the external `@zanix/space-ui/intl` package specifier: that only ever
 * resolves through an import-map entry this package's own checked-in config doesn't (and
 * shouldn't) declare. */
export const OWN_INTL_ROOT: string = fromFileUrl(import.meta.resolve('../../../intl/'))

/**
 * `space`'s own real import map, read fresh from its checked-in `deno.jsonc`, with a few extra
 * runtime subpaths it doesn't itself declare layered on top — `@formatjs/intl`/
 * `@formatjs/icu-messageformat-parser` (this package's own `intl` module's real runtime deps,
 * reached via a plain relative/absolute import, never a `@zanix/space-ui/...` map entry), a
 * `space-test-support/` alias into `space`'s own `src/@tests/support/`, and the JSX-runtime/SSR/
 * hooks subpaths `space`'s own map never declares bare `react`/`preact` for. `overrides` is
 * applied last — e.g. a renderer-poisoning entry that must win over anything above.
 */
export async function buildSpaceImportMap(
  overrides: Record<string, string> = {},
): Promise<Record<string, string>> {
  const raw = await Deno.readTextFile(join(SPACE_ROOT, 'deno.jsonc'))
  const config = JSON.parse(raw.replace(/(^|\s)\/\/[^\n]*/g, '')) as {
    imports: Record<string, string>
  }
  const imports = { ...config.imports }
  for (const [key, value] of Object.entries(imports)) {
    if (value.startsWith('./') || value.startsWith('../')) {
      imports[key] = join(SPACE_ROOT, value) + (value.endsWith('/') ? '/' : '')
    }
  }
  imports['@formatjs/intl'] = 'npm:@formatjs/intl@^4.1.19'
  imports['@formatjs/icu-messageformat-parser'] = 'npm:@formatjs/icu-messageformat-parser@^3.5.17'
  imports['space-test-support/'] = join(SPACE_ROOT, 'src/@tests/support') + '/'
  imports['react/jsx-runtime'] = 'npm:react@^19.2.0/jsx-runtime'
  imports['react-dom/server'] = 'npm:react-dom@^19.2.0/server'
  imports['react-dom/client'] = 'npm:react-dom@^19.2.0/client'
  imports['preact/jsx-runtime'] = 'npm:preact@^10.29.0/jsx-runtime'
  imports['preact/hooks'] = 'npm:preact@^10.29.0/hooks'
  return { ...imports, ...overrides }
}

/** Writes `imports` to a fresh temp file as a real Deno import-map JSON document, returning its
 * path. `prefix` names the temp dir for easier debugging when one is left behind. */
export async function writeImportMap(
  imports: Record<string, string>,
  prefix: string,
): Promise<string> {
  const dir = await Deno.makeTempDir({ prefix })
  const path = join(dir, 'import-map.json')
  await Deno.writeTextFile(path, JSON.stringify({ imports }, null, 2))
  return path
}
