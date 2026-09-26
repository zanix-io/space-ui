import type { CreateElement } from 'typings/renderer.ts'
import type { AudioProps, AudioSourceProps } from './types.ts'

/**
 * A native, headless `<audio controls>` wrapper — closes a real catalog gap (`Image`/`Video`/
 * `Thumbnail`/`Avatar`/`FileInput` all had a media/asset counterpart; audio didn't). Unlike `Video`,
 * there's no provider/embed branching: audio has no YouTube/Vimeo-equivalent embeddable-provider
 * case, and no `detectVideoSource`-equivalent source-classification dependency — a caller always
 * supplies a real playable `src` directly, so this component renders one real `<audio>` element,
 * unconditionally, for any given `src`.
 *
 * `resolveHref` is an OPTIONAL, injected function — this file itself carries no static or type-level
 * reference to `@zanix/space` at all. When given, it resolves a local `src`/`sources[].src` to its
 * real, possibly content-hashed build URL — an absolute URL (a CDN URL, a `blob:` Object URL) passes
 * through untouched either way, resolver or not. When omitted, a relative path passes through
 * UNRESOLVED — a predictable, documented degradation, never a throw. This is what makes TWO real
 * bindings possible from this exact same shared factory, the identical shape `Video`/`Image`'s own
 * `render.ts` files already establish:
 * - `components/Audio/index.ts`/`index.preact.ts` (the root barrel, `.`/`./preact`) call
 *   `createAudio(h)` with NO resolver — comet-safe (zero `@zanix/space` reachability), correct for
 *   any already-absolute `src`/`sources[].src` (a CDN URL, a `blob:` Object URL from an
 *   authenticated fetch a caller already resolved into memory — the common real-world case), but a
 *   relative local file path is left exactly as given.
 * - `src/runtime/audio.ts`/`.preact.ts` (`./runtime/audio`, `./runtime/audio/preact`) inject
 *   `@zanix/space/assets-manifest`'s own `resolveAssetHref` — auto-resolving behavior, SSR-only,
 *   `@zanix/space`-dependent by design.
 *
 * A `blob:` URL needs no special-casing to work here: `new URL('blob:...')` parses successfully (it
 * carries a real origin-scoped identifier), so `createResolveFileSrc`'s own already-absolute check
 * below treats it as already-resolved and passes it through untouched, exactly like a `https://` CDN
 * URL — the concrete case a caller playing back an authenticated-fetch blob URL (a voice message
 * fetched with credentials, then handed to this component as an Object URL) depends on.
 *
 * ## `sources` vs. the `src` attribute — the same WHATWG resource-selection contract `Video` follows
 *
 * `sources?: AudioSourceProps[]` renders as native `<source>` children — `media`/`type` are passed
 * verbatim to the browser, which performs its own resource-selection algorithm; this component never
 * evaluates a media condition or picks a candidate itself. Per the WHATWG HTML spec, `media` on
 * `<source>` is defined for both `<video>` and `<audio>`, not just `<picture>`.
 *
 * A load-bearing spec detail this implementation depends on: per the WHATWG "resource selection
 * algorithm", a media element with a `src` ATTRIBUTE set on the element itself uses ONLY that
 * attribute — `<source>` children are never evaluated at all in that case, not merely deprioritized.
 * So when `sources` is non-empty, the rendered `<audio>` carries NO `src` attribute — `sources`
 * becomes the element's own `<source>` children, with the resolved base `src` appended as the final,
 * unconditional (no `media`) candidate. Order is preserved verbatim: each entry in `sources`, in the
 * order given, followed by the base `src`. When `sources` is absent or empty, behavior is
 * byte-for-byte the plain single-`src` case: `<audio src="…">`, no `<source>` children.
 *
 * Also per the spec: source selection for a media element runs ONCE — when the element is created
 * with a resolvable source, when its `src` changes, or when `.load()` is called explicitly — and is
 * never automatically re-run later. No JavaScript is needed or added here for this behavior.
 *
 * `crossOrigin` — opt-in, forwarded unchanged onto the native `<audio>` element. See
 * {@linkcode AudioProps.crossOrigin}'s own doc for the real, confirmed session-cookie hazard this
 * lets a caller opt out of, the same one `Image`/`Avatar`/`Video` were fixed for.
 *
 * Deliberately NOT added, each with its own real argument, not scope creep by omission:
 * - **"Pretty controls"** (a custom-styled play/mute/scrubber overlay) — native `controls` only,
 *   the same "a headless primitive owns no visual chrome" principle `Video`/`Button`/`Link` already
 *   establish. No other component in this catalog reimplements native browser chrome with JS.
 * - **`poster`/`playsInline`/`width`/`height`** — none apply to `<audio>`: it has no visual surface
 *   to give a poster image to or size, and no `playsinline` concept (that's a `<video>`-specific
 *   iOS Safari fullscreen-vs-inline distinction).
 * - **`tracks`** — technically spec-legal on `<audio>` (WebVTT captions for spoken content), but out
 *   of scope for this first version: no concrete consumer need identified, and adding it would need
 *   its own review the same way `Video.tracks` did.
 * - **`title`** — `Video.title` is required because it becomes `IFrame`'s own `title` (a real,
 *   required accessibility attribute for an embed) or the native `<video>`'s `aria-label`. `Audio`
 *   has no embed branch, and native `<audio controls>` needs no forced accessible name of its own the
 *   way an iframe does — a caller that DOES need one sets a real `aria-label`/`aria-labelledby`
 *   directly; not adding a bespoke `title`-to-`aria-label` remap here avoids inventing a convention
 *   this component doesn't need.
 * - **A ref of any kind** — no component in this package exposes one; no established
 *   renderer-agnostic ref-forwarding pattern exists yet to extend. This component is fully
 *   declarative: no imperative play/pause control, matching `Video`'s own rejection of a `videoRef`.
 * - **Source/format detection** — a caller always supplies a real playable `src`; there is no
 *   `detectVideoSource`-equivalent classification step for audio.
 */
