import { createElement } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createCatalogIcon } from './render.ts'
import { CATALOG_VIEWBOX } from './types.ts'
import type { CatalogIconProps } from './types.ts'

/**
 * `Icon`, pre-wired to the curated default icon catalog — pass a known `name` (see
 * {@linkcode CatalogIconProps}) and get the matching `viewBox` back for free, without needing to
 * know it yourself. `href` is still yours to provide, pointing at wherever your project ends up
 * serving the curated sprite (`src/templates/shared/icons/catalog.svg`) — no scaffolding wires
 * this yet, so there is no default `href` to fall back to.
 *
 * Delegates to `Icon` verbatim — same markup, same `data-space-ui="icon"` hook, same
 * accessibility behavior, nothing reimplemented. Entirely optional: importing `@zanix/space-ui`
 * without ever referencing `CatalogIcon` costs nothing — no CSS, no asset, no side effect, no
 * network I/O anywhere in this file or `render.ts`.
 *
 * Just this package's own `createCatalogIcon(h, CATALOG_VIEWBOX)`, bound once here — see
 * `render.ts`'s own doc if you want the same pattern for a catalog of your own.
 *
 * React binding — import from `@zanix/space-ui/preact` instead for the Preact one.
 *
 * @example
 * ```tsx
 * <CatalogIcon name="search" href="/assets/icons/catalog.svg" label="Search" />
 * ```
 */
export const CatalogIcon: (props: CatalogIconProps) => ReactElement = createCatalogIcon(
  createElement as unknown as CreateElement<ReactElement>,
  CATALOG_VIEWBOX,
)
