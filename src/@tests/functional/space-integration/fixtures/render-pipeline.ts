// deno-coverage-ignore-file

// `console.error`/`console.log` are this fixture's only channel back to its own parent test
// process (`__RESULT__` on stdout; FormatJS's own internal noise silenced on stderr) — there is no
// `@zanix/logger` sink to read from across a real subprocess boundary, same reasoning `space`'s own
// benchmark/inspection scripts under `src/@tests/benchmarks/` already ignore this rule for.

// Real end-to-end render-pipeline fixture — never imported directly (no `.test.ts` suffix, so
// `deno test`'s own glob never discovers it as a test file). Invoked as a SUBPROCESS by the sibling
// `../i18n-pipeline-e2e.test.ts`, with `@zanix/space`'s own real `deno.jsonc` passed as `--config`
// and an ephemeral import map (built at test-run time, never committed anywhere) layering a few
// extra runtime subpaths — `@formatjs/intl`, `@formatjs/icu-messageformat-parser`, and a
// `space-test-support/` alias into `space`'s `src/@tests/support/` — on top. This package's own
// `intl`/`intl/preact` modules are reached via a plain relative import below instead (this fixture
// lives inside this package's own repo), so no map entry is needed for those at all.
import { createElement as reactCreateElement } from 'react'
import { createElement as preactCreateElement } from 'preact'
import { join } from '@std/path'
import { parse } from '@formatjs/icu-messageformat-parser'
// A plain relative import, not `@zanix/space-ui/intl` — this fixture lives INSIDE this package's
// own repo, so reaching its own sibling `intl/` module through the external package-style
// specifier was pure indirection (it only ever resolved through the ephemeral import map below);
// a real in-repo import needs no map entry for it at all.
import { IntlProvider as ReactIntlProvider, useIntl as useReactIntl } from '../../../../intl/index.ts'
import {
  IntlProvider as PreactIntlProvider,
  useIntl as usePreactIntl,
} from '../../../../intl/index.preact.ts'
import { loadMessages } from 'modules/i18n/load-messages.ts'
import { resetMessagesDir, setMessagesDir } from 'modules/i18n/messages-registry.ts'
import { SpacePageController } from 'modules/router/mod.ts'
import { setPageTree } from 'modules/router/page-tree-registry.ts'
import { mockPageContext } from 'modules/testing/mod.ts'
import { extractDocumentSemantics } from 'modules/render/document-semantics.ts'
import { comparableSemantics } from 'space-test-support/document-parity.ts'
import { renderPageResponse as renderReact } from 'modules/router/render-page-react.tsx'
import { renderPageResponse as renderPreact } from 'modules/router/render-page-preact.ts'

console.error = () => {}

async function buildMixedCatalog(dir: string): Promise<void> {
  await Deno.mkdir(join(dir, 'en'), { recursive: true })
  await Deno.writeTextFile(
    join(dir, 'en', 'index.json'),
    JSON.stringify({
      // Plain — not yet compiled.
      'home/title': 'Welcome',
      'home/greet': 'Hello, {name}!',
      // Precompiled — a real AST, mixed into the SAME catalog as the two plain values above,
      // proving `space-ui`'s formatter consumes it correctly through a real SSR render, not just a
      // unit-level `createFormatter()` call.
      'home/cart': parse('{count, plural, one {# item} other {# items}}'),
    }),
  )
}

function ReactInner() {
  const { formatMessage } = useReactIntl()
  return reactCreateElement(
    'main',
    null,
    reactCreateElement('h1', null, formatMessage('home/title')),
    reactCreateElement(
      'p',
      { 'data-testid': 'greet' },
      formatMessage('home/greet', { name: 'Ada' }),
    ),
    reactCreateElement('p', { 'data-testid': 'cart' }, formatMessage('home/cart', { count: 3 })),
  )
}

function PreactInner() {
  const { formatMessage } = usePreactIntl()
  return preactCreateElement(
    'main',
    null,
    preactCreateElement('h1', null, formatMessage('home/title')),
    preactCreateElement(
      'p',
      { 'data-testid': 'greet' },
      formatMessage('home/greet', { name: 'Ada' }),
    ),
    preactCreateElement('p', { 'data-testid': 'cart' }, formatMessage('home/cart', { count: 3 })),
  )
}

async function renderPipeline(
  renderer: 'react' | 'preact',
): Promise<{ semantics: ReturnType<typeof extractDocumentSemantics>; html: string }> {
  const messages = await loadMessages({ lang: 'en' })

  const View = renderer === 'react'
    ? () =>
      reactCreateElement(
        ReactIntlProvider,
        { locale: 'en', messages },
        reactCreateElement(ReactInner),
      )
    : () =>
      preactCreateElement(
        PreactIntlProvider,
        { locale: 'en', messages },
        preactCreateElement(PreactInner, null),
      )

  class Page extends SpacePageController {
    public override component = View
    public static override head = { title: 'i18n E2E' }
  }
  setPageTree(Page as never, { filePath: `/fake/i18n-e2e-${renderer}.tsx`, segments: [{}] })

  const pageCtx = mockPageContext({ url: new URL('https://example.com/en/i18n-e2e') })
  const render = renderer === 'react' ? renderReact : renderPreact
  const response = await render(
    Page as never,
    View,
    pageCtx,
    undefined,
    false,
    undefined,
    undefined,
  )
  const html = await response.text()
  return { semantics: extractDocumentSemantics(html), html }
}

async function main() {
  const dir = await Deno.makeTempDir({ prefix: 'space-ui-i18n-e2e-fixture-' })
  try {
    await buildMixedCatalog(dir)
    setMessagesDir(dir)

    const react = await renderPipeline('react')
    const preact = await renderPipeline('preact')

    console.log(
      '__RESULT__' + JSON.stringify({
        reactHtml: react.html,
        preactHtml: preact.html,
        reactSemantics: comparableSemantics(react.semantics),
        preactSemantics: comparableSemantics(preact.semantics),
        reactHasTextContent: react.semantics.hasTextContent,
        preactHasTextContent: preact.semantics.hasTextContent,
      }),
    )
  } finally {
    resetMessagesDir()
    await Deno.remove(dir, { recursive: true })
  }
}

await main()
// `renderToReadableStream`'s own React 19 machinery leaves something on the event loop that never
// drains on its own (confirmed empirically — the process sat alive, doing nothing more, long after
// printing its real, correct `__RESULT__` line) — an explicit exit is needed so the parent test's
// own `Deno.Command(...).output()` (which waits for real process exit, not just stdout closing)
// resolves instead of hanging forever.
Deno.exit(0)
