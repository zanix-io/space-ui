import { createElement } from 'react'
import type { ReactElement } from 'react'
import { resolveAssetHref } from '@zanix/space/assets-manifest'
import type { CreateElement } from 'typings/renderer.ts'
import { createCatalogIcon } from 'components/CatalogIcon/render.ts'
import { CATALOG_VIEWBOX } from 'components/CatalogIcon/types.ts'
import type { CatalogIconName, IconCatalogProps } from 'components/CatalogIcon/types.ts'

export type { CatalogIconName, IconCatalogProps } from 'components/CatalogIcon/types.ts'

/**
 * `CatalogIcon` — one of `@zanix/space-ui`'s components with a REAL runtime dependency on
 * `@zanix/space` (`resolveAssetHref`, from `@zanix/space/assets-manifest`, injected directly into
 * `CatalogIcon/render.ts`'s own `createCatalogIcon`) — its own, single-component subpath, never the
 * default (`.`) barrel — see `./runtime/video.ts`'s own `@module` doc for the full "why a
 * per-component subpath, not one shared `./runtime` barrel" reasoning, not repeated here.
 *
 * Two real bindings of the same component name, additive, same shape `Image`'s own module doc
 * documents for its identical split:
 * - `components/CatalogIcon/index.ts`/`index.preact.ts` (the default `.`/`./preact` barrel) call
 *   `createCatalogIcon(h, CATALOG_VIEWBOX)` with NO resolver — comet-safe (zero `@zanix/space`
 *   reachability), correct for an already-absolute `href` a caller supplies itself.
 * - This file injects `resolveAssetHref`, auto-resolving a relative `href` (this package's own
 *   curated sprite path, or a consumer's own) to its real, possibly content-hashed build URL —
 *   SSR-only, never comet-safe, `@zanix/space`-dependent by design.
 *
 * @module
 */

export const CatalogIcon: (props: IconCatalogProps<CatalogIconName>) => ReactElement =
  createCatalogIcon(
    createElement as unknown as CreateElement<ReactElement>,
    CATALOG_VIEWBOX,
    resolveAssetHref,
  )
