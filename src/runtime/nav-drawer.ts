/**
 * `NavDrawer` — see `./runtime/video`'s own `@module` doc for why this package's real
 * `@zanix/space`-dependent components each get their own single-component subpath (never a shared
 * combined `./runtime` barrel, removed as of this change).
 *
 * Reaches `@zanix/space` a different way than the other five: a real `'use comet'` Comet, importing
 * `defineComet`/`CometBoundaryComponent`/`CometProps` from `@zanix/space/comet` directly
 * (`NavDrawer/index.ts`), never `resolveAssetHref` — `@zanix/space/comet`'s own module graph never
 * reaches `assets-manifest` either, but it's still a real, direct dependency on the `@zanix/space`
 * package itself, which is exactly the condition this subpath split exists for; the specific
 * module inside `@zanix/space` being resolved doesn't change that.
 *
 * Composes this package's own `Button`/`Drawer`/`Menu` (`NavDrawer/render.ts`) — all three
 * zero-`@zanix/space`-dependency components — never `Image`/`Video`/`RichText`. This is exactly the
 * invariant the original combined `./runtime` barrel accidentally broke: a consumer importing only
 * `NavDrawer` from that shared file also resolved `RichText`'s own `markdown-to-jsx`/
 * `@zanix/helpers` chain (and `Video`'s/`Image`'s/`ImgButton`'s/`Card`'s own files too, back when
 * those two still lived in `./runtime`), purely because they were all re-exported from the same
 * physical module — see `./runtime/video`'s own `@module` doc for the full story and how this
 * file's own independent subpath fixes it. Confirmed empirically: `deno info --json
 * src/runtime/nav-drawer.ts` reaches zero `RichText`/`Video`/`Image` files (see the
 * dependency-boundary test's own `NavDrawer` row for the permanent regression guard).
 *
 * @module
 */

export { default as NavDrawer } from 'components/NavDrawer/index.ts'
export type { NavDrawerItem, NavDrawerProps } from 'components/NavDrawer/index.ts'