export function createAudio<E>(
  h: CreateElement<E>,
  resolveHref?: (src: string) => string,
): (props: AudioProps) => E {
  const resolveFileSrc = createResolveFileSrc(resolveHref)

  return function Audio(props: AudioProps): E {
    const sources = props.sources ?? []
    const resolvedSrc = resolveFileSrc(props.src)
    const hasSources = sources.length > 0

    const sourceElements = hasSources
      ? [
        ...sources.map((source: AudioSourceProps) =>
          h('source', { media: source.media, src: resolveFileSrc(source.src), type: source.type })
        ),
        // The base `src` becomes the final, unconditional fallback candidate — same role `Video`'s
        // own trailing `<source>` plays for its file case.
        h('source', { src: resolvedSrc }),
      ]
      : []

    return h(
      'audio',
      {
        id: props.id,
        className: props.className,
        'data-space-ui': 'audio',
        // Deliberately omitted (undefined) when `sources` is given — see this function's own doc
        // for why a `src` attribute on the element itself would make the `<source>` children dead
        // markup per the WHATWG resource-selection algorithm.
        src: hasSources ? undefined : resolvedSrc,
        crossOrigin: props.crossOrigin,
        controls: props.controls,
        autoPlay: props.autoPlay,
        loop: props.loop,
        muted: props.muted,
        preload: props.preload,
        onError: props.onError,
      },
      ...sourceElements,
    )
  }
}

/** Builds this component's own `resolveFileSrc`, closing over whichever `resolveHref` (if any)
 * `createAudio` was given — same shape as `Video/render.ts`'s and `Image/render.ts`'s own identical
 * helper, deliberately duplicated rather than shared (see `Image/render.ts`'s own doc for why). An
 * injected resolver (e.g. `resolveAssetHref`, documented to take a bare relative path) would look an
 * ALREADY-absolute URL (a CDN URL, a `blob:` Object URL) up in the manifest under that whole URL as a
 * literal key, miss, and fall back to a nonsense path — so an already-absolute URL always passes
 * through untouched, checked via a real `new URL(src)` parse (which succeeds for `blob:` too, not
 * just `http(s)`). With no `resolveHref` injected at all, a relative path passes through exactly as
 * given. */
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
