import type { CreateElement } from 'typings/renderer.ts'
import type { ImageLoadState } from 'shared/image-load-state.ts'
import { deriveStableCometId } from 'shared/stable-comet-id.ts'
import { createImage } from '../Image/render.ts'
import { getInitials } from './get-initials.ts'
import type { AvatarBaseProps } from './types.ts'
import { AVATAR_SIZE_PX } from './types.ts'

/** The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique `Input/render.ts`'s own `InputHooks` established.
 * `useImageLoadState` is itself a per-renderer hook (`shared/use-image-load-state.ts`/`.preact.ts`),
 * injected the same way `Popover/render.ts`'s own `PopoverHooks.usePosition` already is — it drives
 * the already-broken/already-loaded detection described in "An image already broken before
 * hydration" below. No `useId` here (unlike an earlier version of this file) — see `createAvatar`'s
 * own "Sizing is real, not decorative" doc for why. */
export type AvatarHooks = {
  useRef: <T>(initial: T) => { current: T }
  useImageLoadState: (
    src: string | undefined,
    rootRef: { current: HTMLElement | null },
  ) => ImageLoadState
}

/**
 * The real implementation of `Avatar`, shared identically between the React and Preact bindings.
 * Composes the unmodified, comet-safe, root-barrel `Image` (`Image/render.ts`'s own `createImage`,
 * called with NO resolver injected — the exact same binding `Card`'s own `image` convenience prop
 * already composes, for the identical reason: this keeps `Avatar` itself comet-safe) for the actual
 * image load, and reuses ITS OWN `onError` callback — never a hand-rolled `onerror` handler — to
 * drive the initials fallback, the same "reuse the existing callback-shaped escape hatch" contract
 * `Image.onError`'s own doc already documents for a consumer wanting exactly this ("swap `src`,
 * hide the element, show a placeholder... when an image fails to load").
 *
 * ## Fallback state: derived during render, not a `useEffect`
 *
 * `failed`/`loaded` (from `shared/use-image-load-state.ts`'s own `useImageLoadState`, also this
 * component's own new `Thumbnail` sibling's real second consumer) reset to `false` the moment `src`
 * itself changes to a new value — see that hook's own doc for the full reset mechanism, not
 * repeated here — so a caller swapping to a different, working image after a prior failure shows
 * it immediately on the very next render, with no extra effect-driven render pass in between.
 *
 * ## Sizing is real, not decorative
 *
 * `width`/`height` (resolved from {@linkcode AvatarBaseProps.size}, a named token via
 * `AVATAR_SIZE_PX` or an explicit pixel number) are applied via a self-rendered
 * `<style nonce={nonce}>` element, scoped to this instance via `data-avatar-id` — the same real
 * CLS-prevention/layout-reservation footing `Image.width`/`Image.height` already have, never a
 * "visual opinion" this package's own no-default-styling discipline would otherwise exclude, and
 * never an inline `style` attribute either (a real, confirmed CSP violation under a nonce-based
 * `style-src` this fixes — see `AvatarBaseProps.nonce`'s own doc). `display: 'inline-block'` rides
 * alongside them in that same CSS text for a purely mechanical reason, not a layout opinion: a bare
 * `<span>` is `inline` by default, and `width`/`height` have no effect at all on an inline box per
 * the CSS spec — without this, the two sizing properties above would be silently inert. The actual
 * circular/square treatment (`border-radius`), by contrast, IS purely visual —
 * expressed only via the optional `src/templates/shared/avatar.css` companion keyed off this
 * component's own `data-shape` attribute, never an inline style this file sets itself. See
 * `types.ts`'s own `AvatarShape` doc for the full reasoning, the same "structural CSS lives in an
 * optional companion file" precedent `Card`'s own `card.css` already establishes.
 *
 * `data-avatar-id` is `deriveStableCometId`'s own output (`shared/stable-comet-id.ts`), not the
 * renderer's bare `useId()` an earlier version of this file used — the exact same hydration-root
 * hazard that function's own doc diagnoses for `Menu`/`DatePicker` applies here too: `useId()` is
 * only stable WITHIN one hydration root, counting from wherever that root's render starts, and
 * `Avatar` can end up composed inside a ready-made Comet's own isolated hydration root just as
 * easily as either of those (a page rendering more than one `Avatar` inside a Comet boundary is the
 * common case, not an edge case, unlike `NavDrawer`'s own single `Menu`). Seeded from `name` and the
 * resolved `pixels` (never `shape`, which the sizing CSS itself never reads) — both already
 * identical between the server render and the client hydration, since they're plain props. Two
 * `Avatar`s sharing the exact same `name` AND the same resolved size collide on id, same accepted,
 * narrow residual `Menu`'s own doc already documents — harmless here specifically, since colliding
 * instances would compute the identical `sizeCss` anyway.
 *
 * ## Accessible name: always `name`, image or fallback either way
 *
 * The image branch passes {@linkcode AvatarBaseProps.name} straight through as `Image`'s own
 * required `alt`. The fallback branch renders `role="img"` with `aria-label={name}` on the very
 * same wrapper the visible initials sit inside — the standard "a decorative glyph standing in for a
 * real image" pattern, so a screen reader announces the person's name either way, never the literal
 * two-letter initials themselves.
 *
 * ## An image already broken (or already loaded) before hydration
 *
 * `onError`/`onLoad` only catch an event that happens AFTER they're attached — a server-rendered
 * `<img>` can already have failed, or already have finished loading, by the time this component's
 * own client bundle hydrates (especially likely for a fast DNS/404 failure or a cache hit), and
 * that native event, having fired on an element with no listener yet, is gone for good. A
 * `complete`/`naturalWidth` synchronous probe on mount can't cover this: `jsdom`/`happy-dom` report
 * EVERY `<img>` as `complete: true, naturalWidth: 0` regardless of real load state (neither
 * environment actually fetches/decodes images), making that signal indistinguishable from
 * "genuinely already failed" — a real, unusable false positive, not just a test inconvenience,
 * since the exact same ambiguity exists for a real `<img>` a real browser hasn't started loading
 * yet.
 *
 * `shared/use-image-load-state.ts`'s own `useImageLoadState` closes this gap via
 * `HTMLImageElement.decode()`, which has no such ambiguity: it returns a promise that resolves once
 * the image is decoded and ready, or rejects if it can't be — either way reflecting whatever
 * already happened before this hook's own effect ever ran, since a real browser keeps that
 * resolved/failed state on the element rather than discarding it. See that hook's own doc for the
 * full mechanism (why `decode()`, why a `querySelector` scoped to `rootRef`'s own subtree rather
 * than a ref threaded into `Image` itself, which deliberately exposes none). `happy-dom`'s own
 * `decode()` is a permanently-resolving stub — real per-environment behavior, not a workaround here
 * — so this package's own test suite exercises the rejection path by overriding
 * `HTMLImageElement.prototype.decode` directly rather than relying on a real failure `happy-dom`
 * can't simulate; see `avatar.test.tsx`/`avatar-preact.test.tsx`'s own "decode() rejects" tests.
 *
 * ## `data-loaded`/`data-pending` — a real state, not just fail-vs-not
 *
 * The root `<span>` carries `data-loaded="true"` once the image has confirmed-loaded, or
 * `data-pending="true"` while a real `src` is set and neither `loaded` nor `failed` has resolved
 * yet — never both, and neither at all once the initials fallback is showing (nothing left
 * pending or loaded once there's no image in the DOM). A consumer wanting a pending-state visual
 * treatment (a pulse, a dimmed image) targets `[data-space-ui='avatar'][data-pending]` in its own
 * CSS — this component ships no default look for it, same "`className`/`data-*` are the only
 * styling mechanism" discipline every component here follows.
 *
 * ## `crossOrigin` — opt-in, forwarded unchanged to `Image`
 *
 * See {@linkcode AvatarBaseProps.crossOrigin}'s own doc for the real, confirmed session-cookie
 * hazard this exists to let a caller opt out of. `Avatar` itself takes no position on whether
 * `src` needs it — this component only forwards whatever the caller passes straight through to
 * the underlying `Image({ ..., crossOrigin })` call, same as every other pass-through prop here.
 */
