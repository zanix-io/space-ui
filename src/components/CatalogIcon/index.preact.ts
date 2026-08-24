import { h } from 'preact'
import type { VNode } from 'preact'
import type { CreateElement } from 'typings/renderer.ts'
import { createCatalogIcon } from './render.ts'
import { CATALOG_VIEWBOX } from './types.ts'
import type { CatalogIconProps } from './types.ts'

/**
 * `Icon` pre-wired to the curated default icon catalog — see `index.ts`'s own doc for the full
 * description. Preact binding, same props, same rendered markup; import from `@zanix/space-ui`
 * (no subpath) for the React one.
 */
export const CatalogIcon: (props: CatalogIconProps) => VNode = createCatalogIcon(
  h as unknown as CreateElement<VNode>,
  CATALOG_VIEWBOX,
)
