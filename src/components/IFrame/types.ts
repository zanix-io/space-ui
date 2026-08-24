/**
 * Props for {@linkcode IFrame}. A rescue of the legacy `zjs-react-components` `IFrame` (its own
 * `IFrameProps`) — see `render.ts`'s own doc comment for exactly what's kept, renamed, or dropped
 * and why.
 */
export type IFrameProps = {
  /** Renamed from the legacy `url` — matches the native `<iframe src>` attribute name directly,
   * and lines up with `DetectedVideoSource`'s own `src` field (`@zanix/space`'s
   * `detectVideoSource`/`buildProviderEmbedUrl`), the first real caller of this component. */
  src: string
  /**
   * Required, not optional (the legacy type had it optional). An iframe with no accessible name is
   * a real, common accessibility failure — assistive technology has nothing else to announce for
   * it, unlike a `<button>`/`<a>` that can fall back to its own visible text. Making this required
   * at the type level turns "forgot to set a title" into a compile error instead of a silent gap.
   */
  title: string
  /** Permissions Policy string for the embedded document (e.g. `'autoplay; fullscreen'`) —
   * verbatim pass-through, same as the legacy `allow`. */
  allow?: string
  /** Whether the embedded document may request fullscreen. Named to match the native DOM IDL
   * property (`HTMLIFrameElement.allowFullscreen`) — `render.ts`'s own doc explains the real
   * attribute-name quirk this hides from callers. */
  allowFullscreen?: boolean
  /**
   * Native `loading` attribute — `'lazy'` defers loading until the iframe is near the viewport,
   * with no JavaScript at all. Replaces the legacy `lazy` prop (a custom `IntersectionObserver`-
   * driven mechanism with its own placeholder-swapping machinery) — see `render.ts`'s own doc for
   * why the browser-native attribute is preferred outright, not just as a simplification.
   *
   * SEO note: `'lazy'` is a real Core Web Vitals win for a BELOW-the-fold embed (it keeps the
   * browser from spending bandwidth/main-thread time on content the user may never scroll to) —
   * but the opposite is true for anything above the fold, or the page's own LCP (Largest
   * Contentful Paint) candidate: deferring a load that would otherwise start immediately can only
   * make LCP worse, never better. Leave this unset (native default, immediate load) for anything
   * likely to be part of the initial viewport.
   */
  loading?: 'lazy' | 'eager'
  /**
   * Native `sandbox` attribute — a space-separated list of permissions to RE-ENABLE inside an
   * otherwise maximally-restricted embedded document (e.g. `'allow-scripts allow-same-origin'`).
   * New in this component; the legacy `IFrame` had no equivalent at all, despite always embedding
   * third-party content. Left untyped as a plain `string` (not an enumerated union of every real
   * sandbox token) — same reasoning as `allow` above: this is a real, evolving platform surface,
   * not a closed set this package should own or fall behind on.
   */
  sandbox?: string
  /**
   * Initial width — required in the legacy type, optional here: this component renders no CSS of
   * its own, and a bare `<iframe>` with neither `width`/`height` nor CSS sizing already has a
   * well-defined native default (300×150) rather than collapsing to nothing. A consumer that wants
   * real responsive sizing owns that via `className`, exactly like the legacy's own `aspectRatio`
   * prop (dropped here — see `render.ts`'s own doc) was always meant to be layout, not detection.
   *
   * SEO note: set this (or size the element with real CSS via `className`, e.g. `aspect-ratio`)
   * whenever the surrounding layout doesn't already reserve the embed's space some other way. CLS
   * (Cumulative Layout Shift) — content jumping as a late-loading iframe claims its real size — is
   * a real, measured Core Web Vitals ranking signal, not just a visual nuisance.
   */
  width?: string | number
  height?: string | number
  /** DOM `id` for the `<iframe>` itself — same convention as `Icon.id`. */
  id?: string
  className?: string
  /**
   * Fires on the native `load` event. Rescues the CAPABILITY the legacy `IFrame` had (it notified
   * a global event bus on load, consumed elsewhere to swap a lazy-loading placeholder out) without
   * the mechanism: this component owns no loading-placeholder state of its own (headless, no real
   * interactive state — same principle `Menu`/`Modal`/`Slider` are still deferred under), so a
   * consumer that wants a placeholder-until-loaded UI builds it with this callback plus its own
   * state, the same way any other DOM `load` handler would work.
   */
  onLoad?: (event: Event) => void
  /**
   * Fallback content for a browser that cannot render iframes at all. The legacy `IFrame` always
   * rendered a hardcoded literal, `#document` — a decades-obsolete plain-text fallback with no real
   * user ever seeing it today. Kept as an optional, consumer-owned slot instead of removed outright
   * (dropping the concept, not just the literal, would silently regress the one real accessibility
   * case it can still serve: a sandboxed/blocked iframe in an environment with fallback rendering
   * enabled) — same `children` convention `Button`/`Link` already use.
   */
  children?: unknown
}
