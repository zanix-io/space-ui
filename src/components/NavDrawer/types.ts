import type { MenuItemFields, MenuOpenMode } from 'components/Menu/types.ts'
import type { DrawerSide } from 'components/Drawer/types.ts'

/**
 * One `NavDrawer` nav entry — {@linkcode MenuItemFields} (see that type's own doc for `label`/
 * `url`/`external`/`rel`/`title`/`accessibleLabel`/`current`/`icon`) plus a recursive `submenu`, deliberately
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
  /** Applied to the sliding panel (`Drawer`'s own `className`) — the inner `Menu` takes no styling
   * hook of their own here; style it via the `data-space-ui="menu"` selector instead, same as
   * composing `Menu` directly would require. The toggle button takes {@linkcode toggleClassName}. */
  className?: string
  /** Accessible name of the toggle while the panel is closed — the text a screen reader announces
   * and the one to translate; the default is English.
   * @default 'Open menu' */
  openLabel?: string
  /** Accessible name of the toggle (hamburger) button while the panel is open. Not the panel's own
   * close button — that one is named by {@linkcode closeButtonLabel}.
   * @default 'Close menu' */
  closeLabel?: string
  /** Accessible name of the close button inside the sliding panel (forwarded to the inner
   * `Drawer`'s own `closeLabel`) — the text to translate for an app in another language. Not the
   * toggle's name while open — that one is {@linkcode closeLabel}.
   * @default 'Close' */
  closeButtonLabel?: string
  /** Applied to the toggle button (`Button`'s own `className`), the styling hook it has no other
   * way to offer: a selector on its accessible name (`[aria-label$='menu']`) stops matching as soon
   * as {@linkcode openLabel} or {@linkcode closeLabel} is translated. */
  toggleClassName?: string
  /** Decides the current item from the browser's location each time the panel opens, ignoring the
   * items' own `current`: the item whose `url` is the longest path that is the location's path or
   * a parent of it is marked (`aria-current="page"`), and no other. Needed when the drawer lives
   * in a layout that survives client-side navigation (a root layout is never re-rendered by
   * Orbit), where a `current` computed on the server stays that of the page the document was first
   * loaded on. Without a location (server render) the items' own `current` is used.
   * @default false */
  currentFromLocation?: boolean
  /** The viewport width, as a CSS length in `px`, `em` or `rem` (`'48rem'`), from which the same
   * {@linkcode items} render as a plain `<nav>` list instead of behind the toggle: from that width
   * the toggle and the panel are hidden, below it nothing changes. Both are in the server markup, so
   * the right one shows before hydration, without a flash.
   *
   * The switch is a `<style>` element this component renders with the request's `nonce` (see
   * {@linkcode nonce}); under a CSP that forbids inline styles, pass the nonce or the rule is
   * blocked and both the toggle and the list show. A panel that is open when the viewport grows
   * past the width closes. The inline list is the `Menu` the panel holds (`openMode` applies to its
   * submenus) inside a `data-navdrawer-inline` container; style it through `data-space-ui="menu"`.
   *
   * With {@linkcode currentFromLocation} the inline list marks the current item once the component
   * has hydrated: the server render keeps the items' own `current`.
   * @throws When the value is not a positive number followed by `px`, `em` or `rem`. */
  inlineFrom?: string
}
