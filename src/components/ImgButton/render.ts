import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createIcon } from '../Icon/render.ts'
import { createImage } from '../Image/render.ts'
import { createLink } from '../Link/render.ts'
import type { ImgButtonBaseProps } from './types.ts'

/** {@linkcode ImgButtonBaseProps} plus `visual`, generic over the renderer's own node type —
 * `index.ts`/`index.preact.ts` each instantiate this as their own public `ImgButtonProps`.
 *
 * `visual` is a render-prop slot — same calling convention as `Menu`'s own `MenuRenderItem.visual`
 * (`() => Node`, the caller supplies an already-built element rather than a data shape this
 * component resolves itself). `icon` → `visual` → `image` is the full precedence when more than one
 * is given — see this function's own doc for the full reasoning. */
export type ImgButtonRenderProps<Node> = ImgButtonBaseProps & {
  visual?: () => Node
}

/**
 * A composition of `Button`/`Link` + `Icon`/`Image` — not a new implementation of anything those
 * already do. No hooks, no state, no viewport detection of any kind: `useResolution`, `window`, a
 * resize listener, and `IntersectionObserver` are all absent from this file — every responsive
 * capability this component's `icon` case has comes entirely from composing the already-responsive
 * `Icon`; the `visual` case simply renders whatever caller-supplied element it's given; `image`
 * delegates entirely to the comet-safe root-barrel `Image`.
 *
 * ## `href` decides between `Link` and `Button`
 *
 * Present → this composes `Link` (real navigation, `external`/`rel` apply, `Link.title` from this
 * component's own `title`). Absent → this composes `Button` (a real action — `disabled` applies,
 * `type="button"` by default from `Button` itself). The component this rescues always rendered a
 * single `<a>`, with or without `href` — when only `onClick` was given (no `href`), that produced
 * a real, non-focusable anchor: an `<a>` with no `href` has no native interactive semantics or
 * keyboard focus at all, per the HTML spec, whether or not it has a click handler. This is not a
 * cosmetic difference — the fixed version composes exactly the element that already carries the
 * right semantics for each case, the same "navigation belongs on `<a>`, an action belongs on
 * `<button>`" split `Link`/`Button` already establish independently of this component.
 *
 * ## `icon` → `visual` → `image` — one accessible name, decorative visuals
 *
 * `icon` is the real `IconProps` `Icon` itself takes — never a smaller, ImgButton-specific shape.
 * `visual` is a render-prop slot (see {@linkcode ImgButtonRenderProps.visual}'s own doc) — the
 * caller supplies an already-built element (their own `Image` instance, resolved server-side
 * outside a Comet exactly as `@zanix/space`'s own `formatServerOnlyViolation` guidance already
 * directs, a plain `<img>`, anything at all) rather than a data shape this component resolves
 * itself. `image` ({@linkcode ImgButtonBaseProps.image}) is convenience sugar on top: when neither
 * `icon` nor `visual` is given, this internally builds the visual as `Image({ ...image, alt: '' })`
 * — the comet-safe, root-barrel `Image` from `../Image/render.ts`'s own now-resolver-agnostic
 * `createImage` factory, called here with NO resolver injected (see that file's own module doc for
 * the full two-binding shape). This is safe precisely BECAUSE `Image/render.ts` no longer has a
 * hardcoded `@zanix/space` import: a static ES import is unconditionally hoisted regardless of
 * runtime branching, so composing `Image` here reaches `@zanix/space`'s own `resolveAssetHref` only
 * if this file's own `createImage(h, resolveHref)` call actually passes one — it doesn't, so
 * `ImgButton` stays fully comet-safe with `image` composed. None of `icon`/`visual`/`image` are a
 * discriminated union — `icon` wins over both, `visual` wins over `image` (an explicit render-prop
 * always beats the convenience shorthand when both are given, since the caller opted into more
 * control), the same precedence the component this rescues had for `icon` over `image`, made
 * explicit here rather than left to guess at.
 *
 * The accessible name lives in exactly one place: {@linkcode ImgButtonBaseProps.label}, on the
 * interactive element itself (`Link`/`Button`'s own `label` → `aria-label`). None of `icon`/
 * `visual`/`image` ever receives it: `Icon` gets no `label` of its own, so it renders decorative
 * (`aria-hidden`) per its own already-established default; a `visual()` result is rendered exactly
 * as the caller built it, so keeping it decorative (e.g. `Image`'s own `alt=''`) is the caller's own
 * responsibility, same as `Menu`'s own `visual` render-prop; `image` is built with `alt: ''` here,
 * always, never the caller's choice. The component this rescues applied the SAME `ariaLabel` text
 * to both the link and the icon/image inside it — redundant double-labeling, not a capability worth
 * carrying forward; a screen reader announcing the control's own accessible name once, with a
 * purely decorative visual inside it, is the correct pattern.
 *
 * ## Deliberately dropped, each with its own real argument
 *
 * - **The wrapping `<div>`** — the component this rescues wrapped everything in a `<div>` whose
 *   only job was carrying now-discarded styling classes; it had no functional or accessibility
 *   role of its own. This component's own root IS the `Link`/`Button` it composes.
 * - **`float`** (a hardcoded fixed-position visual variant) — a styling opinion, same "className is
 *   the one styling mechanism this package uses" principle already applied everywhere else; a
 *   consumer positions a floating instance with their own `className`.
 * - **`format`** (i18n interpolation) — this package's own "already-resolved data as props"
 *   principle, same reasoning already applied to every other component here.
 * - **`decoding="sync"` and a default square `aspectRatio`** — both were defaults the component
 *   this rescues forced onto its own inner image; neither is reintroduced here — a caller building
 *   an `Image`-backed `visual()` keeps full control over `Image`'s own already-decided defaults
 *   (`decoding='async'`, no aspect-ratio default of any kind), untouched.
 *
 * A known, accepted trade-off, same one already documented in `Card/render.ts`: when both
 * `icon`/`visual` and `caption` are given, `children` here is a short array (visual + `<span>`),
 * and neither `Icon` nor `Link`/`Button` accept or forward a `key` — so React's dev-mode console
 * warns about a missing one. The array is entirely rebuilt from props on every render, with no
 * internal state in any item, so the real risk that warning exists to flag doesn't apply.
 *
 * A gap found during composition, not silently patched: neither `Link` nor `Button` (both
 * already-closed) expose a DOM `id` passthrough today, unlike every other component in this
 * package. `ImgButtonBaseProps` deliberately doesn't offer `id` either — composing them faithfully
 * means not promising a capability they don't actually have; adding `id` to two more already-
 * closed components wasn't part of what this component's own composition was authorized to
 * change (unlike `Link.title`, added specifically for this).
 */
export function createImgButton<E>(h: CreateElement<E>): (props: ImgButtonRenderProps<E>) => E {
  const Link = createLink(h)
  const Button = createButton(h)
  const Icon = createIcon(h)
  // No resolver injected — the comet-safe, root-barrel `Image` (see this function's own doc for
  // why that's what keeps `ImgButton` itself comet-safe with `image` composed).
  const Image = createImage(h)

  return function ImgButton(props: ImgButtonRenderProps<E>): E {
    const {
      href,
      external,
      rel,
      onClick,
      title,
      disabled,
      label,
      icon,
      visual,
      image,
      caption,
      className,
    } = props

    const decorativeVisual = icon
      ? Icon(icon)
      : visual
      ? visual()
      : image
      ? Image({ ...image, alt: '' })
      : undefined
    const children = caption === undefined
      ? decorativeVisual
      : [decorativeVisual, h('span', null, caption)]

    if (href !== undefined) {
      return Link({ href, external, rel, onClick, title, label, className, children })
    }

    return Button({ onClick, title, disabled, label, className, children })
  }
}
