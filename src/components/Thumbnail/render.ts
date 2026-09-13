import type { CreateElement } from 'typings/renderer.ts'
import type { ImageLoadState } from 'shared/image-load-state.ts'
import { createImage } from '../Image/render.ts'
import { createSkeleton } from '../Skeleton/render.ts'
import type { ThumbnailBaseProps } from './types.ts'

/** {@linkcode ThumbnailBaseProps} plus `fallback`, generic over the renderer's own node type —
 * `index.ts`/`index.preact.ts` each instantiate this as their own public `ThumbnailProps`, same
 * split `CardBaseProps`/`CardRenderProps<Node>` already establish. */
export type ThumbnailRenderProps<Node> = ThumbnailBaseProps & {
  /** Render-prop slot for the caller-owned fallback content shown whenever `src` is omitted, or the
   * image fails to load — an already-built element (a gallery icon, a video-camera glyph, anything),
   * never a data shape this component resolves itself, same calling convention as `Card.visual`/
   * `ImgButton.visual`/`Menu.visual` (`() => Node`). Required, not optional: unlike `Avatar` (which
   * always has a real derivable fallback — the person's own initials), this component has no
   * sensible built-in default to fall back to without one — a fixed, hardcoded icon here would bake
   * one consumer's visual choice into every consumer, exactly what this package's own
   * `className`-only styling discipline exists to avoid. */
  fallback: () => Node
}

/** The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique `Avatar/render.ts`'s own `AvatarHooks` establishes.
 * `useImageLoadState` is itself a per-renderer hook (`shared/use-image-load-state.ts`/`.preact.ts`)
 * — the same real second consumer `Avatar`'s own doc already anticipated. */
export type ThumbnailHooks = {
  useRef: <T>(initial: T) => { current: T }
  useImageLoadState: (
    src: string | undefined,
    rootRef: { current: HTMLElement | null },
  ) => ImageLoadState
}

/**
 * A non-person image with a caller-supplied fallback and a real, confirmed pending/loaded/failed
 * state exposed as `data-*` attributes — the generic sibling `Avatar` deliberately isn't: `Avatar`'s
 * own fallback is always the subject's initials (a person), while a product photo, a video
 * thumbnail, or any other non-person image content has no equivalent derivable stand-in, so the
 * fallback content here is always caller-supplied instead (see {@linkcode ThumbnailRenderProps.fallback}).
 *
 * Composes the unmodified, comet-safe, root-barrel `Image` (`Image/render.ts`'s own `createImage`,
 * called with NO resolver injected — the same binding `Avatar`/`Card`'s own `image` convenience prop
 * already compose, for the identical reason: this keeps `Thumbnail` itself comet-safe) for the real
 * image, and `shared/use-image-load-state.ts`'s own `useImageLoadState` (extracted from `Avatar`'s
 * own previously-inline `onError`/`decode()` pair once this component needed the identical
 * mechanism) for the real pending/loaded/failed detection — including a load or a failure that
 * already happened before hydration, the same gap that hook's own doc covers in full.
 *
 * ## `data-loaded`/`data-pending` on the root, always — `Avatar` mirrors this too
 *
 * Unlike `Avatar` (whose fallback is meaningful content in its own right — the person's initials,
 * shown indefinitely), this component's `fallback` typically stands in for a REAL image a consumer
 * still wants to show once one becomes available — so a pending visual treatment matters here from
 * day one, not as an afterthought. The root element carries `data-loaded="true"` once the real image
 * has confirmed-loaded, or `data-pending="true"` while `src` is set and neither has resolved yet —
 * never both, and neither at all once `fallback` is what's actually showing (no src, or a confirmed
 * failure). This package ships no default look for either state — a consumer wanting a pulse/dim
 * treatment targets `[data-space-ui='thumbnail'][data-pending]` in its own CSS, the same
 * `className`/`data-*`-only styling discipline every component here follows.
 *
 * ## `Skeleton` composed as the pending placeholder, not reimplemented
 *
 * While pending, this component also mounts the unmodified `Skeleton` (`data-space-ui="skeleton"`,
 * inheriting that hook itself — this component's own root keeps its own `"thumbnail"` hook, since
 * the root isn't itself a `Skeleton`, the same "composed markup inherits its OWN hook, the composing
 * root keeps its own" split `Card`'s own composed `Image`/`Link` already establish) as a sibling of
 * the real, still-loading `<img>` — never instead of it, since the real `<img>` has to stay mounted
 * for the load/decode detection above to have anything to observe. `Skeleton` itself ships no
 * width/height/shape/animation opinion of its own (see its own doc) — composing it here costs
 * nothing beyond what a consumer already invested in styling `[data-space-ui='skeleton']`
 * elsewhere, and gives that investment a free second use here, with the actual stacking/overlay
 * treatment (if any) left entirely to the consumer's own CSS, same as everywhere else in this
 * package. `Skeleton` unmounts the moment `loaded`/`failed` resolves either way — a consumer never
 * needs to hide it manually.
 *
 * ## Accessible name: `alt` either way, never the literal fallback content
 *
 * The image branch passes {@linkcode ThumbnailBaseProps.alt} straight through as `Image`'s own
 * required `alt`. The fallback branch renders `role="img"` with `aria-label={alt}` on the same
 * wrapper `fallback()` sits inside, whenever `alt` is non-empty — the same "a decorative glyph
 * standing in for a real image" pattern `Avatar`'s own initials fallback already establishes — or
 * plain `aria-hidden` when `alt` is `''` (a caller who declared the image itself decorative has
 * nothing meaningful for the fallback to announce either).
 *
 * ## `crossOrigin` — opt-in, forwarded unchanged to `Image`
 *
 * See {@linkcode ThumbnailBaseProps.crossOrigin}'s own doc for the real, confirmed session-cookie
 * hazard this exists to let a caller opt out of.
 */
