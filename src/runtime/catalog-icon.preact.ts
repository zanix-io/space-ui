import { h } from 'preact'
import type { VNode } from 'preact'
import { resolveAssetHref } from '@zanix/space/assets-manifest'
import type { CreateElement } from 'typings/renderer.ts'
import { createCatalogIcon } from 'components/CatalogIcon/render.ts'
import { CATALOG_VIEWBOX } from 'components/CatalogIcon/types.ts'
import type { CatalogIconName, IconCatalogProps } from 'components/CatalogIcon/types.ts'

export type { CatalogIconName, IconCatalogProps } from 'components/CatalogIcon/types.ts'

/**
 * `CatalogIcon`'s Preact binding — same props, same rendered markup as `./runtime/catalog-icon`
 * (React). See `./runtime/catalog-icon`'s own `@module` doc for why this file constructs
 * `CatalogIcon` directly (with `resolveAssetHref` injected) rather than re-exporting
 * `components/CatalogIcon/index.preact.ts`, which is the separate, comet-safe root-barrel binding
 * instead.
 *
 * @module
 */

export const CatalogIcon: (props: IconCatalogProps<CatalogIconName>) => VNode = createCatalogIcon(
  h as unknown as CreateElement<VNode>,
  CATALOG_VIEWBOX,
  resolveAssetHref,
)
