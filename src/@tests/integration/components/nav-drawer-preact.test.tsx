import { assertEquals } from '@std/assert'
import NavDrawerComet from 'components/NavDrawer/index.preact.ts'

/**
 * The Preact half of `nav-drawer.test.tsx`'s own Comet-wiring check (same directory) — narrower on
 * purpose. Actually RENDERING a Comet boundary needs the active renderer flipped to `'preact'`
 * (`@zanix/space`'s own `getActiveRenderer()` defaults to `'react'`; only `defineSpaceApp({
 * renderer: 'preact' })` flips it — `setActiveRenderer` itself isn't part of any published
 * `@zanix/space` subpath). `defineSpaceApp` lives on `@zanix/space`'s bare root, which — confirmed
 * directly, not assumed — materializes a large, unrelated npm graph (`sharp`, `vite`, `tailwindcss`,
 * `vanilla-extract`, …) merely by being imported, for a real app-definition function this test has
 * no use for beyond one internal side effect. Rather than pay that cost in this repo's own test
 * suite for a single assertion, this file checks what's verifiable WITHOUT rendering: that the real
 * `defineComet(NavDrawer, import.meta.url)` call in `index.preact.ts` actually succeeded (it throws
 * for an unnamed component — see `defineComet`'s own `@throws`) and produced a real boundary
 * function. The React sibling test in this same directory covers the full real-markup assertions
 * (wire-protocol attributes, real component content, `comet="only"`/`"none"`) — `render.ts`'s own
 * `createNavDrawer` is what's actually shared between both renderers, already covered there and in
 * `unit/components/nav-drawer-preact.test.tsx`'s own real-DOM tests.
 */
Deno.test('NavDrawer Comet (preact): defineComet(NavDrawer, ...) succeeds and returns a function', () => {
  assertEquals(typeof NavDrawerComet, 'function')
})
