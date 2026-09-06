import type { IconProps } from 'components/Icon/types.ts'
import type { ImageProps } from 'components/Image/types.ts'

/**
 * The renderer-agnostic fields of {@linkcode ImgButtonProps} — everything except `visual`, whose
 * real type depends on the renderer's own node type (see `render.ts`'s own `ImgButtonRenderProps<Node>`
 * doc for why, the same split {@linkcode MenuItemFields}/`MenuRenderItem<Node>` already establish).
 * `index.ts`/`index.preact.ts` each instantiate the full `ImgButtonProps` with `ReactNode`/
 * `ComponentChildren`. See `render.ts`'s own doc for the full contract: how `href` decides between
 * composing `Link` and `Button`, and how `icon`/`visual`/`image` are handled.
 */
export type ImgButtonBaseProps = {
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
   * `icon`/`visual`, which render decorative instead. Required: an icon-only or image-only control
   * has no reliable visible-text accessible name of its own to fall back to the way a
   * text-`children` `Button`/`Link` does.
   */
  label: string
  /** Rendered via the already-built `Icon`, unmodified — the exact same {@linkcode IconProps}
   * `Icon` itself takes, not a smaller, ImgButton-specific shape. No `label` of its own is ever
   * passed to it: it renders decorative (`aria-hidden`), since {@linkcode label} above already
   * carries the accessible name. Wins over both `visual` and `image` when more than one is given —
   * see `render.ts`'s own doc for the full precedence. */
  icon?: IconProps
  /** Convenience sugar for the common case: builds the decorative visual as `Image({ ...image, alt:
   * '' })`, using the comet-safe, root-barrel `Image` (never `@zanix/space-ui/runtime/image`'s
   * auto-resolving one — see `render.ts`'s own doc for why). `Omit<ImageProps, 'alt'>` because this
   * visual is always decorative (same reasoning `icon` already has no `label` of its own): `alt`
   * isn't a caller decision here. Loses to `visual` when both are given — an explicit render-prop
   * always wins over this shorthand, since the caller opted into more control. A relative `src`
   * here is NOT auto-resolved (root-barrel `Image`'s own documented boundary — see
   * `components/Image/index.ts`'s own doc); an already-absolute URL (the common case) works exactly
   * as expected. */
  image?: Omit<ImageProps, 'alt'>
  /** Optional caption text, rendered in a `<span>` alongside the `icon`/`visual`/`image`, inside the
   * same interactive element. */
  caption?: string
  /** No `id` here, deliberately: neither `Link` nor `Button` (both already-closed) expose a DOM
   * `id` passthrough today, unlike every other component in this package — see `render.ts`'s own
   * doc. Composing them faithfully means not offering a capability they don't actually have. */
  className?: string
}
