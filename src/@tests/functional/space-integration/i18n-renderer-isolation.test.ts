import { assert, assertEquals, assertStringIncludes } from '@std/assert'
import { dirname, join } from '@std/path'
import {
  buildSpaceImportMap,
  OWN_INTL_ROOT,
  SPACE_ROOT,
  writeImportMap,
} from './space-import-map.ts'

/**
 * The i18n-formatting extension of `space`'s own `renderer-isolation.test.ts` claim: a REAL Preact
 * SSR render, in a real process, using this package's `IntlProvider`/`useIntl`/`formatMessage` —
 * where `react` and `react-dom/server` cannot be evaluated at all — and the symmetric case for
 * React. Same technique, same reasoning, extended with the one thing `space`'s own
 * `renderer-isolation.test.ts` doesn't exercise: a real i18n formatter consuming a mixed (plain
 * string + precompiled AST) catalog while the OTHER renderer stays poisoned.
 *
 * The sibling `i18n-pipeline-e2e.test.ts` already proves CORRECTNESS (the formatted output is
 * right, on both renderers, via `DocumentSemantics`); this file proves EXCLUSIVITY (the other
 * renderer is never touched) — the two are deliberately different claims, checked differently, not
 * the same test duplicated.
 *
 * Runs each render as a real SUBPROCESS `deno test` invocation (via `runIsolated`), with
 * `@zanix/space`'s own `deno.jsonc` as `--config` and `cwd`, plus `./space-import-map.ts`'s
 * ephemeral map — with ONE renderer's real packages redirected to a poison module that fails loudly
 * if ever evaluated (`poison-renderer.ts`, copied into the temp dir alongside the generated
 * script). This package's own `intl`/`intl/preact` are reached inside the generated script via an
 * ABSOLUTE path built from `OWN_INTL_ROOT` — never `@zanix/space-ui/intl` (that only ever resolves
 * through an import-map entry neither project's own checked-in config should declare) and never a
 * plain relative import either (the generated script is written to an ephemeral temp directory
 * outside this repo, so a relative import wouldn't reach this package's own `src/intl/` at all).
 *
 * @module
 */

/** `space-import-map.ts`'s own map, with one renderer's packages redirected to a poison module that
 * fails loudly (throws/logs `POISONED RENDERER EVALUATED`) if ever actually evaluated. */
async function poisonedImportMap(poison: 'react' | 'preact'): Promise<string> {
  const overrides: Record<string, string> = {}
  const poisonUrl = join(SPACE_ROOT, 'src/@tests/support/poison-renderer.ts')
  const targets = poison === 'react'
    ? ['react', 'react-dom', 'react-dom/server', 'react-dom/client', 'react/jsx-runtime']
    : ['preact', 'preact-render-to-string', 'preact/hooks', 'preact/jsx-runtime']
  for (const specifier of targets) overrides[specifier] = poisonUrl

  const imports = await buildSpaceImportMap(overrides)
  return writeImportMap(imports, 'space-ui-i18n-renderer-isolation-')
}

async function runIsolated(
  poison: 'react' | 'preact',
  script: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const mapPath = await poisonedImportMap(poison)
  // Written alongside the ephemeral import map's own temp dir, never inside either repo's own
  // `src/@tests/` tree — so this never risks racing an outer `deno test` run's own directory-scan
  // discovery the way a same-tree `__tmp__` file could.
  const scriptPath = join(dirname(mapPath), `i18n-isolation-${poison}.ts`)
  await Deno.writeTextFile(scriptPath, script)
  try {
    const { code, stdout, stderr } = await new Deno.Command(Deno.execPath(), {
      args: [
        'test',
        '--allow-all',
        '--no-check',
        '--min-dep-age=0',
        '--config',
        join(SPACE_ROOT, 'deno.jsonc'),
        `--import-map=${mapPath}`,
        scriptPath,
      ],
      cwd: SPACE_ROOT,
      stdin: 'null',
      stdout: 'piped',
      stderr: 'piped',
    }).output()
    return {
      code,
      stdout: new TextDecoder().decode(stdout),
      stderr: new TextDecoder().decode(stderr),
    }
  } finally {
    await Deno.remove(scriptPath).catch(() => {})
  }
}

