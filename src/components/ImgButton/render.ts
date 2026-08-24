import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createIcon } from '../Icon/render.ts'
import { createImage } from '../Image/render.ts'
import { createLink } from '../Link/render.ts'
import type { ImgButtonProps } from './types.ts'

/**
 * A composition of `Button`/`Link` + `Icon`/`Image` — not a new implementation of anything those
 * already do. No hooks, no state, no viewport detection of any kind: `useResolution`, `window`, a
 * resize listener, and `IntersectionObserver` are all absent from this file — every responsive
 * capability this component has comes entirely from composing the already-responsive
 * `Image`/`Icon`, nothing reimplemented here.
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
 * ## `icon`/`image` — exact existing types, one accessible name, decorative visuals
 *
 * Both are the real `IconProps`/`ImageProps` `Icon`/`Image` already export — never a smaller,
 * ImgButton-specific shape (the component this rescues had exactly that: a reduced `ImgProps`
 * subset of what its own `Image` equivalent already supported even then). Composing the current
 * `Image` here means `sources`, `placeholder`, native `loading`, `fetchPriority`, … all work
 * exactly as they do standalone — nothing about responsive images, art direction, or asset
 * resolution is reimplemented in this file. Plain optional props, not a discriminated union —
 * `icon` wins when both are given, the same implicit precedence the component this rescues had,
 * made explicit here rather than left to guess at.
 *
 * The accessible name lives in exactly one place: {@linkcode ImgButtonProps.label}, on the
 * interactive element itself (`Link`/`Button`'s own `label` → `aria-label`). Neither `icon` nor
 * `image` ever receives it: `Icon` gets no `label` of its own, so it renders decorative
 * (`aria-hidden`) per its own already-established default; `Image` always gets `alt=''`,
 * regardless of what the caller supplies, which is exactly why `ImgButtonProps.image` is typed
 * `Omit<ImageProps, 'alt'>` rather than the bare `ImageProps` — the field is never read, so it's
 * not offered as if it were. The component this rescues applied the SAME `ariaLabel` text to both
 * the link and the icon/image inside it — redundant double-labeling, not a capability worth
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
 *   this rescues forced onto its own inner image; neither is reintroduced here. The composed
 *   `Image` keeps exactly its own already-decided defaults (`decoding='async'`, no aspect-ratio
 *   default of any kind) untouched.
 *
 * A known, accepted trade-off, same one already documented in `Card/render.ts`: when both `icon`/
 * `image` and `caption` are given, `children` here is a short array (visual + `<span>`), and
 * neither `Icon`/`Image` nor `Link`/`Button` accept or forward a `key` — so React's dev-mode
 * console warns about a missing one. The array is entirely rebuilt from props on every render,
 * with no internal state in any item, so the real risk that warning exists to flag doesn't apply.
 *
 * A gap found during composition, not silently patched: neither `Link` nor `Button` (both
 * already-closed) expose a DOM `id` passthrough today, unlike every other component in this
 * package. `ImgButtonProps` deliberately doesn't offer `id` either — composing them faithfully
 * means not promising a capability they don't actually have; adding `id` to two more already-
 * closed components wasn't part of what this component's own composition was authorized to
 * change (unlike `Link.title`, added specifically for this).
 */
export function createImgButton<E>(h: CreateElement<E>): (props: ImgButtonProps) => E {
  const Link = createLink(h)
  const Button = createButton(h)
  const Icon = createIcon(h)
  const Image = createImage(h)

  return function ImgButton(props: ImgButtonProps): E {
    const {
      href,
      external,
      rel,
      onClick,
      title,
      disabled,
      label,
      icon,
      image,
      caption,
      className,
    } = props

    const visual = icon ? Icon(icon) : image ? Image({ ...image, alt: '' }) : undefined
    const children = caption === undefined ? visual : [visual, h('span', null, caption)]

    if (href !== undefined) {
      return Link({ href, external, rel, onClick, title, label, className, children })
    }

    return Button({ onClick, title, disabled, label, className, children })
  }
}
