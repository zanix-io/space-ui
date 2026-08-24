import { assertEquals, assertStringIncludes } from '@std/assert'
import { fromFileUrl, join } from '@std/path'
import { buildSpaceImportMap, SPACE_ROOT, writeImportMap } from './space-import-map.ts'

/**
 * The full pipeline this feature exists to prove, end to end, for real:
 *
 *   source ICU JSON (mixed: a plain string + a real precompiled AST)
 *     → `@zanix/space`'s own `loadMessages()` (completely opaque to either shape)
 *     → this package's `IntlProvider`/`useIntl`/`formatMessage` (React AND Preact, independent
 *       bindings)
 *     → a real SSR render through `@zanix/space`'s own real page renderer
 *
 * Runs `render-pipeline.ts` — a real, checked-in fixture — as a SUBPROCESS, with `@zanix/space`'s
 * own `deno.jsonc` as `--config` and `cwd`, plus the ephemeral import map `./space-import-map.ts`
 * builds (see that module's own doc for the full reasoning — shared with the sibling
 * `i18n-renderer-isolation.test.ts`). The fixture reaches THIS package's own `intl` module via a
 * plain relative import, not a package specifier — it lives inside this repo, so no map entry is
 * needed for that part at all.
 *
 * Renderer parity is asserted via `space`'s own `DocumentSemantics`/`comparableSemantics` — never a
 * raw HTML string diff, which would fail on meaningless differences (attribute order, void-element
 * closing) between `react-dom/server` and `preact-render-to-string`. The actual FORMATTED TEXT
 * (interpolation, plural, mixed-catalog resolution) is checked separately, per renderer, via
 * `assertStringIncludes` on each render's own HTML.
 *
 * @module
 */

const FIXTURE = fromFileUrl(import.meta.resolve('./fixtures/render-pipeline.ts'))

type FixtureResult = {
  reactHtml: string
  preactHtml: string
  reactSemantics: Record<string, unknown>
  preactSemantics: Record<string, unknown>
  reactHasTextContent: boolean
  preactHasTextContent: boolean
}

function resultOf(stdout: string): FixtureResult {
  const line = stdout.split('\n').find((l) => l.includes('__RESULT__'))
  if (!line) throw new Error(`no result line in subprocess output:\n${stdout}`)
  return JSON.parse(line.slice(line.indexOf('__RESULT__') + '__RESULT__'.length))
}

async function runFixture(): Promise<FixtureResult> {
  const imports = await buildSpaceImportMap()
  const mapPath = await writeImportMap(imports, 'space-ui-i18n-e2e-')
  const { code, stdout, stderr } = await new Deno.Command(Deno.execPath(), {
    args: [
      'run',
      '--allow-all',
      '--no-check',
      '--min-dep-age=0',
      '--config',
      join(SPACE_ROOT, 'deno.jsonc'),
      `--import-map=${mapPath}`,
      FIXTURE,
    ],
    cwd: SPACE_ROOT,
    stdin: 'null',
    stdout: 'piped',
    stderr: 'piped',
  }).output()

  const decoded = {
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
  }
  if (code !== 0) {
    throw new Error(`render-pipeline.ts failed:\n${decoded.stdout}\n${decoded.stderr}`)
  }
  return resultOf(decoded.stdout)
}

let cached: Promise<FixtureResult> | undefined
/** Both content-correctness assertions and the parity assertion drive the SAME real subprocess
 * render — spawning it twice per test run would only slow the suite down, never change what's
 * being proven. */
function fixture(): Promise<FixtureResult> {
  return cached ??= runFixture()
}

// --- content correctness, per renderer -----------------------------------------------------------

Deno.test(
  'space integration (react): a plain message, interpolation, an ICU plural, and a precompiled-AST ' +
    'value from the SAME mixed catalog all format correctly through a real space SSR render',
  async () => {
    const { reactHtml } = await fixture()
    assertStringIncludes(reactHtml, '<h1>Welcome</h1>')
    assertStringIncludes(reactHtml, 'Hello, Ada!')
    assertStringIncludes(reactHtml, '3 items')
  },
)

Deno.test(
  "space integration (preact): the identical mixed catalog formats identically through Preact's " +
    'own real space SSR render',
  async () => {
    const { preactHtml } = await fixture()
    assertStringIncludes(preactHtml, '<h1>Welcome</h1>')
    assertStringIncludes(preactHtml, 'Hello, Ada!')
    assertStringIncludes(preactHtml, '3 items')
  },
)

// --- renderer parity, via space's own DocumentSemantics — never a raw HTML string diff ------------

Deno.test(
  'space integration: React and Preact produce a document-level-equivalent document for the exact ' +
    'same fixture — compared via DocumentSemantics, not HTML strings',
  async () => {
    const result = await fixture()
    assertEquals(result.reactSemantics, result.preactSemantics)
    // Both real renders, not an empty shell that would pass this comparison vacuously.
    assertEquals(result.reactHasTextContent, true)
    assertEquals(result.preactHasTextContent, true)
  },
)