/** A complete Preact SSR render using the real i18n formatter, with `react` poisoned. */
const PREACT_SSR_I18N = `
import { createElement } from 'preact'
import { parse } from '@formatjs/icu-messageformat-parser'
import { IntlProvider, useIntl } from '${OWN_INTL_ROOT}index.preact.ts'
import '${SPACE_ROOT}mod-preact.ts'
import { SpacePageController } from 'modules/router/mod.ts'
import { setPageTree } from 'modules/router/page-tree-registry.ts'
import { setActiveRenderer } from 'modules/router/active-renderer.ts'
import { getPageRenderer } from 'modules/router/page-renderer-registry.ts'
import { mockPageContext } from 'modules/testing/mod.ts'

setActiveRenderer('preact')

const messages = {
  'home/greet': 'Hello, {name}!',
  'home/cart': parse('{count, plural, one {# item} other {# items}}'),
}

function Inner() {
  const { formatMessage } = useIntl()
  return createElement('main', null,
    createElement('h1', null, formatMessage('home/greet', { name: 'Ada' })),
    createElement('p', null, formatMessage('home/cart', { count: 3 })),
  )
}
function View() {
  return createElement(IntlProvider, { locale: 'en', messages }, createElement(Inner, null))
}

class HomePage extends SpacePageController {
  component = View
  static head = { title: 'Isolated Preact i18n' }
}
setPageTree(HomePage, { filePath: '/routes/page.tsx', segments: [{}] })

Deno.test('preact i18n ssr under a poisoned react', async () => {
  const response = await getPageRenderer()(
    HomePage, View, mockPageContext({}), undefined, false, undefined, undefined,
  )
  const html = await response.text()
  console.log('__RESULT__' + JSON.stringify({ status: response.status, html }))
})
`

/** The mirror image: a complete React SSR render using the real i18n formatter, with `preact`
 * poisoned. */
const REACT_SSR_I18N = `
import { createElement } from 'react'
import { parse } from '@formatjs/icu-messageformat-parser'
import { IntlProvider, useIntl } from '${OWN_INTL_ROOT}index.ts'
import '${SPACE_ROOT}mod-react.ts'
import { SpacePageController } from 'modules/router/mod.ts'
import { setPageTree } from 'modules/router/page-tree-registry.ts'
import { setActiveRenderer } from 'modules/router/active-renderer.ts'
import { getPageRenderer } from 'modules/router/page-renderer-registry.ts'
import { mockPageContext } from 'modules/testing/mod.ts'

setActiveRenderer('react')

const messages = {
  'home/greet': 'Hello, {name}!',
  'home/cart': parse('{count, plural, one {# item} other {# items}}'),
}

function Inner() {
  const { formatMessage } = useIntl()
  return createElement('main', null,
    createElement('h1', null, formatMessage('home/greet', { name: 'Ada' })),
    createElement('p', null, formatMessage('home/cart', { count: 3 })),
  )
}
function View() {
  return createElement(IntlProvider, { locale: 'en', messages }, createElement(Inner))
}

class HomePage extends SpacePageController {
  component = View
  static head = { title: 'Isolated React i18n' }
}
setPageTree(HomePage, { filePath: '/routes/page.tsx', segments: [{}] })

Deno.test('react i18n ssr under a poisoned preact', async () => {
  const response = await getPageRenderer()(
    HomePage, View, mockPageContext({}), undefined, false, undefined, undefined,
  )
  const html = await response.text()
  console.log('__RESULT__' + JSON.stringify({ status: response.status, html }))
})
`

function resultOf(stdout: string): { status: number; html: string } {
  const line = stdout.split('\n').find((l) => l.includes('__RESULT__'))
  if (!line) throw new Error(`no result line in subprocess output:\n${stdout}`)
  return JSON.parse(line.slice(line.indexOf('__RESULT__') + '__RESULT__'.length))
}

Deno.test(
  'i18n renderer isolation: a Preact app using IntlProvider/useIntl/formatMessage (with a mixed ' +
    'string+AST catalog) renders a full SSR document with `react`/`react-dom/server` POISONED — ' +
    'the i18n formatter never evaluates React',
  async () => {
    const { code, stdout, stderr } = await runIsolated('react', PREACT_SSR_I18N)

    assertEquals(code, 0, `Preact i18n SSR failed under a poisoned React:\n${stdout}\n${stderr}`)
    assert(
      !stderr.includes('POISONED RENDERER EVALUATED'),
      `React was evaluated during a Preact i18n render:\n${stderr}`,
    )

    const { status, html } = resultOf(stdout)
    assertEquals(status, 200)
    assertStringIncludes(html, '<!doctype html>')
    assertStringIncludes(html, '<title>Isolated Preact i18n</title>')
    // The interpolation AND the precompiled-AST plural both resolved correctly — not an empty
    // shell that would pass the isolation check vacuously.
    assertStringIncludes(html, 'Hello, Ada!')
    assertStringIncludes(html, '3 items')
  },
)

Deno.test(
  'i18n renderer isolation: the symmetric case — a React app using the SAME i18n formatter ' +
    'contract renders a full SSR document with `preact`/`preact-render-to-string` POISONED',
  async () => {
    const { code, stdout, stderr } = await runIsolated('preact', REACT_SSR_I18N)

    assertEquals(code, 0, `React i18n SSR failed under a poisoned Preact:\n${stdout}\n${stderr}`)
    assert(
      !`${stdout}${stderr}`.includes('POISONED RENDERER EVALUATED'),
      `Preact was evaluated during a React i18n render:\n${stdout}\n${stderr}`,
    )

    const { status, html } = resultOf(stdout)
    assertEquals(status, 200)
    assertStringIncludes(html, '<title>Isolated React i18n</title>')
    assertStringIncludes(html, 'Hello, Ada!')
    assertStringIncludes(html, '3 items')
  },
)
