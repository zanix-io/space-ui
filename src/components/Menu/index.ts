import { createElement, Fragment, useId, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.ts'
import { createMenu } from './render.ts'
import type { MenuProps } from './types.ts'

/**
 * A `<nav>` list of links, each optionally a disclosure trigger for a nested submenu, to any
 * depth. Real implementation shared with the Preact binding via `render.ts`'s own `createMenu`
 * (see that file's own doc for how — hook injection, wider than `Table`'s bag, plus the
 * `Fragment`-applied-unconditionally resolution for this component's own React/Preact wrinkle);
 * import from `@zanix/space-ui/preact` instead for the Preact one, same contract, same rendered
 * behavior. Item rendering itself composes the already-built `Link`/`Button`/`ImgButton`/`Icon`/
 * `Image` (via their own `render.ts` factories).
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
 * - `submenu` absent/empty: a real `Link` (or `ImgButton` when `icon`/`image` is given) — plain
 *   navigation, no disclosure attributes.
 * - `submenu` given, `url` absent: ONE control is both the item's own visual and its disclosure
 *   trigger — `aria-expanded`/`aria-controls` (via `Button`'s own native ARIA passthrough) on a
 *   `Button` whose children are the icon/image (decorative) plus the visible label text, composed
 *   directly here rather than through `ImgButton` — see "`ImgButton` vs. direct composition" below.
 * - `submenu` given, `url` given: TWO separate controls, deliberately not one — a real `Link`
 *   (navigable) plus a bare, icon-less disclosure `Button` next to it, carrying its own
 *   `aria-expanded`/`aria-controls`/accessible name (`"<label> submenu"` by default).
 * - `submenu`/`url` both absent: static text (plus a decorative icon if given), no interactive
 *   element at all — nothing to click or navigate to.
 * - `openMode="onRender"`: submenus are always expanded, so no disclosure trigger of any kind is
 *   ever rendered — an item with `url` is a plain `Link`; without `url`, plain static content, same
 *   as the no-submenu/no-url case above.
 *
 * ## `ImgButton` vs. direct composition
 *
 * A plain navigable item with an icon composes the existing `ImgButton` unmodified. A disclosure
 * trigger with an icon does NOT: `ImgButtonProps` has no `aria-expanded`/`aria-controls` field
 * (only `Button` was extended with that — see its own `types.ts` doc), and this component
 * shouldn't reach into `ImgButton`'s own closed API for one caller's need. Instead, the trigger
 * composes `Button` (already carrying the real ARIA attributes) with `Icon`/`Image` as its own
 * `children` — the exact same "decorative visual + one accessible name" shape `ImgButton` itself
 * builds internally, assembled here instead of delegated.
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
export const Menu: (props: MenuProps) => ReactElement = createMenu<ReactElement>(
  createElement as unknown as CreateElement<ReactElement>,
  { useId, useRef, useState, useCloseOnOutside },
  Fragment,
)
