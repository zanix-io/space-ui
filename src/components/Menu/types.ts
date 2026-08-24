import type { IconProps } from 'components/Icon/types.ts'
import type { ImageProps } from 'components/Image/types.ts'

/**
 * One entry in a {@linkcode Menu}, recursively — `submenu` nests further entries to any depth.
 * See `index.ts`'s own doc for the full contract on how each field maps onto the rendered
 * `Link`/`Button`/`ImgButton`.
 */
export type MenuItem = {
  /** Visible text — rendered as the item's own link/button content. */
  label: string
  /** Present → the item is a real, navigable link. Absent, with `submenu` given → the item is a
   * disclosure-only control, never navigable. */
  url?: string
  external?: boolean
  rel?: string
  /** Native `title` passthrough — a browser tooltip on hover, same contract as `Link.title`/
   * `Button.title`. */
  title?: string
  /** Accessible-name override for the item's own visible `label` — same "supplements or replaces"
   * contract as `Link.label`. Omit when `label` already reads well standalone. */
  accessibleLabel?: string
  /** Exact `IconProps` `Icon` itself takes — wins over `image` when both are given, same
   * precedence `ImgButton` already establishes. */
  icon?: IconProps
  /** Exact `ImgButtonProps.image` shape — `alt` is never read from this object, the composed
   * `Image` is always decorative here (the item's own accessible name carries the meaning). */
  image?: Omit<ImageProps, 'alt'>
  /** Nested items. A non-empty array makes this item a disclosure trigger — see `index.ts`'s own
   * doc for exactly how that trigger is rendered depending on whether `url` is also given. */
  submenu?: MenuItem[]
}

/** How a submenu reveals once its trigger is reached. `'onClick'` (default): explicit
 * click/Enter/Space. `'onHover'`: mouse hover OR keyboard focus — never mouse-only, see
 * `index.ts`'s own doc. `'onRender'`: always expanded, no trigger/interactivity of any kind. */
export type MenuOpenMode = 'onClick' | 'onHover' | 'onRender'

/** Props for {@linkcode Menu}. See `index.ts`'s own doc for the full behavioral contract. */
export type MenuProps = {
  items: MenuItem[]
  /** @default 'onClick' */
  openMode?: MenuOpenMode
  /** Whether the whole menu sits collapsed behind its own toggle button. A plain boolean — `Menu`
   * never reads viewport/breakpoint/hydration state of any kind; the caller decides, and may
   * change this prop at any time (e.g. from its own CSS-driven or app-level breakpoint logic).
   * @default false */
  toggle?: boolean
  /** Initial open state when `toggle` is `true` — seeds the first render only, ignored once `open`
   * is given (see `open`'s own doc for when each applies).
   * @default false */
  defaultOpen?: boolean
  /**
   * Controlled open state when `toggle` is `true` — when given, this component's own internal
   * state is never the source of truth for whether the toggled menu is open; the caller must
   * update this prop (typically from `onOpenChange`) for it to actually open or close. Omit for
   * the uncontrolled default, where `defaultOpen` seeds the first render and this component tracks
   * the rest itself. Closing the menu after a client-side navigation (`@zanix/space`'s own Orbit
   * does soft navigation, with no page reload to reset this for you) is the concrete case this
   * exists for — without it, nothing outside `Menu` can ever close an already-open toggled menu.
   * Has no effect at all when `toggle` is `false` (the menu is always visible either way).
   */
  open?: boolean
  /** Called whenever the toggled menu wants to open or close — on the toggle button's own click,
   * an outside click, or `Escape` — regardless of whether `open` is controlled. Fires even in the
   * uncontrolled case (same "always notify, controlled or not" contract as a native `<input>`'s own
   * `onChange`), so a caller can observe the state without having to own it. Has no effect on this
   * component's own behavior when `open` is omitted — it's purely a notification in that case. */
  onOpenChange?: (open: boolean) => void
  /** Accessible name for the root `<nav>`. */
  label: string
  id?: string
  className?: string
}
