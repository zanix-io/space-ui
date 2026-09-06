import {
  buildProviderEmbedUrl,
  detectVideoSource,
  type YoutubeEmbedOptions,
} from '@zanix/space/video-source'
import type { CreateElement } from 'typings/renderer.ts'
import { createIFrame } from '../IFrame/render.ts'
import type { VideoProps, VideoSourceProps } from './types.ts'

/**
 * A rescue of the legacy `zjs-react-components` `Video` (`Selector.tsx` + `Main.tsx` +
 * `Sources.tsx`), built entirely on primitives this package already has, not new machinery:
 * `@zanix/space`'s `detectVideoSource`/`buildProviderEmbedUrl` classify `src` and build a
 * provider's real embed URL — a real, UNCONDITIONAL `@zanix/space/video-source` dependency, kept
 * static (never injected) because it's genuinely needed regardless of resolver: classifying
 * `'provider'`/`'iframe'`/`'file'`/`'unknown'` is core to every branch below, not an asset-
 * resolution nicety. Confirmed safe to keep static even for the comet-safe root-barrel binding:
 * `video-source.ts` carries no `'server-only'` directive (unlike `assets-manifest.ts` below) and is
 * documented as "pure and synchronous — never throws, never does I/O or network access", so a
 * Comet's own build never rejects it.
 *
 * `IFrame` (this package's own) renders the YouTube/Vimeo/generic cases. `resolveHref` — an
 * OPTIONAL, injected function, exactly like `Image/render.ts`'s own — resolves a local
 * file/poster/track src to its real, possibly-hashed URL when given (e.g.
 * `@zanix/space/assets-manifest`'s own `resolveAssetHref`, injected only by
 * `src/runtime/video.ts`/`.preact.ts`); an already-absolute URL passes through untouched either
 * way, and a relative path passes through UNRESOLVED when no resolver is given at all — the
 * `components/Video/index.ts`/`index.preact.ts` root-barrel binding's own deliberate, documented
 * degradation. See `Image/render.ts`'s own module doc for the fuller two-binding shape this
 * mirrors exactly.
 *
 * `data-space-ui`: the `'provider'`/`'iframe'` branches below compose `IFrame` directly and
 * inherit its own `data-space-ui="iframe"` automatically — same "composed, not reimplemented"
 * pattern `ImgButton` already establishes, nothing added here for those two. The `'file'` branch
 * renders its own real `<video>` (never delegates to `IFrame`), so it carries `data-space-ui=
 * "video"` directly — closing a real, previously undocumented gap (see `IFrame/render.ts`'s own
 * doc for the fuller reasoning, shared verbatim).
 *
 * Four branches, one per {@linkcode DetectedVideoSource} variant:
 * - `'provider'` (YouTube/Vimeo) → `buildProviderEmbedUrl` builds the real embed URL from
 *   `controls`/`autoPlay`/`muted`/`loop`, then `IFrame` renders it.
 * - `'iframe'` (any other embeddable URL — Facebook/Instagram/Twitter/TikTok included, same as
 *   `detectVideoSource`'s own doc) → `IFrame` renders `detected.src` as-is. `controls`/`autoPlay`/
 *   `muted`/`loop`/`poster`/`tracks`/`sources` are all silently ignored here — rewriting an
 *   arbitrary third party's own query string isn't something this package can do safely, the same
 *   conclusion `buildProviderEmbedUrl`'s own doc already reaches for this exact case.
 * - `'file'` (a recognized local/CDN video file) → a real, native `<video>` — every prop this
 *   module doc's own `VideoProps` lists as "file case only" applies here, verbatim, as real DOM
 *   attributes. No JavaScript-driven playback logic of any kind.
 * - `'unknown'` (empty/invalid `src`, or something like `.m3u8` that `@zanix/space` explicitly
 *   does NOT support — see `detectVideoSource`'s own doc) → renders nothing (`null`), the same
 *   "nothing meaningful to render" posture `SocialNetworks` already takes for an empty list. A
 *   native `<video src="…">` with a source the browser can't play would just silently fail to load
 *   anyway; returning `null` is the honest version of that same outcome, not a worse one.
 *
 * ## Responsive behavior (file case only): `sources`
 *
 * `sources?: VideoSourceProps[]` renders as native `<source>` children — `media`/`type` are passed
 * verbatim to the browser, which performs its own resource-selection algorithm; this component
 * never evaluates a media condition or picks a candidate itself. Per the WHATWG HTML spec, `media`
 * on `<source>` is defined for `<video>`/`<audio>`, not just `<picture>`, and React 19/Preact SSR
 * output both serialize `<source media src type>` identically inside `<video>` — no casing remap
 * needed, same as `fetchPriority`/`crossOrigin`/`referrerPolicy` on `Image`.
 *
 * A load-bearing spec detail this implementation depends on: per the WHATWG "resource selection
 * algorithm", a media element with a `src` ATTRIBUTE set on the
 * element itself uses ONLY that attribute — `<source>` children are never evaluated at all in that
 * case, not merely deprioritized. This means `<video src="…"><source …></video>` would silently
 * make the `<source>` children dead markup — the exact opposite of what a naive "same shape as
 * `<picture>`" port would assume. So when `sources` is non-empty, the rendered `<video>` carries NO
 * `src` attribute — `sources` becomes the element's own `<source>` children, with the resolved
 * base `src` appended as the final, unconditional (no `media`) candidate, exactly the role a
 * `<picture>`'s trailing `<img>` plays for `Image`. Order is preserved verbatim: each entry in
 * `sources`, in the order given, followed by the base `src`. When `sources` is absent or empty,
 * behavior is byte-for-byte unchanged from before this was added: `<video src="…">`, no
 * `<source>` children.
 *
 * Also per the spec: source selection for a media element
 * runs ONCE — when the element is created with a resolvable source, when its `src` changes, or
 * when `.load()` is called explicitly — and, unlike `<picture>`, is never automatically re-run
 * later just because the viewport changed. This is why `sources` needs no JavaScript at all: the
 * browser picks correctly at load time using the real viewport (not a server-guessed one, so no
 * hydration mismatch is possible), and deliberately does NOT re-pick on a later resize. The legacy
 * mechanism this replaces (`useResolution` + `useStatics` picking a breakpoint-keyed `src`, then a
 * `useEffect` calling `videoRef.current.load()` whenever that computed value changed) is
 * DELIBERATELY not ported, for a real, verified reason: per the WHATWG "media element load
 * algorithm", `.load()` resets `currentTime` to 0 and `paused` to `true` — it does not merely swap
 * the resource, it restarts and stops playback. Combined with the legacy's own SSR/client
 * resolution mismatch (`useResolution`'s effect re-runs `handleResize()` immediately on mount,
 * almost always landing on a different value than whatever the server guessed from a
 * `viewport-width` header), this meant a real, previously-playing video would silently reset and
 * pause on or shortly after hydration in the common case, not just on a genuine resize. None of
 * `useResolution`, a resize listener, a `useEffect`, a video ref, or any DOM mutation is
 * reintroduced here — resize after load intentionally does nothing from this component's own code;
 * an in-progress playback is never interrupted by responsive logic.
 *
 * `sources` has no effect on the `'provider'`/`'iframe'` branches above — never read there at all,
 * consistent with `controls`/`autoPlay`/etc. already being ignored for the generic iframe case for
 * the same "can't safely rewrite a third party's own resource" reason.
 *
 * `poster` remains a single resource, deliberately — see {@linkcode VideoProps.poster}'s own doc
 * for why: there is no `<source>`-equivalent mechanism for `poster` at all, so a breakpoint-aware
 * poster would need this component to compute or react to the viewport itself, reintroducing
 * exactly the responsive-JS machinery `sources` was designed to avoid needing.
 *
 * `src`/`sources[].src`/`poster`/each `track.src` are all plain strings — never a bespoke `Asset`
 * type — resolved through the identical `resolveFileSrc` helper below. `@zanix/space`'s own
 * breakpoint preset names (`msm`/`mlg`/`dmd`/`dlg`/`thum`) are never hardcoded anywhere in this
 * file; a caller supplies its own real `media` condition and resolved `src` directly, the same
 * architecture already established for `Image.sources`.
 *
 * Deliberately NOT added, each with its own real argument, not scope creep by omission:
 * - **"Pretty controls"** (custom-styled play/mute/scrubber overlay, legacy `Controls.tsx`) — native
 *   `controls` only; a headless primitive owns no visual chrome, same principle Button/Link
 *   establish.
 * - **Custom lazy-loading** (legacy `useIntersectionLazy`/`useEventLazy` pair with its own
 *   placeholder-swapping event bus) — `loading="lazy"` (browser-native, zero JS) is the only
 *   lazy-loading story, matching IFrame's own.
 * - **`videoRef`** — no component in this package exposes a ref of any kind yet; no established
 *   renderer-agnostic ref-forwarding pattern to extend; inventing one for Video alone would be a
 *   new, unaudited primitive, not a rescue of an existing one.
 * - **Vimeo's `background`** — a real Vimeo-only embed option already supported at the
 *   `@zanix/space` level, not asked for here; a consumer needing it calls `detectVideoSource`/
 *   `buildProviderEmbedUrl`/`IFrame` directly instead.
 * - **`onLoad`** — IFrame already exposes one; not threaded through Video's props since native
 *   `<video>` has no exact single equivalent event (`loadeddata`/`canplay`/`loadedmetadata`
 *   differ) — picking one on Video's behalf would be an assumption, not a rescue. `onError` has no
 *   such ambiguity (one native `error` event, same as `Image`) and IS threaded through, file case
 *   only — see {@linkcode VideoProps.onError}. NOT threaded through to `IFrame` for the
 *   `'provider'`/`'iframe'` cases: `IFrame` itself deliberately doesn't expose `onError` — see
 *   `IFrame/render.ts`'s own doc for why (confirmed empirically: React never fires it for
 *   `<iframe>`, unlike Preact).
 */
