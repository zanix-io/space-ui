/**
 * `NavDrawer`'s Preact binding — same props, same rendered markup as `./runtime/nav-drawer`
 * (React). See `./runtime/video`'s own `@module` doc for why this package's real
 * `@zanix/space`-dependent components each get their own single-component subpath, and this file's
 * React counterpart for exactly what `NavDrawer` composes/reaches and why.
 *
 * @module
 */

export { default as NavDrawer } from 'components/NavDrawer/index.preact.ts'
export type {
  /** See `components/NavDrawer/index.preact.ts`'s own `NavDrawerItem` for the full doc. */
  NavDrawerItem,
  /** See `components/NavDrawer/index.preact.ts`'s own `NavDrawerProps` for the full doc. */
  NavDrawerProps,
} from 'components/NavDrawer/index.preact.ts'
