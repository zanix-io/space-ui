'use comet'
import { createElement, Fragment, useEffect, useId, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { defineComet } from '@zanix/space/comet'
import type { CometBoundaryComponent, CometProps } from '@zanix/space/comet'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.ts'
import { useFocusScope } from 'shared/focus-scope.ts'
import { createNavDrawer } from './render.ts'
import type { NavDrawerItem, NavDrawerProps } from './types.ts'

export type { NavDrawerItem, NavDrawerProps }

/**
 * A ready-made, hamburger-triggered navigation drawer — the toggle button, open/close state, and
 * `Drawer` wiring (side, nonce, close-on-escape), composing this package's own `Button`/`Drawer`/
 * `Menu`. Real implementation shared with the Preact binding via `render.ts`'s own
 * `createNavDrawer`; import from `@zanix/space-ui/runtime/nav-drawer/preact` instead for the
 * Preact one, same contract, same rendered behavior.
 *
 * A real `'use comet'` Comet (`@zanix/space/comet`'s `defineComet`, see this file's own default
 * export) — the actual reason it lives in its own `./runtime/nav-drawer` subpath, not the root
 * barrel: `defineComet` is a real, direct import from `@zanix/space` (see
 * `src/runtime/nav-drawer.ts`'s own `@module` doc). Renders real,
 * visible navigation UI, so — unlike every ready-made Comet `@zanix/space` itself ships
 * (`FormDraftPersistence`, `SubmitGuard`, `ScrollRestoration`, `UnsavedChangesGuard`,
 * `NetworkStatus`, `ManagedForm`, all deliberately null-rendering/headless) — it belongs in
 * `space-ui`, this package's own component catalog, not in `@zanix/space` itself.
 *
 * ## Zero `@zanix/space` dependency THROUGH `Menu`
 *
 * `NavDrawer` composes `Menu` (now dependency-free — see `Menu/index.ts`'s own doc), never
 * `Image`/`ImgButton` directly. Its own `items` (`NavDrawerItem[]`) deliberately omit `Menu`'s own
 * `visual` render-prop, since a Comet's props cross the server/client boundary as plain JSON and a
 * function isn't JSON-serializable — see `types.ts`'s own doc. A nav item's only visual path here
 * is `icon` (already-JSON `IconProps`).
 *
 * ## Always uncontrolled, closes itself on real navigation
 *
 * See `types.ts`'s own `NavDrawerProps` doc for why there's no controlled `open`/`onOpenChange`
 * escape hatch (a Comet's own props preclude it structurally), and `render.ts`'s own doc for the
 * exact mechanism that closes the drawer the moment a real navigation link inside it is activated.
 *
 * ## Composed-markup hooks, no new one of its own
 *
 * Inherits `data-space-ui="button"` (the toggle), `"drawer"`/`"drawer-backdrop"` (the sliding
 * panel), and `"menu"`/`"menu-item"`/`"menu-list"` (the nav list) from the real components it
 * renders — nothing here adds a redundant `"nav-drawer"` hook of its own, same composed-markup rule
 * `Table`'s own sortable-header `Button` and `Pagination`'s own page-item `Button`/`Link` already
 * follow.
 *
 * @example
 * ```tsx
 * import { NavDrawer } from '@zanix/space-ui/runtime/nav-drawer'
 *
 * <NavDrawer
 *   label="Main navigation"
 *   items={[
 *     { label: 'Home', url: '/' },
 *     { label: 'Docs', url: '/docs', submenu: [{ label: 'Guides', url: '/docs/guides' }] },
 *   ]}
 * />
 * ```
 */
export const NavDrawer: (props: NavDrawerProps) => ReactElement = createNavDrawer<ReactElement>(
  createElement as unknown as CreateElement<ReactElement>,
  { useId, useRef, useState, useEffect, useCloseOnOutside, useFocusScope },
  Fragment,
)

/**
 * {@linkcode NavDrawer}, wrapped as a real Comet boundary — `src/runtime/nav-drawer.ts` re-exports
 * this default export under the `NavDrawer` name (`export { default as NavDrawer } from
 * './index.ts'`, the same shape `@zanix/space/comet/react`'s own `mod-react.ts` uses for every one
 * of its ready-made Comets), so `import { NavDrawer } from '@zanix/space-ui/runtime/nav-drawer'` is
 * the real, Comet-wrapped component — never the un-wrapped named export above directly. `as`-annotated, not left to
 * inference: `defineComet`'s own generic return type is too complex for JSR's fast-check publish
 * step to infer through a bare default-export expression, the same reasoning `@zanix/space`'s own
 * ready-made Comets (`form-draft-persistence-react.tsx`, …) already document for this exact `as`
 * clause.
 */
export default defineComet(NavDrawer, import.meta.url) as CometBoundaryComponent<
  NavDrawerProps & CometProps
>
