import { useEffect, useState } from 'react'
import type { ImageLoadState } from './image-load-state.ts'

export type { ImageLoadState } from './image-load-state.ts'

/**
 * The real, confirmed load/fail signal for an `<img>` this component doesn't fully control the
 * mount timing of — `Avatar/render.ts`'s own onError/`decode()` pair, extracted here once
 * `Thumbnail` needed the identical mechanism for non-person image content (a product photo, a
 * video thumbnail, ...). React binding — see `use-image-load-state.preact.ts` for the Preact one.
 *
 * Returns {@linkcode ImageLoadState} (defined in the dependency-free `shared/image-load-state.ts`
 * — see that file's own doc for why the type lives there rather than here).
 */

/**
 * `src` resets both `failed`/`loaded` back to `false` the moment it changes to a new value —
 * computed synchronously during render (comparing against a `previousSrc` state slot), the same
 * technique `MultiSelect/render.ts`'s own `optionsKey`/`previousOptionsKey` reset already
 * establishes, so a caller swapping to a different image shows the new one's own state immediately
 * on the very next render, never a stale `failed`/`loaded` value left over from the prior `src`.
 *
 * ## Why `decode()`, not just `onLoad`/`onError`
 *
 * Both native events only fire for whatever happens AFTER a listener is attached — a
 * server-rendered `<img>` can already have finished loading, or already have failed, by the time
 * this hook's own effect runs on hydration (especially likely for a fast cache hit or a fast
 * DNS/404 failure); neither event fires a second time for something that already happened.
 * `HTMLImageElement.decode()` doesn't have that gap: it returns a promise that resolves once the
 * image is decoded and ready, or rejects if it can't be — including a state the element already
 * reached before this effect ever ran, since a real browser keeps that resolved/failed state on
 * the element itself rather than discarding it. This hook queries `rootRef`'s own subtree for the
 * real `<img>` (never a ref threaded through `Image` itself, which exposes none — see its own doc)
 * and calls `decode()` once per `src`; both mechanisms — the native event AND `decode()` — stay
 * registered side by side rather than one replacing the other: the native event is cheaper and
 * already covers the ordinary "resolves/fails after hydration" case with no promise overhead, and
 * an environment where `decode` isn't a function (feature-detected, never assumed) simply skips the
 * probe, falling back to the native events alone.
 *
 * @param src - The value identifying which image is currently being loaded — `undefined` when
 * nothing is set at all. Resetting `failed`/`loaded` is keyed on THIS value changing, not on any
 * render-count or timer.
 * @param rootRef - A ref to an ancestor element containing the real `<img>` this state tracks
 * (queried via `.querySelector('img')` inside the effect below) — never a ref threaded into
 * `Image` itself.
 */
export function useImageLoadState(
  src: string | undefined,
  rootRef: { current: HTMLElement | null },
): ImageLoadState {
  const [previousSrc, setPreviousSrc] = useState(src)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (src !== previousSrc) {
    setPreviousSrc(src)
    setFailed(false)
    setLoaded(false)
  }

  useEffect(() => {
    if (!src) return
    const img = rootRef.current?.querySelector('img')
    if (!img || typeof img.decode !== 'function') return
    let cancelled = false
    img.decode().then(() => {
      if (!cancelled) setLoaded(true)
    }).catch(() => {
      if (!cancelled) setFailed(true)
    })
    return () => {
      cancelled = true
    }
  }, [src])

  return {
    failed,
    loaded,
    onLoad: () => setLoaded(true),
    onError: () => setFailed(true),
  }
}
