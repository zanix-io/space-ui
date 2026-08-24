/**
 * One `<source>` element inside {@linkcode Image}'s `<picture>` — mirrors the native attributes
 * 1:1, with no breakpoint-name abstraction of any kind. `@zanix/space` has no canonical, importable
 * breakpoint-name set to key this by, and a caller-supplied `media` condition is strictly more
 * general anyway. A caller supplies the real `media` condition and resolved `src` directly, exactly
 * as it would author a `<source>` by hand.
 */
export type ImageSourceProps = {
  /** A media condition, e.g. `'(min-width: 1024px)'` — passed verbatim to the native `media`
   * attribute; the browser (not this component) evaluates it and picks the first match. */
  media: string
  /** Same resolution rules as {@linkcode ImageProps.src} — an absolute URL passes through
   * untouched, a relative path resolves through `@zanix/space`'s `resolveAssetHref`. Rendered
   * onto the real `srcSet` DOM attribute (not `src` — `<source>` inside `<picture>` has no `src`
   * attribute of its own), see `render.ts`'s own doc for that mapping. */
  src: string
  /** MIME type hint, e.g. `'image/avif'`. Optional pass-through only — never inferred from `src`'s
   * extension; MIME detection by extension is a resolver-side concern this component doesn't own. */
  type?: string
}

/**
 * Props for {@linkcode Image}. See `render.ts`'s own doc for the full set of design decisions
 * behind this component's shape.
 */
export type ImageProps = {
  /** Local/relative asset path or absolute URL — same `resolveFileSrc` pattern already used by
   * `Video.src`/`Video.poster`: an absolute URL passes through untouched, a relative path
   * resolves through `@zanix/space`'s `resolveAssetHref` to its real, possibly content-hashed
   * build URL. This is intentionally a plain `string`, not a new `Asset`-shaped type — it's what
   * lets any generated image file (e.g. a video thumbnail, once registered as a normal asset)
   * become an ordinary `src` here, with `Image` never knowing or caring how it was produced. */
  src: string
  /** Required — a real, common accessibility gap, same "make forgetting it a compile error" bar
   * `IFrame.title`/`Video.title` already establish for their own required accessible-name props.
   * Pass `alt=''` explicitly for a genuinely decorative image — still required, so an empty string
   * is a deliberate choice here, never an accidental omission. */
  alt: string
  /** Art-direction breakpoints — an ordered array of `<source>` descriptors, evaluated by the
   * browser in order, same as a hand-authored `<picture>`. Renders a bare `<img>` (no `<picture>`
   * wrapper) when omitted or an empty array — see `render.ts`'s own doc. */
  sources?: ImageSourceProps[]
  /** A plain, already-resolved asset path/URL (same resolution rules as {@linkcode src}) shown
   * while the real image hasn't finished loading — a real, independent capability, not a lazy-
   * loading detail: it's about WHAT is visible in the meantime, not WHEN `src` is fetched (works
   * the same with `loading` set to `'lazy'`, `'eager'`, or left unset). Composes with
   * {@linkcode sources} for free — stays visible regardless of which `<source>` the browser picked.
   * See `render.ts`'s own doc for the full rendering-mechanism reasoning. */
  placeholder?: string
  /** Native `decoding` hint. Defaults to `'async'` — a real, harmless default that never blocks the
   * main thread decoding a large image. */
  decoding?: 'async' | 'sync' | 'auto'
  /** Native `loading` attribute — browser-native, zero JavaScript, same principle
   * `IFrame.loading`/`Video.loading` already establish. Same SEO/Core Web Vitals guidance: leave
   * unset for anything in the initial viewport or an LCP candidate. */
  loading?: 'lazy' | 'eager'
  /** LCP-tuning hint for the browser's own resource scheduler — `'high'` for a known LCP image,
   * `'low'` for a genuinely deprioritized one. Serializes identically on the real `<img>` element
   * in both React's `renderToStaticMarkup` and Preact's
   * `preact-render-to-string` — no casing remap needed, unlike `IFrame`'s
   * `allowFullscreen`/`allowFullScreen` quirk. Note: React 19 additionally emits its own
   * `<link rel="preload" as="image">` resource hint unless this is explicitly set to `'low'` — a
   * real React-specific SSR optimization with no Preact equivalent; see `render.ts`'s own doc for
   * why that's expected and harmless, not a bug in this component. */
  fetchPriority?: 'high' | 'low' | 'auto'
  /** CORS mode for the image request — needed whenever a consumer reads pixel data (e.g. via
   * `<canvas>`) from a cross-origin image. */
  crossOrigin?: 'anonymous' | 'use-credentials'
  /** Referrer-Policy for the image request. */
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url'
  /** Intrinsic width — sets the real `<img width>` attribute, the browser's own CLS-prevention
   * mechanism (it reserves layout space before the image loads, using the width/height ratio, with
   * zero JavaScript). */
  width?: string | number
  /** Optional initial height — same reasoning as {@linkcode width}. */
  height?: string | number
  /** Fires on the native `load` event. */
  onLoad?: (event: Event) => void
  /** Fires on the native `error` event — lets a consumer build its own fallback UI (swap `src`,
   * hide the element, show a placeholder) when an image fails to load. */
  onError?: (event: Event) => void
  /** DOM `id`, same convention as every other component in this package — always on the `<img>`
   * itself, never on the `<picture>` wrapper when one is rendered. See `render.ts`'s own doc for
   * why (`object-fit`/`object-position`/sizing only ever apply to the replaced `<img>` element,
   * never to `<picture>`, which generates no box of its own). */
  id?: string
  /** Same placement rule as {@linkcode id} — always the `<img>`, never `<picture>`. This component
   * applies no `object-fit` (or any other visual) default of its own — `className` is the one
   * styling mechanism this whole package uses. A consumer that wants a fill-and-cover look sets it
   * directly, with full control (`contain` included):
   * `.my-image { width: 100%; height: 100%; object-fit: cover; }`. See `render.ts`'s own doc for
   * the full reasoning. */
  className?: string
}
