import { useEffect, useState } from 'preact/hooks'
import type { ImageLoadState } from './image-load-state.ts'

export type { ImageLoadState } from './image-load-state.ts'

/**
 * The real, confirmed load/fail signal for an `<img>` this component doesn't fully control the
 * mount timing of — see `use-image-load-state.ts`'s own doc for the full contract, not repeated
 * here. Preact binding, same behavior; import `use-image-load-state.ts` instead for the React one.
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
