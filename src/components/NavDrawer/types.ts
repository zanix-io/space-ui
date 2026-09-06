import type { MenuItemFields, MenuOpenMode } from 'components/Menu/types.ts'
import type { DrawerSide } from 'components/Drawer/types.ts'

/**
 * One `NavDrawer` nav entry — {@linkcode MenuItemFields} (see that type's own doc for `label`/
 * `url`/`external`/`rel`/`title`/`accessibleLabel`/`icon`) plus a recursive `submenu`, deliberately
 * WITHOUT `Menu.MenuItem`'s own `visual` render-prop. `NavDrawer` is a Comet
 * (`@zanix/space/comet`'s `defineComet`), and a Comet's own props cross the server/client boundary
 * as plain JSON — a render-prop function isn't JSON-serializable, so it can never reach this
 * component's props in the first place, unlike a bare `Menu` used directly (never wrapped in a
 * Comet boundary) elsewhere in an app. `icon` (plain `IconProps` data, already fully JSON) is the
 * one decorative-visual path available here — see `Menu`'s own doc for how it renders.
 */
export type NavDrawerItem = MenuItemFields & {
  /** Nested items, to any depth — same disclosure-trigger contract `Menu.MenuItem.submenu`
   * already establishes. */
  submenu?: NavDrawerItem[]
}

/**
 * Props for the `NavDrawer` Comet — every field is plain JSON (see {@linkcode NavDrawerItem}'s own
 * doc for why `visual` specifically can never appear here), identical between the React and Preact
 * bindings (unlike `Menu`'s own props, nothing here is parametrized by a renderer's node type).
 *
 * Deliberately uncontrolled, with no `open`/`onOpenChange` escape hatch: a Comet's own props are
 * serialized once, at the point a page/layout renders it — a callback prop crossing that same
 * boundary would have nothing left to call back into once the client takes over. This mirrors every
 * ready-made Comet in `@zanix/space`'s own catalog (`NetworkStatus`, `UnsavedChangesGuard`, …) —
 * plain options in, no callback prop out. `NavDrawer` closes itself the moment a real navigation
 * link inside it is activated (see `render.ts`'s own doc for the exact mechanism) — the built-in
 * answer to the same "close the mobile nav after navigating" need `Menu`'s own `open`/`onOpenChange`
 * exists for a caller to solve by hand; `NavDrawer` already owns its whole toggle+panel lifecycle,
 * so it solves it internally instead.
 */
export type NavDrawerProps = {
  items: NavDrawerItem[]
  /** Accessible name for both the inner nav list (`Menu`'s own `aria-label`) and the sliding panel
   * itself (`Drawer`'s own accessible name) — a nav drawer's list and the panel containing it
   * describe the same landmark, so one name covers both rather than asking for two. */
  label: string
  /** Which edge the panel slides in from. Unlike `Drawer.side` (no default — no single edge is the
   * unambiguous normal case for a general-purpose drawer), a hamburger NAV drawer's own
   * near-universal convention is the left edge, so this one has a real default.
   * @default 'left' */
  side?: DrawerSide
  /** Forwarded to the inner `Menu` — see `Menu`'s own `MenuOpenMode` doc.
   * @default 'onClick' */
  openMode?: MenuOpenMode
  /** Initial (and, since this component is always uncontrolled, ongoing) open state — see this
   * type's own doc for why there is no controlled `open` prop.
   * @default false */
  defaultOpen?: boolean
  /** Forwarded to the inner `Drawer`.
   * @default true */
  closeOnEscape?: boolean
  /** Forwarded to the inner `Drawer`'s own self-rendered `<style nonce>` element — required only
   * under a nonce-based `style-src` CSP. Omit when the consuming page has no such CSP. */
  nonce?: string
  /** DOM `id` for the sliding panel. Auto-generated (`useId`) when omitted — only worth giving
   * explicitly to target it from a test/CSS selector/`aria-describedby` elsewhere. */
  id?: string
  /** Applied to the sliding panel (`Drawer`'s own `className`) — the toggle button and the inner
   * `Menu` take no styling hook of their own here; style them via `data-space-ui="button"`/
   * `"menu"` selectors instead, same as composing `Button`/`Menu` directly would require. */
  className?: string
}
