import { assertEquals, assertStringIncludes } from '@std/assert'
import { renderToStaticMarkup } from 'react-dom/server'
import { CatalogIcon } from 'components/CatalogIcon/index.ts'

Deno.test(
  'CatalogIcon: a valid name resolves to the correct href, built from the given href + name',
  () => {
    const html = renderToStaticMarkup(
      <CatalogIcon name='search' href='/assets/icons/catalog.svg' />,
    )

    assertStringIncludes(html, 'href="/assets/icons/catalog.svg#search"')
  },
)

Deno.test(
  'CatalogIcon: viewBox is resolved per-name, NOT a single uniform value across the catalog',
  () => {
    // Three names deliberately chosen with three different real viewBox dimensions (verified
    // against the actual upstream Font Awesome 7.3.1 files, see types.ts's own doc) — this is the
    // exact assumption an earlier draft got wrong (assuming one shared viewBox for the whole
    // catalog); this test locks in that it stays wrong to assume that.
    const search = renderToStaticMarkup(
      <CatalogIcon name='search' href='/assets/icons/catalog.svg' />,
    )
    const close = renderToStaticMarkup(
      <CatalogIcon name='close' href='/assets/icons/catalog.svg' />,
    )
    const mapLocationDot = renderToStaticMarkup(
      <CatalogIcon name='map-location-dot' href='/assets/icons/catalog.svg' />,
    )

    assertStringIncludes(search, 'viewBox="0 0 512 512"')
    assertStringIncludes(close, 'viewBox="0 0 384 512"')
    assertStringIncludes(mapLocationDot, 'viewBox="0 0 640 512"')
  },
)

Deno.test(
  'CatalogIcon: delegates to Icon — decorative by default (no label), same as Icon itself',
  () => {
    const html = renderToStaticMarkup(
      <CatalogIcon name='gear' href='/assets/icons/catalog.svg' />,
    )

    assertStringIncludes(html, 'aria-hidden="true"')
    assertEquals(html.includes('role="img"'), false)
    assertEquals(html.includes('aria-label'), false)
  },
)

Deno.test(
  'CatalogIcon: delegates to Icon — a label switches it to an accessible image, same as Icon itself',
  () => {
    const html = renderToStaticMarkup(
      <CatalogIcon name='close' href='/assets/icons/catalog.svg' label='Close dialog' />,
    )

    assertStringIncludes(html, 'role="img"')
    assertStringIncludes(html, 'aria-label="Close dialog"')
    assertEquals(html.includes('aria-hidden'), false)
  },
)

Deno.test('CatalogIcon: forwards className, exactly like Icon itself', () => {
  const html = renderToStaticMarkup(
    <CatalogIcon name='check' href='/assets/icons/catalog.svg' className='ui-icon' />,
  )

  assertStringIncludes(html, 'class="ui-icon"')
})

Deno.test('CatalogIcon: keeps data-space-ui="icon" — the same hook Icon itself sets', () => {
  const html = renderToStaticMarkup(
    <CatalogIcon name='plus' href='/assets/icons/catalog.svg' />,
  )

  assertStringIncludes(html, 'data-space-ui="icon"')
})

Deno.test(
  'CatalogIcon: an unknown name is a compile-time error, never a silent broken sprite reference',
  () => {
    // @ts-expect-error 'not-a-real-icon' is not a CatalogIconName — this line must fail `deno
    // check`, proving the catalog is closed/typed rather than resolving an unknown name to
    // `undefined` at runtime and silently breaking the rendered `<use href="...#undefined">`.
    const _invalid = <CatalogIcon name='not-a-real-icon' href='/assets/icons/catalog.svg' />
    void _invalid
  },
)

Deno.test('CatalogIcon: delegates to Icon render.ts, never duplicates its markup logic', () => {
  const source = Deno.readTextFileSync(
    new URL('../../../../src/components/CatalogIcon/render.ts', import.meta.url),
  )

  assertStringIncludes(source, "from '../Icon/render.ts'")
  assertStringIncludes(source, 'createIcon(h)')
  // No `h('svg'` / `h('use'` here — CatalogIcon must never build its own markup, only resolve
  // props and hand off to the real, unmodified Icon.
  assertEquals(source.includes("h('svg'"), false)
  assertEquals(source.includes("h('use'"), false)
})

Deno.test('CatalogIcon: fully static — no fetch/I/O/dynamic import anywhere in its lookup', () => {
  const typesSource = Deno.readTextFileSync(
    new URL('../../../../src/components/CatalogIcon/types.ts', import.meta.url),
  )
  const renderSource = Deno.readTextFileSync(
    new URL('../../../../src/components/CatalogIcon/render.ts', import.meta.url),
  )
  const combined = typesSource + renderSource

  for (const forbidden of ['fetch(', 'await ', 'Deno.', 'import(', 'new Map', 'XMLHttpRequest']) {
    assertEquals(
      combined.includes(forbidden),
      false,
      `CatalogIcon's lookup must stay fully static — found "${forbidden}"`,
    )
  }
})
