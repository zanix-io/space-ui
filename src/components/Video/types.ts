/** One `<track>` element (captions/subtitles/etc.) — mirrors the native attributes directly.
 * Replaces the legacy `captions` boolean: `Main.tsx` (the legacy `MainVideo`) spread that flag
 * onto the `<video>` element itself (an invalid DOM attribute, a no-op) and unconditionally
 * rendered exactly one hardcoded `<track>` regardless of its value — a real, silent gap. A `tracks`
 * array is trivial to expose correctly and carries no i18n/formatting logic of its own. */
export type VideoTrackProps = {
  src: string
  kind?: 'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata'
  srcLang?: string
  label?: string
  default?: boolean
}

/**
 * One `<source>` element inside {@linkcode Video}'s `<video>`, file case only — mirrors the native
 * attributes 1:1, same shape as `Image`'s own `ImageSourceProps`. `media` is deliberately optional:
 * a `<source>` with no `media` is valid HTML and acts as an unconditional candidate — useful on its
 * own for format/codec fallback (e.g. a `.webm` entry before an `.mp4` one), and combinable with
 * `media` for the same entry to express "this codec, at this breakpoint" in one candidate. Neither
 * `media` nor `type` carries any special interpretation here beyond what the browser itself gives
 * them — see `render.ts`'s own doc for the full responsive-behavior contract.
 */
export type VideoSourceProps = {
  /** A media condition, e.g. `'(min-width: 1441px)'` — passed verbatim to the native `media`
   * attribute; the browser (not this component) evaluates it, once, when it resolves the video's
   * source. Omit for a candidate that should always be considered regardless of viewport (a codec
   * fallback, or the final unconditional entry). */
  media?: string
  /** Same resolution rules as {@linkcode VideoProps.src} — an absolute URL passes through
   * untouched, a relative path resolves through `@zanix/space`'s `resolveAssetHref`. */
  src: string
  /** MIME type hint, e.g. `'video/webm'`. Optional pass-through only — never inferred from `src`'s
   * extension. */
  type?: string
}

/**
 * Props for {@linkcode Video}. See `render.ts`'s own doc for the full contract: how `src` is
 * classified (via `@zanix/space`'s `detectVideoSource`) into a YouTube/Vimeo embed, a generic
 * third-party iframe, or a native `<video>`, and exactly which of these props apply to which case.
 */
export type VideoProps = {
  /** YouTube/Vimeo URL, some other embeddable URL, or a local/CDN video file path — classified by
   * `detectVideoSource`, the same function `@zanix/space` exports for this exact purpose. Remains
   * the component's base/fallback video for the file case even when {@linkcode sources} is also
   * given — see `render.ts`'s own doc for exactly how the two combine. */
  src: string
  /** Required — same reasoning as `IFrame.title` (a real, common accessibility gap the legacy
   * `VideoProps.title` left optional). Used as `IFrame`'s own `title` for the YouTube/Vimeo/generic
   * cases; as an `aria-label` for the native `<video>` case (which has no `title`-forcing
   * requirement of its own, but still deserves one consistent accessible-name story across every
   * branch this component can render). */
  title: string
  /**
   * Poster image, native `<video>` case only — YouTube/Vimeo/generic embeds show their own
   * provider's default thumbnail, with no equivalent attribute `IFrame` could apply on this
   * component's behalf (same as the legacy `Selector.tsx`, which never passed `poster` into either
   * of its embed branches). Resolved through `@zanix/space`'s `resolveAssetHref` when it looks like
   * a local/relative path — an absolute URL passes through untouched. See `render.ts`'s own doc.
   *
   * Always a single resource, deliberately — unlike `src`, there is no native `<source>`-equivalent
   * mechanism for `poster` (a media element has exactly one `poster` attribute, not a set of
   * candidates the browser picks among). A conscious decision, not an oversight: adding
   * breakpoint-driven poster selection would require this component to compute or react to the
   * viewport itself, which is exactly the responsive-JS machinery {@linkcode sources} was designed
   * to avoid needing at all.
   */
  poster?: string
  /** Art-direction/format-fallback sources for the file case, rendered as native `<source>`
   * children — the browser selects among them once, when it resolves the video (no reactive
   * re-selection on resize; see `render.ts`'s own doc). Has no effect on the YouTube/Vimeo/generic
   * embed cases. Omit or pass an empty array for the existing single-`src` behavior, unchanged. */
  sources?: VideoSourceProps[]
  width?: string | number
  height?: string | number
  id?: string
  className?: string

  // --- Native <video> playback attributes — apply to the FILE case only. For a YouTube/Vimeo
  // embed, `controls`/`autoPlay`/`loop`/`muted` are still honored (threaded through
  // `buildProviderEmbedUrl`'s own per-provider options), but as embed URL query parameters, not
  // DOM attributes — see render.ts. For a generic third-party iframe, all four are silently
  // ignored: rewriting an arbitrary provider's own query string isn't something this package can
  // do safely, the same conclusion `@zanix/space`'s own `buildProviderEmbedUrl` doc already
  // documents for exactly this case.

  /** Native playback controls. Honored for the file case (real `controls` attribute) and the
   * YouTube/Vimeo case (`controls=0` suppresses the provider's own chrome) — never for a generic
   * iframe. No "pretty controls" of any kind — this stays a thin, headless primitive; a consumer
   * that wants custom-styled controls owns that entirely on top of the native ones. */
  controls?: boolean
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  /** File case only — inline playback on iOS Safari instead of forcing fullscreen. No YouTube/
   * Vimeo equivalent (their own embeds already control this on their end). */
  playsInline?: boolean
  /** File case only — native buffering hint (`'none' | 'metadata' | 'auto'`). No YouTube/Vimeo
   * equivalent; a generic iframe embed has no `preload` concept either. */
  preload?: 'none' | 'metadata' | 'auto'
  /** File case only. */
  tracks?: VideoTrackProps[]
  /** File case only — fires on the native `<video>` `error` event. Unlike `onLoad` (deliberately
   * not exposed, see `render.ts`'s own doc), `<video>` has exactly one unambiguous error event —
   * same as `Image.onError` — so there's no picking-on-the-caller's-behalf ambiguity here. Not
   * threaded through to the `'provider'`/`'iframe'` cases: `IFrame` itself deliberately doesn't
   * expose `onError` — see `IFrame/render.ts`'s own doc for the real reason (confirmed empirically:
   * React never fires it for `<iframe>`, unlike Preact). */
  onError?: (event: Event) => void

  // --- Passed straight through to IFrame for the YouTube/Vimeo/generic cases — see IFrameProps's
  // own doc for the full contract of each. Native `loading="lazy"` (never a custom
  // IntersectionObserver mechanism) also applies to the file case's own `<video loading>` — same
  // browser-native, zero-JavaScript principle IFrame already established.

  loading?: 'lazy' | 'eager'
  allow?: string
  allowFullscreen?: boolean
  sandbox?: string
}
