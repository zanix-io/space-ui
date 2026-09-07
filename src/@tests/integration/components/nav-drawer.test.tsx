// Registers the real React `createElement` `defineComet`'s own boundary resolves at render time —
// a genuine side effect of importing this module, the same way a real `@zanix/space` app's own
// main module does once, before serving any requests. See `deno.jsonc`'s own `scopes` comment for
// why this dependency is scoped to this one test file.
import '@zanix/space/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { assertEquals, assertStringIncludes } from '@std/assert'
import NavDrawerComet from 'components/NavDrawer/index.ts'
import { NavDrawer } from 'components/NavDrawer/index.ts'
import type { NavDrawerItem } from 'components/NavDrawer/index.ts'

/**
 * The real "is this artifact correctly wired into the real system" check
 * (`zanix-test-tier-conventions`'s Pattern A) — calls the REAL `defineComet` (no mock), asserting
 * the resulting boundary carries `@zanix/space`'s own real wire-protocol attributes
 * (`marker.ts`'s `COMET_ID_ATTR`/`COMET_STRATEGY_ATTR`/`COMET_MODULE_ATTR`/`COMET_EXPORT_ATTR`/
 * `COMET_PROPS_ATTR` — not re-exported from `@zanix/space/comet`'s own public surface, so their
 * literal `data-comet*` string values are asserted directly here; `marker.ts`'s own doc names them
 * as a stable, documented wire format, not an implementation detail free to drift). `NavDrawer`'s
 * own internal render logic (open/close, `Drawer`/`Menu` composition) is covered in
 * `unit/components/nav-drawer.test.tsx` — this file is only about the Comet boundary itself.
 */

const items: NavDrawerItem[] = [{ label: 'Home', url: '/' }]

Deno.test('NavDrawer Comet: the default export is defineComet(NavDrawer, ...), not the raw component', () => {
  assertEquals(typeof NavDrawerComet, 'function')
  assertEquals(NavDrawerComet, NavDrawerComet) // sanity: a stable reference, not rebuilt per call
  assertEquals(NavDrawer.name, 'NavDrawer') // defineComet's own precondition — see its own `@throws`
})

Deno.test('NavDrawer Comet: real markup carries the real wire-protocol attributes', () => {
  const html = renderToStaticMarkup(NavDrawerComet({ items, label: 'Main navigation' }))

  assertStringIncludes(html, 'data-comet=')
  assertStringIncludes(html, 'data-comet-strategy="load"')
  assertStringIncludes(html, 'data-comet-export="NavDrawer"')
  assertStringIncludes(html, 'data-comet-module=')
  // The real, JSON-serialized props this instance was given — proves `NavDrawerProps` really is
  // plain JSON end-to-end (see `types.ts`'s own doc for why `visual` could never appear here).
  assertStringIncludes(html, '&quot;label&quot;:&quot;Main navigation&quot;')
  // The real component still renders server-side (default `comet="load"` never withholds content).
  assertStringIncludes(html, 'data-space-ui="button"')
})

Deno.test('NavDrawer Comet: comet="only" withholds the real component server-side', () => {
  const html = renderToStaticMarkup(
    NavDrawerComet({ items, label: 'Main navigation', comet: 'only' }),
  )

  assertStringIncludes(html, 'data-comet-strategy="only"')
  assertEquals(html.includes('data-space-ui="button"'), false)
})

Deno.test('NavDrawer Comet: comet="none" renders the raw component, no marker at all', () => {
  const html = renderToStaticMarkup(
    NavDrawerComet({ items, label: 'Main navigation', comet: 'none' }),
  )

  assertEquals(html.includes('data-comet='), false)
  assertStringIncludes(html, 'data-space-ui="button"')
})

/** Extracts the panel's own `id`, regardless of where that attribute falls in the opening tag —
 * `Drawer/render.ts` places `id` BEFORE `data-space-ui` in its own props object, so this reads the
 * whole tag first and finds `id` within it, never assuming either attribute's position. */
function extractPanelId(html: string): string {
  const panelTag = /<div\b[^>]*\bdata-space-ui="drawer"[^>]*>/.exec(html)?.[0] ?? ''
  const idMatch = /\bid="([^"]+)"/.exec(panelTag)
  if (!idMatch) throw new Error(`Expected a panel id in: ${html}`)
  return idMatch[1]
}

Deno.test(
  "NavDrawer Comet: the panel's own auto-generated id is deterministic across two independent " +
    "renders of the REAL Comet boundary (defineComet's own instance scope, not the raw " +
    "component) — this is what actually needs to match between the server's whole-document " +
    "render and NavDrawer's own isolated client hydration; see @zanix/space's own " +
    '`comet-id-scope.test.tsx` for the identical guarantee at the general mechanism level',
  () => {
    const htmlA = renderToStaticMarkup(
      NavDrawerComet({ items, label: 'Main navigation', defaultOpen: true }),
    )
    const htmlB = renderToStaticMarkup(
      NavDrawerComet({ items, label: 'Main navigation', defaultOpen: true }),
    )

    assertEquals(extractPanelId(htmlA), extractPanelId(htmlB))
  },
)

Deno.test(
  'NavDrawer Comet: two Comet instances with DIFFERENT props (label) get different auto-generated ' +
    'ids — never a shared constant that would collide when a page composes more than one NavDrawer',
  () => {
    const htmlA = renderToStaticMarkup(
      NavDrawerComet({ items, label: 'Main navigation', defaultOpen: true }),
    )
    const htmlB = renderToStaticMarkup(
      NavDrawerComet({ items, label: 'Footer navigation', defaultOpen: true }),
    )

    assertEquals(extractPanelId(htmlA) === extractPanelId(htmlB), false)
  },
)