export function createVideo<E>(
  h: CreateElement<E>,
  resolveHref?: (src: string) => string,
): (props: VideoProps) => E | null {
  const IFrame = createIFrame(h)
  const resolveFileSrc = createResolveFileSrc(resolveHref)

  return function Video(props: VideoProps): E | null {
    const detected = detectVideoSource(props.src)

    if (detected.type === 'provider') {
      // `YoutubeEmbedOptions`/`VimeoEmbedOptions` share the same 4 field names for everything
      // Video's own props expose — a single object structurally satisfies whichever overload
      // `buildProviderEmbedUrl` actually resolves to below (the `detected.provider` narrowing is
      // what selects the overload; the options shape itself doesn't need a matching branch).
      const embedOptions: YoutubeEmbedOptions = {
        autoplay: props.autoPlay,
        controls: props.controls,
        muted: props.muted,
        loop: props.loop,
      }
      const embedUrl = detected.provider === 'youtube'
        ? buildProviderEmbedUrl(detected, embedOptions)
        : buildProviderEmbedUrl(detected, embedOptions)

      return IFrame({
        src: embedUrl,
        title: props.title,
        allow: props.allow,
        allowFullscreen: props.allowFullscreen,
        loading: props.loading,
        sandbox: props.sandbox,
        width: props.width,
        height: props.height,
        id: props.id,
        className: props.className,
      })
    }

    if (detected.type === 'iframe') {
      return IFrame({
        src: detected.src,
        title: props.title,
        allow: props.allow,
        allowFullscreen: props.allowFullscreen,
        loading: props.loading,
        sandbox: props.sandbox,
        width: props.width,
        height: props.height,
        id: props.id,
        className: props.className,
      })
    }

    if (detected.type === 'file') {
      const tracks = props.tracks ?? []
      const sources = props.sources ?? []
      const resolvedSrc = resolveFileSrc(detected.src)
      const hasSources = sources.length > 0

      const sourceElements = hasSources
        ? [
          ...sources.map((source: VideoSourceProps) =>
            h('source', { media: source.media, src: resolveFileSrc(source.src), type: source.type })
          ),
          // The base `src` becomes the final, unconditional fallback candidate — same role
          // `Image`'s trailing `<img>` plays inside its own `<picture>`. No `media`, no inferred
          // `type` — matches `src`'s own behavior when `sources` is absent.
          h('source', { src: resolvedSrc }),
        ]
        : []

      return h(
        'video',
        {
          id: props.id,
          className: props.className,
          'data-space-ui': 'video',
          width: props.width,
          height: props.height,
          // Deliberately omitted (undefined) when `sources` is given — see this function's own
          // doc for why a `src` attribute on the element itself would make the `<source>` children
          // dead markup per the WHATWG resource-selection algorithm.
          src: hasSources ? undefined : resolvedSrc,
          poster: props.poster ? resolveFileSrc(props.poster) : undefined,
          controls: props.controls,
          autoPlay: props.autoPlay,
          loop: props.loop,
          muted: props.muted,
          playsInline: props.playsInline,
          preload: props.preload,
          loading: props.loading,
          'aria-label': props.title,
          onError: props.onError,
        },
        ...sourceElements,
        ...tracks.map((track) =>
          h('track', {
            src: resolveFileSrc(track.src),
            kind: track.kind,
            // React only recognizes `srcLang` (capital L) for <track> — `srclang` (the real,
            // lowercase HTML attribute name `VideoTrackProps.srcLang` is itself named after) is
            // silently DROPPED with an "Invalid DOM property" warning, never rendered at all.
            // Confirmed empirically against both renderers' real output, same reasoning `IFrame`'s
            // own `allowFullScreen` remap already documents — Preact accepts either casing fine.
            srcLang: track.srcLang,
            label: track.label,
            default: track.default,
          })
        ),
      )
    }

    // 'unknown' — see this function's own doc for why null, not a broken native <video>.
    return null
  }
}

/** Builds this component's own `resolveFileSrc`, closing over whichever `resolveHref` (if any)
 * `createVideo` was given — same shape as `Image/render.ts`'s own `createResolveFileSrc`,
 * deliberately duplicated rather than shared (see that file's own doc for why). An injected
 * resolver (e.g. `resolveAssetHref`, documented to take a bare relative path like `'clip.mp4'`,
 * `'videos/clip.mp4'`) would look an ALREADY-absolute URL (a CDN URL a `'file'`-classified
 * `DetectedVideoSource` can just as easily carry) up in the manifest under that whole URL as a
 * literal key, miss, and fall back to a nonsense `/assets/https://…` path — so an absolute URL
 * always passes through untouched, checked the same way `detectVideoSource`'s own (unexported)
 * `isEmbeddableUrl` does (a different question: "does this already have its own origin", not "is
 * this safe to iframe"). With no `resolveHref` injected at all, a relative path passes through
 * exactly as given. */
function createResolveFileSrc(resolveHref?: (src: string) => string): (src: string) => string {
  return function resolveFileSrc(src: string): string {
    try {
      new URL(src)
      return src
    } catch {
      return resolveHref ? resolveHref(src) : src
    }
  }
}
