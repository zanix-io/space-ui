import type { IconProps } from 'components/Icon/types.ts'
import type { ImageProps } from 'components/Image/types.ts'

/**
 * Props for {@linkcode ImgButton}. See `render.ts`'s own doc for the full contract: how `href`
 * decides between composing `Link` and `Button`, and why `icon`/`image` are handled the way they
 * are.
 */
export type ImgButtonProps = {
  /** Present → this renders a real `Link` (navigation). Absent → a real `Button` (an action) —
   * never a single always-`<a>` shape that would leave a non-focusable anchor when only `onClick`
   * is given. See `render.ts`'s own doc for the full reasoning. */
  href?: string
  /** `Link` case only — same meaning as {@linkcode LinkProps.external} (imported from
   * `components/Link/types.ts`, not restated here to avoid a second, drifting copy of its own
   * doc). No effect when `href` is absent. */
  external?: boolean
  /** `Link` case only — same meaning as `LinkProps.rel`. No effect when `href` is absent. */
  rel?: string
  onClick?: (event: Event) => void
  /** Native `title` attribute — present on both the `Link` and `Button` case (`Button` already
   * had it; `Link` gained it specifically to make this symmetric — see `Link.title`'s own doc). */
  title?: string
  /** `Button` case only — `Link`/`<a>` has no native disabled state of its own, so this has no
   * effect when `href` is given. */
  disabled?: boolean
  /**
   * The one accessible name for this control, carried only by the interactive element itself
   * (`Link.label`/`Button.label`, both already `aria-label`) — never duplicated onto the inner
   * `icon`/`image`, which render decorative instead. Required: an icon-only or image-only control
   * has no reliable visible-text accessible name of its own to fall back to the way a
   * text-`children` `Button`/`Link` does.
   */
  label: string
  /** Rendered via the already-built `Icon`, unmodified — the exact same {@linkcode IconProps}
   * `Icon` itself takes, not a smaller, ImgButton-specific shape. No `label` of its own is ever
   * passed to it: it renders decorative (`aria-hidden`), since {@linkcode label} above already
   * carries the accessible name. Wins over {@linkcode image} when both are given. */
  icon?: IconProps
  /** Rendered via the already-built `Image`, with every capability it already has — `sources`,
   * `placeholder`, `loading`, `fetchPriority`, … — nothing duplicated or reimplemented here. The
   * one exception: `alt` is never read from this object — see `render.ts`'s own doc for why an
   * `Omit<ImageProps, 'alt'>` is the exact type here, not the full `ImageProps`. */
  image?: Omit<ImageProps, 'alt'>
  /** Optional caption text, rendered in a `<span>` alongside the `icon`/`image`, inside the same
   * interactive element. */
  caption?: string
  /** No `id` here, deliberately: neither `Link` nor `Button` (both already-closed) expose a DOM
   * `id` passthrough today, unlike every other component in this package — see `render.ts`'s own
   * doc. Composing them faithfully means not offering a capability they don't actually have. */
  className?: string
}
