import { assertEquals, assertStringIncludes } from '@std/assert'
import { createElement } from 'react'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createCatalogIcon } from 'components/CatalogIcon/render.ts'
import type { CreateElement } from 'typings/renderer.ts'
import type { IconCatalogProps } from 'components/CatalogIcon/types.ts'

// Exercises `createCatalogIcon`'s public, data-parametrized form directly — a consumer's own
// catalog, not this package's `CatalogIcon`/`CATALOG_VIEWBOX` at all. Proves the factory itself
// (not just its one internal binding) resolves per-name viewBoxes correctly for an arbitrary map,
// exactly the worked example in `render.ts`'s own doc.

const MY_ICON_VIEWBOX = {
  logo: '0 0 32 32',
  'chevron-down': '0 0 16 16',
} as const

type MyIconName = keyof typeof MY_ICON_VIEWBOX

const MyIcon: (props: IconCatalogProps<MyIconName>) => ReactElement = createCatalogIcon(
  createElement as unknown as CreateElement<ReactElement>,
  MY_ICON_VIEWBOX,
)

Deno.test('createCatalogIcon: a custom name resolves to the given map’s own viewBox', () => {
  const html = renderToStaticMarkup(<MyIcon name='logo' href='/assets/icons/brand.svg' />)

  assertStringIncludes(html, 'viewBox="0 0 32 32"')
  assertStringIncludes(html, 'href="/assets/icons/brand.svg#logo"')
})

Deno.test('createCatalogIcon: viewBox is resolved per-name, not a single shared value', () => {
  const logo = renderToStaticMarkup(<MyIcon name='logo' href='/assets/icons/brand.svg' />)
  const chevron = renderToStaticMarkup(
    <MyIcon name='chevron-down' href='/assets/icons/brand.svg' />,
  )

  assertStringIncludes(logo, 'viewBox="0 0 32 32"')
  assertStringIncludes(chevron, 'viewBox="0 0 16 16"')
})

Deno.test('createCatalogIcon: delegates to Icon — same data-space-ui hook, same markup', () => {
  const html = renderToStaticMarkup(<MyIcon name='logo' href='/assets/icons/brand.svg' />)

  assertStringIncludes(html, 'data-space-ui="icon"')
})

Deno.test(
  'createCatalogIcon: an unrelated instance never shares state with this package’s own CatalogIcon',
  () => {
    // Two independently-bound components over two independent maps — proves `createCatalogIcon`
    // closes over its own `viewBoxByName` argument only, never a shared/module-level catalog.
    const OTHER_VIEWBOX = { logo: '0 0 64 64' } as const
    const OtherIcon: (props: IconCatalogProps<keyof typeof OTHER_VIEWBOX>) => ReactElement =
      createCatalogIcon(createElement as unknown as CreateElement<ReactElement>, OTHER_VIEWBOX)

    const mine = renderToStaticMarkup(<MyIcon name='logo' href='/a.svg' />)
    const other = renderToStaticMarkup(<OtherIcon name='logo' href='/a.svg' />)

    assertStringIncludes(mine, 'viewBox="0 0 32 32"')
    assertStringIncludes(other, 'viewBox="0 0 64 64"')
    assertEquals(mine === other, false)
  },
)
