/**
 * One `<source>` element inside {@linkcode Audio}'s `<audio>` — mirrors the native attributes 1:1,
 * same shape as `Video`'s own `VideoSourceProps`. `media` is deliberately optional: a `<source>`
 * with no `media` is valid HTML and acts as an unconditional candidate — useful on its own for
 * format/codec fallback (e.g. an `.ogg` entry before an `.mp3` one), and combinable with `media` for
 * the same entry to express "this codec, at this breakpoint" in one candidate. Neither `media` nor
 * `type` carries any special interpretation here beyond what the browser itself gives them — see
 * `render.ts`'s own doc for the full resource-selection contract.
 */
export type AudioSourceProps = {
  /** A media condition, e.g. `'(min-width: 1441px)'` — passed verbatim to the native `media`
   * attribute; the browser (not this component) evaluates it, once, when it resolves the audio's
   * source. Omit for a candidate that should always be considered regardless of viewport (a codec
   * fallback, or the final unconditional entry). */
  media?: string
  /** Same resolution rules as {@linkcode AudioProps.src} — an absolute URL (a CDN URL, a `blob:`
   * Object URL) passes through untouched; a relative path resolves through `@zanix/space`'s
   * `resolveAssetHref` ONLY when using `@zanix/space-ui/runtime/audio` — the root-barrel `Audio`
   * leaves it exactly as given (see `render.ts`'s own module doc). */
  src: string
  /** MIME type hint, e.g. `'audio/ogg'`. Optional pass-through only — never inferred from `src`'s
   * extension. */
  type?: string
}

/**
 * Props for {@linkcode Audio}. See `render.ts`'s own doc for the full contract: a native, headless
 * `<audio>` wrapper, no custom-styled chrome, no provider/embed branching (unlike `Video`, audio has
 * no YouTube/Vimeo-equivalent embeddable-provider case).
 */
export type AudioProps = {
  /** A local/CDN audio file path, an already-absolute URL, or a `blob:` Object URL (e.g. from an
   * authenticated fetch a caller resolved into memory) — a caller always supplies a real playable
   * source; this component runs no format/source detection of its own (unlike `Video`'s
   * `detectVideoSource`). Remains the element's base/fallback audio even when {@linkcode sources} is
   * also given — see `render.ts`'s own doc for exactly how the two combine. A relative local file
   * path resolves through `@zanix/space`'s `resolveAssetHref` ONLY when using
   * `@zanix/space-ui/runtime/audio` — the root-barrel `Audio` leaves it exactly as given. */
  src: string
  /** Format-fallback sources, rendered as native `<source>` children — the browser selects among
   * them once, when it resolves the audio (no reactive re-selection on resize; see `render.ts`'s own
   * doc). Omit or pass an empty array for the existing single-`src` behavior, unchanged. */
  sources?: AudioSourceProps[]
  id?: string
  className?: string
  /**
   * Forwarded verbatim onto the native `<audio crossorigin>` attribute, which governs CORS mode for
   * every resource the element itself fetches. Real, confirmed hazard this exists to let a caller
   * opt out of, same shape `Video.crossOrigin`'s own doc documents: an `src`/`sources[].src` pointing
   * at a host that shares the viewer's own hostname but a different port (a common
   * same-machine-different-service dev/prod topology) has session cookies attached to it ambiently
   * by the browser — cookies are host-scoped, never port-scoped — and that host's own response can
   * emit a `Set-Cookie` that clobbers the viewing app's real session cookie. `'anonymous'` (no
   * cookies sent, CORS response required) is the fix for that case; omitted by default so no caller
   * is forced into a CORS requirement their audio host doesn't actually meet.
   */
  crossOrigin?: 'anonymous' | 'use-credentials'
  /** Native playback controls — the browser's own, unstyled `<audio controls>` chrome. No
   * "pretty controls" of any kind — this stays a thin, headless primitive; a consumer that wants
   * custom-styled controls owns that entirely on top of the native ones (see `render.ts`'s own doc
   * for why this isn't built in). */
  controls?: boolean
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  /** Native buffering hint (`'none' | 'metadata' | 'auto'`). */
  preload?: 'none' | 'metadata' | 'auto'
  /** Fires on the native `<audio>` `error` event — same "one unambiguous error event" reasoning as
   * `Video.onError`/`Image.onError`. */
  onError?: (event: Event) => void
  /** No forced accessible name of any kind is built in — unlike `Video`'s embed case (whose `title`
   * becomes an `IFrame`'s own required `title`), a native `<audio controls>` needs no such remap.
   * A bare, unlabeled instance (no visible caption/label element next to it in the caller's own
   * markup) still needs an accessible name from somewhere — set one directly here, same contract
   * `Input`/`Textarea` already establish for their own bare-usage case. */
  'aria-label'?: string
  'aria-labelledby'?: string
}
