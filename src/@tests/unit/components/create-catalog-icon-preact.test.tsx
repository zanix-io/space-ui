import { assertStringIncludes } from '@std/assert'
import { h } from 'preact'
import type { VNode } from 'preact'
import { render } from 'preact-render-to-string'
import { createCatalogIcon } from 'components/CatalogIcon/render.ts'
import type { CreateElement } from 'typings/renderer.ts'
import type { IconCatalogProps } from 'components/CatalogIcon/types.ts'

// Same behavior as `create-catalog-icon.test.tsx` (the React binding), verified independently
// against Preact — proves `createCatalogIcon`'s public form behaves identically regardless of
// which renderer it's bound to, same as this package's own `CatalogIcon` already does.

const MY_ICON_VIEWBOX = {
  logo: '0 0 32 32',
  'chevron-down': '0 0 16 16',
} as const

type MyIconName = keyof typeof MY_ICON_VIEWBOX

const MyIcon: (props: IconCatalogProps<MyIconName>) => VNode = createCatalogIcon(
  h as unknown as CreateElement<VNode>,
  MY_ICON_VIEWBOX,
)

Deno.test(
  'createCatalogIcon (preact): a custom name resolves to the given map’s own viewBox',
  () => {
    const html = render(MyIcon({ name: 'logo', href: '/assets/icons/brand.svg' }))

    assertStringIncludes(html, 'viewBox="0 0 32 32"')
    assertStringIncludes(html, 'href="/assets/icons/brand.svg#logo"')
  },
)

Deno.test(
  'createCatalogIcon (preact): viewBox is resolved per-name, not a single shared value',
  () => {
    const logo = render(MyIcon({ name: 'logo', href: '/assets/icons/brand.svg' }))
    const chevron = render(MyIcon({ name: 'chevron-down', href: '/assets/icons/brand.svg' }))

    assertStringIncludes(logo, 'viewBox="0 0 32 32"')
    assertStringIncludes(chevron, 'viewBox="0 0 16 16"')
  },
)

Deno.test(
  'createCatalogIcon (preact): delegates to Icon — same data-space-ui hook, same markup',
  () => {
    const html = render(MyIcon({ name: 'logo', href: '/assets/icons/brand.svg' }))

    assertStringIncludes(html, 'data-space-ui="icon"')
  },
)