export function createThumbnail<E>(
  h: CreateElement<E>,
  hooks: ThumbnailHooks,
): (props: ThumbnailRenderProps<E>) => E {
  // No resolver injected — the comet-safe, root-barrel `Image` (see this function's own doc for why
  // that's what keeps `Thumbnail` itself comet-safe).
  const Image = createImage<E>(h)
  const Skeleton = createSkeleton<E>(h)

  return function Thumbnail(props: ThumbnailRenderProps<E>): E {
    const {
      src,
      alt,
      fallback,
      crossOrigin,
      loading,
      decoding,
      fetchPriority,
      referrerPolicy,
      width,
      height,
      onLoad: onLoadProp,
      onError: onErrorProp,
      id,
      className,
    } = props

    const rootRef = hooks.useRef<HTMLSpanElement | null>(null)
    const { failed, loaded, onLoad, onError } = hooks.useImageLoadState(src, rootRef)

    const showImage = Boolean(src) && !failed
    const pending = showImage && !loaded

    const fallbackWrapper = h(
      'span',
      {
        'data-space-ui': 'thumbnail-fallback',
        role: alt ? 'img' : undefined,
        'aria-label': alt || undefined,
        'aria-hidden': alt ? undefined : 'true',
      },
      fallback(),
    )

    const imageEl = showImage
      ? Image({
        src: src as string,
        alt,
        crossOrigin,
        loading,
        decoding,
        fetchPriority,
        referrerPolicy,
        width,
        height,
        onLoad: (event: Event) => {
          onLoad()
          onLoadProp?.(event)
        },
        onError: (event: Event) => {
          onError()
          onErrorProp?.(event)
        },
      })
      : fallbackWrapper

    return h(
      'span',
      {
        id,
        className,
        ref: rootRef,
        'data-space-ui': 'thumbnail',
        'data-loaded': showImage && loaded ? 'true' : undefined,
        'data-pending': pending ? 'true' : undefined,
      },
      imageEl,
      // A sibling of the real `<img>`, never a replacement for it — see this function's own doc
      // for why the real image stays mounted (and thus able to load/decode) the whole time it's
      // pending. `null` is silently skipped by both renderers once resolved either way.
      pending ? Skeleton({}) : null,
    )
  }
}
