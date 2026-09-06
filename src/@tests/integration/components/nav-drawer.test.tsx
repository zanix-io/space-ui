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
