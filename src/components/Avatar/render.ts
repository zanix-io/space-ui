import type { CreateElement } from 'typings/renderer.ts'
import { createImage } from '../Image/render.ts'
import { getInitials } from './get-initials.ts'
import type { AvatarBaseProps } from './types.ts'
import { AVATAR_SIZE_PX } from './types.ts'

/** The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique `Input/render.ts`'s own `InputHooks` established. `useId` scopes
 * this component's own sizing CSS to a single instance — see `createAvatar`'s own "Sizing is real,
 * not decorative" doc. `useEffect` drives the already-broken-image detection described in "An
 * image already broken before hydration" below. */
export type AvatarHooks = {
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
  useId: () => string
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useRef: <T>(initial: T) => { current: T }
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
 * `imageFailed` resets to `false` the moment `src` itself changes to a new value — computed
 * synchronously during render (comparing against a `previousSrc` state slot, same technique
 * `MultiSelect/render.ts`'s own `optionsKey`/`previousOptionsKey` reset already establishes) rather
 * than a `useEffect`, so a caller swapping to a different, working image after a prior failure
 * shows it immediately on the very next render, with no extra effect-driven render pass in between.
 *
 * ## Sizing is real, not decorative
 *
 * `width`/`height` (resolved from {@linkcode AvatarBaseProps.size}, a named token via
 * `AVATAR_SIZE_PX` or an explicit pixel number) are applied via a self-rendered
 * `<style nonce={nonce}>` element, scoped to this instance via `useId` — the same real
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
 * ## Accessible name: always `name`, image or fallback either way
 *
 * The image branch passes {@linkcode AvatarBaseProps.name} straight through as `Image`'s own
 * required `alt`. The fallback branch renders `role="img"` with `aria-label={name}` on the very
 * same wrapper the visible initials sit inside — the standard "a decorative glyph standing in for a
 * real image" pattern, so a screen reader announces the person's name either way, never the literal
 * two-letter initials themselves.
 *
 * ## An image already broken before hydration
 *
 * `onError` only catches a failure that happens AFTER it's attached — a server-rendered `<img>`
 * can already have failed to load by the time this component's own client bundle hydrates
 * (especially likely for a fast DNS/404 failure), and that native `error` event, having fired on
 * an element with no listener yet, is gone for good. A `complete`/`naturalWidth` synchronous probe
 * on mount can't cover this: `jsdom`/`happy-dom` report EVERY `<img>` as `complete: true,
 * naturalWidth: 0` regardless of real load state (neither environment actually fetches/decodes
 * images), making that signal indistinguishable from "genuinely already failed" — a real, unusable
 * false positive, not just a test inconvenience, since the exact same ambiguity exists for a real
 * `<img>` a real browser hasn't started loading yet.
 *
 * `HTMLImageElement.decode()` doesn't have that ambiguity: it returns a promise that resolves once
 * the image is decoded and ready, or rejects if it can't be — including an image whose failure
 * already happened before this effect ever ran, since a real browser keeps that failed state on
 * the element rather than discarding it. An effect (client-only, so this never runs during SSR)
 * finds this instance's own `<img>` via a ref on the ROOT `<span>` (never one threaded into
 * `Image` itself, which deliberately exposes none — see its own doc; `querySelector('img')` inside
 * this component's own subtree is what reaches the real `<img>` `Image` renders) and calls
 * `decode()` once per `src`; a rejection swaps to the initials fallback the same way `onError`
 * does. Both mechanisms stay registered side by side rather than one replacing the other: `onError`
 * is cheaper and already covers the ordinary "fails after hydration" case with no promise
 * overhead, and an environment where `decode` isn't a function (feature-detected, never assumed)
 * falls back to `onError` alone, exactly today's behavior. `happy-dom`'s own `decode()` is a
 * permanently-resolving stub — real per-environment behavior, not a workaround here — so this
 * package's own test suite exercises the rejection path by overriding
 * `HTMLImageElement.prototype.decode` directly rather than relying on a real failure `happy-dom`
 * can't simulate; see `avatar.test.tsx`/`avatar-preact.test.tsx`'s own "decode() rejects" tests.
 */
export function createAvatar<E>(
  h: CreateElement<E>,
  hooks: AvatarHooks,
): (props: AvatarBaseProps) => E {
  // No resolver injected — the comet-safe, root-barrel `Image` (see this function's own doc for
  // why that's what keeps `Avatar` itself comet-safe).
  const Image = createImage<E>(h)

  return function Avatar(props: AvatarBaseProps): E {
    const { name, src, shape = 'circle', size = 'md', id, className, nonce } = props

    const avatarId = hooks.useId()
    const pixels = typeof size === 'number' ? size : AVATAR_SIZE_PX[size]
    const sizeCss =
      `[data-avatar-id='${avatarId}']{display:inline-block;width:${pixels}px;height:${pixels}px}`

    const [previousSrc, setPreviousSrc] = hooks.useState(src)
    const [imageFailed, setImageFailed] = hooks.useState(false)
    if (src !== previousSrc) {
      setPreviousSrc(src)
      setImageFailed(false)
    }

    const rootRef = hooks.useRef<HTMLSpanElement | null>(null)

    // Catches a failure that already happened before this effect ran — see this function's own
    // "An image already broken before hydration" doc above for the full "why `decode()`, why a
    // `querySelector` scoped to this instance's own root rather than a ref threaded into `Image`".
    hooks.useEffect(() => {
      if (!src) return
      const img = rootRef.current?.querySelector('img')
      if (!img || typeof img.decode !== 'function') return
      let cancelled = false
      img.decode().catch(() => {
        if (!cancelled) setImageFailed(true)
      })
      return () => {
        cancelled = true
      }
    }, [src])

    const showImage = Boolean(src) && !imageFailed

    const content = showImage
      ? Image({ src: src as string, alt: name, onError: () => setImageFailed(true) })
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
      },
      h('style', { key: 'style', nonce }, sizeCss),
      content,
    )
  }
}
