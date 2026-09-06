import { createElement, Fragment, useId, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.ts'
import { createMenu } from './render.ts'
import type { MenuBaseProps, MenuItemFields } from './types.ts'

export type { MenuItemFields, MenuOpenMode } from './types.ts'

/** One `Menu` entry, recursively — `submenu` nests further entries to any depth. See `render.ts`'s
 * own `MenuRenderItem<Node>` doc for the full contract on `visual`/`icon` precedence; see this
 * file's own doc for how each field maps onto the rendered `Link`/`Button`/`Icon`. Written out
 * explicitly (rather than a direct alias to `MenuRenderItem<ReactNode>`) so this package's public
 * API surface never names an unexported type, the same `deno doc --lint` constraint `TableColumn`'s
 * own doc already documents. */
export type MenuItem = MenuItemFields & {
  /** Render-prop slot for a caller-owned decorative visual — an already-built `ReactElement` (the
   * caller's own `Image`/`ImgButton` instance, a plain `<img>`, anything), never a data shape this
   * component resolves itself. See `render.ts`'s own `MenuRenderItem.visual` doc for the full
   * reasoning (why this replaced the old `image` prop, and the exact `icon`/`visual` precedence). */
  visual?: () => ReactNode
  /** Nested items. A non-empty array makes this item a disclosure trigger — see this file's own
   * doc for exactly how that trigger is rendered depending on whether `url` is also given. */
  submenu?: MenuItem[]
}

/** {@linkcode MenuBaseProps} plus `items`. Written out explicitly, same "never name an unexported
 * type" reasoning {@linkcode MenuItem}'s own doc already gives. */
export type MenuProps = MenuBaseProps & { items: MenuItem[] }

/**
 * A `<nav>` list of links, each optionally a disclosure trigger for a nested submenu, to any
 * depth. Real implementation shared with the Preact binding via `render.ts`'s own `createMenu`
 * (see that file's own doc for how — hook injection, wider than `Table`'s bag, plus the
 * `Fragment`-applied-unconditionally resolution for this component's own React/Preact wrinkle);
 * import from `@zanix/space-ui/preact` instead for the Preact one, same contract, same rendered
 * behavior. Item rendering itself composes the already-built `Link`/`Button`/`Icon` (via their own
 * `render.ts` factories) — see "Zero `@zanix/space` dependency, by construction" below.
 *
 * ## Zero `@zanix/space` dependency, by construction
 *
 * This component never imports `Image`/`ImgButton` — both have a real, direct-or-composed runtime
 * dependency on `@zanix/space`'s own `resolveAssetHref` (see `src/runtime/video.ts`'s own `@module`
 * doc), and
 * a static ES import is unconditionally hoisted regardless of runtime branching: a component that
 * imports `ImgButton` at its module top reaches `@zanix/space` even for an instance that never
 * actually uses an image-shaped visual, which made every `Menu` instance unusable inside a
 * `'use comet'` file (`@zanix/space`'s own `comet-plugin.ts` fails a build if any such file's
 * module graph reaches a module flagged `'server-only'`, and `assets-manifest` is one). `visual`
 * (see `types.ts`'s own `MenuItem.visual` doc) closes this gap by taking an already-built element
 * from the caller instead of a data shape this component would otherwise have to resolve via
 * `Image`/`ImgButton` itself. That's what lets `Menu` live in
 * the root barrel (`.`/`./preact`) instead of `./runtime`/`./runtime/preact` — confirmed by a real,
 * permanent structural guard (`src/@tests/unit/intl/dependency-boundary.test.ts`) asserting this
 * component's own module never reaches `@zanix/space`, at compile time or runtime.
 *
 * ## Structure: `<nav><ul><li><a>`, never `role="menu"`
 *
 * This is the WAI-ARIA "Disclosure Navigation" pattern, not the "Menu Button" widget pattern —
 * `role="menu"`/`"menuitem"` are for application-style menus (a File/Edit menu) with full
 * roving-tabindex/arrow-key navigation; a site's own navigation with expandable sections is
 * correctly a plain, semantic `<nav>`/`<ul>`/`<li>`/`<a>` tree, focused with ordinary `Tab`. Adding
 * `role="menu"` here would be a regression, not an improvement.
 *
 * ## `toggle` — a plain boolean, `Menu` never touches viewport
 *
 * `toggle` is a plain `boolean`, `Menu` reads no viewport/breakpoint/hydration state of any kind,
 * and the caller owns entirely how (or whether) `toggle` varies by breakpoint — CSS media queries
 * on `className`, a server-side UA check, or nothing at all.
 *
 * The toggled menu's own open state defaults to fully internal (`defaultOpen` seeds it, nothing
 * external can close it afterward) but has a real controlled escape hatch — `open`/`onOpenChange`
 * — for the one concrete case that needs it: closing the mobile nav after a client-side navigation.
 * See `types.ts`'s own doc on `open` for the full contract.
 *
 * ## Each item, depending on `url`/`submenu`
 *
 * - `submenu` absent/empty: a real `Link`, its own `children` carrying the decorative visual
 *   (`icon`, or the caller's own `visual()`) plus the visible label when either is given — plain
 *   navigation, no disclosure attributes.
 * - `submenu` given, `url` absent: ONE control is both the item's own visual and its disclosure
 *   trigger — `aria-expanded`/`aria-controls` (via `Button`'s own native ARIA passthrough) on a
 *   `Button` whose children are the visual (decorative) plus the visible label text.
 * - `submenu` given, `url` given: TWO separate controls, deliberately not one — a real `Link`
 *   (navigable, same visual-plus-label `children` shape as the no-submenu case) plus a bare,
 *   visual-less disclosure `Button` next to it, carrying its own
 *   `aria-expanded`/`aria-controls`/accessible name (`"<label> submenu"` by default).
 * - `submenu`/`url` both absent: static text (plus a decorative visual if given), no interactive
 *   element at all — nothing to click or navigate to.
 * - `openMode="onRender"`: submenus are always expanded, so no disclosure trigger of any kind is
 *   ever rendered — an item with `url` is a plain `Link`; without `url`, plain static content, same
 *   as the no-submenu/no-url case above.
 *
 * ## Accessible name, when a visual is present
 *
 * `accessibleLabel`, when given, is the interactive element's own `aria-label` override (`Link.label`/
 * `Button.label`) — same "supplements or replaces" contract every other component here uses. When
 * omitted, NO explicit `aria-label` is set even with a visual present: the accessible name falls
 * back to the element's own visible `children` (the visual, decorative/`aria-hidden`, plus the
 * visible label text) — never a redundant explicit label repeating what's already visible, the same
 * "don't double-label" lesson `ImgButton/render.ts`'s own doc already draws from the legacy
 * component it rescued.
 *
 * ## `openMode`
 *
 * `'onClick'` (default): the disclosure `Button` toggles on click/Enter/Space, native keyboard
 * activation. `'onHover'`: opens on mouse hover OR keyboard focus entering the item's own subtree
 * — never mouse-only, so nothing here is reachable exclusively without a pointer — and stays open
 * while EITHER condition holds, closing only once both are false (leaving via mouse while still
 * focused inside, or vice versa, never closes it early). `'onRender'`: always expanded, no trigger.
 *
 * ## Closing: independent, no accordion
 *
 * Every item's `isOpen` is its own local state — opening one never closes a sibling. Each open
 * submenu closes independently on: its own disclosure control being toggled again (`onClick`),
 * `mousedown` outside its own subtree ({@linkcode useCloseOnOutside}), or `Escape` while focus is
 * inside it. `Escape` closes only the innermost open level: the handler lives on each item's own
 * `<li>` and calls `stopPropagation()`, so a keydown bubbling from a deeply nested, focused submenu
 * is caught by the nearest open ancestor first — an outer level's own handler never even runs.
 * Closing via `Escape` also returns focus to the exact control that opened that level — this exact
 * shape (guard, stop propagation, close, refocus) is genuinely identical between the top-level
 * toggle and every submenu item, so it's `shared/escape-to-close.ts`'s own `createEscapeToCloseHandler`
 * — `Modal`'s own `Escape` handling is deliberately NOT built on this, see that module's own doc for
 * why its shape genuinely differs rather than merely looking similar.
 */
// Same kind of widening cast `Table/index.ts`'s own doc explains — `createMenu`'s shared body
// types each item's `visual` as `() => E` (here, `() => ReactElement`), while this component's own
// public `MenuItem.visual` is deliberately the wider `() => ReactNode` (so a caller can return a
// string/`null`/fragment, not just a single `ReactElement`) — the same relationship
// `TableRenderColumn<Row, Node>`'s `cell` has to `TableColumn<Row>`'s own `cell`. The cast is this
// widening, nothing more: every real call site still only ever hands `visual()`'s result straight
// to `h` as children, which accepts the full `ReactNode` range regardless of this binding's own
// internal `E` type parameter.
export const Menu: (props: MenuProps) => ReactElement = createMenu<ReactElement>(
  createElement as unknown as CreateElement<ReactElement>,
  { useId, useRef, useState, useCloseOnOutside },
  Fragment,
) as (props: MenuProps) => ReactElement
