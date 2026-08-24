import { assertEquals, assertStringIncludes } from '@std/assert'
import { render } from 'preact-render-to-string'
import { CatalogIcon } from 'components/CatalogIcon/index.preact.ts'

// Same behavior as `catalog-icon.test.tsx` (the React binding), verified independently against
// the Preact one — proves `createCatalogIcon`'s shared logic (`render.ts`) behaves identically
// regardless of which renderer it's bound to. Called as a plain function, not via JSX — same
// reasoning as `icon-preact.test.tsx`'s own doc.

Deno.test(
  'CatalogIcon (preact): a valid name resolves to the correct href',
  () => {
    const html = render(
      CatalogIcon({ name: 'search', href: '/assets/icons/catalog.svg' }),
    )

    assertStringIncludes(html, 'href="/assets/icons/catalog.svg#search"')
  },
)

Deno.test(
  'CatalogIcon (preact): viewBox is resolved per-name, not a single uniform value',
  () => {
    const search = render(CatalogIcon({ name: 'search', href: '/assets/icons/catalog.svg' }))
    const close = render(CatalogIcon({ name: 'close', href: '/assets/icons/catalog.svg' }))
    const mapLocationDot = render(
      CatalogIcon({ name: 'map-location-dot', href: '/assets/icons/catalog.svg' }),
    )

    assertStringIncludes(search, 'viewBox="0 0 512 512"')
    assertStringIncludes(close, 'viewBox="0 0 384 512"')
    assertStringIncludes(mapLocationDot, 'viewBox="0 0 640 512"')
  },
)

Deno.test(
  'CatalogIcon (preact): delegates to Icon — decorative by default (no label)',
  () => {
    const html = render(CatalogIcon({ name: 'gear', href: '/assets/icons/catalog.svg' }))

    assertStringIncludes(html, 'aria-hidden="true"')
    assertEquals(html.includes('role="img"'), false)
    assertEquals(html.includes('aria-label'), false)
  },
)

Deno.test(
  'CatalogIcon (preact): delegates to Icon — a label switches it to an accessible image',
  () => {
    const html = render(
      CatalogIcon({ name: 'close', href: '/assets/icons/catalog.svg', label: 'Close dialog' }),
    )

    assertStringIncludes(html, 'role="img"')
    assertStringIncludes(html, 'aria-label="Close dialog"')
    assertEquals(html.includes('aria-hidden'), false)
  },
)

Deno.test('CatalogIcon (preact): forwards className, exactly like Icon itself', () => {
  const html = render(
    CatalogIcon({ name: 'check', href: '/assets/icons/catalog.svg', className: 'ui-icon' }),
  )

  assertStringIncludes(html, 'class="ui-icon"')
})

Deno.test('CatalogIcon (preact): keeps data-space-ui="icon"', () => {
  const html = render(CatalogIcon({ name: 'plus', href: '/assets/icons/catalog.svg' }))

  assertStringIncludes(html, 'data-space-ui="icon"')
})
