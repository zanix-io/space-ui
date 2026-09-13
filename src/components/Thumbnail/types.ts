/**
 * The renderer-agnostic fields of `ThumbnailProps` — everything except `fallback`, whose real type
 * depends on the renderer's own node type (see `render.ts`'s own `ThumbnailRenderProps<Node>` doc
 * for why, the same split `CardBaseProps`/`CardRenderProps<Node>` already establish).
 * `index.ts`/`index.preact.ts` each instantiate the full `ThumbnailProps` with `ReactNode`/
 * `ComponentChildren`. See `render.ts`'s own doc for the full contract.
 */
export type ThumbnailBaseProps = {
  /** Same resolution rules as the root-barrel, comet-safe `Image.src` (an absolute URL passes
   * through untouched; a relative path is NOT auto-resolved here — see `Image/render.ts`'s own
   * doc). Omitted, or a real load failure, both show `fallback` instead. */
  src?: string
  /** Accessible name for the real image. Pass `''` explicitly for genuinely decorative content —
   * still required, same "make forgetting it a compile error" bar `Image.alt` already establishes.
   * Also used, when non-empty, as the fallback's own `aria-label` (`role="img"`) whenever `fallback`
   * is what's actually showing — the same "announce the real subject either way" pattern
   * `Avatar`'s own `name`/initials fallback already establishes. An empty `alt` leaves the fallback
   * `aria-hidden` instead, since there's nothing to announce. */
  alt: string
  /** CORS mode for the image request — same real platform attribute `Image.crossOrigin` already
   * exposes, forwarded through unchanged. Needed whenever `src` is a cross-origin URL served by a
   * host that also sets session-related cookies for that same origin — see `Image.crossOrigin`'s
   * own doc for the full, confirmed session-cookie hazard this lets a caller opt out of. Omitted by
   * default. */
  crossOrigin?: 'anonymous' | 'use-credentials'
  /** Native `loading` attribute, forwarded to `Image` unchanged — browser-native, zero JavaScript. */
  loading?: 'lazy' | 'eager'
  /** Native `decoding` hint, forwarded to `Image` unchanged. @default 'async' */
  decoding?: 'async' | 'sync' | 'auto'
  /** LCP-tuning hint, forwarded to `Image` unchanged. */
  fetchPriority?: 'high' | 'low' | 'auto'
  /** Referrer-Policy for the image request, forwarded to `Image` unchanged. */
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url'
  /** Intrinsic width, forwarded to `Image` unchanged — the browser's own CLS-prevention mechanism. */
  width?: string | number
  /** Intrinsic height, forwarded to `Image` unchanged — same reasoning as {@linkcode width}. */
  height?: string | number
  /** Fires on the native `load` event, in addition to (never instead of) this component's own
   * internal load-state tracking — a plain pass-through, same contract as `Image.onLoad`. */
  onLoad?: (event: Event) => void
  /** Fires on the native `error` event, in addition to (never instead of) this component's own
   * internal load-state tracking — a plain pass-through, same contract as `Image.onError`. */
  onError?: (event: Event) => void
  id?: string
  className?: string
}