export function createAvatar<E>(
  h: CreateElement<E>,
  hooks: AvatarHooks,
): (props: AvatarBaseProps) => E {
  // No resolver injected — the comet-safe, root-barrel `Image` (see this function's own doc for
  // why that's what keeps `Avatar` itself comet-safe).
  const Image = createImage<E>(h)

  return function Avatar(props: AvatarBaseProps): E {
    const { name, src, shape = 'circle', size = 'md', id, className, nonce, crossOrigin } = props

    const pixels = typeof size === 'number' ? size : AVATAR_SIZE_PX[size]
    const avatarId = deriveStableCometId(JSON.stringify({ name, pixels }), 'avatar')
    const sizeCss =
      `[data-avatar-id='${avatarId}']{display:inline-block;width:${pixels}px;height:${pixels}px}`

    const rootRef = hooks.useRef<HTMLSpanElement | null>(null)
    const { failed, loaded, onLoad, onError } = hooks.useImageLoadState(src, rootRef)

    const showImage = Boolean(src) && !failed

    const content = showImage
      ? Image({ src: src as string, alt: name, crossOrigin, onLoad, onError })
      : h(
        'span',
        { role: 'img', 'aria-label': name, 'data-space-ui': 'avatar-initials' },
        getInitials(name),
      )

    return h(
      'span',
      {
        id,
        className,
        ref: rootRef,
        'data-space-ui': 'avatar',
        'data-shape': shape,
        'data-avatar-id': avatarId,
        'data-loaded': showImage && loaded ? 'true' : undefined,
        'data-pending': showImage && !loaded ? 'true' : undefined,
      },
      h('style', { key: 'style', nonce }, sizeCss),
      content,
    )
  }
}
