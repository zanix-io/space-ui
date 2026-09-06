import type { CreateElement } from 'typings/renderer.ts'
import type { ImageProps, ImageSourceProps } from './types.ts'

/**
 * `resolveHref` is an OPTIONAL, injected function — this file itself carries no static or
 * type-level reference to `@zanix/space` at all anymore. When given, it resolves a local `src`
 * (each art-direction {@linkcode ImageSourceProps.src}, and {@linkcode ImageProps.placeholder}) to
 * its real, possibly content-hashed build URL — an absolute URL passes through untouched either
 * way, resolver or not. When omitted, a relative path passes through UNRESOLVED — a predictable,
 * documented degradation, never a throw. This is what makes TWO real bindings possible from this
 * exact same shared factory:
 * - `components/Image/index.ts`/`index.preact.ts` (the root barrel, `.`/`./preact`) call
 *   `createImage(h)` with NO resolver — comet-safe (zero `@zanix/space` reachability), correct for
 *   any already-absolute `src`/`sources[].src`/`placeholder` (a CDN URL, the common case for a
 *   Comet author today), but a relative local asset path is left exactly as given.
 * - `src/runtime/image.ts`/`.preact.ts` (`./runtime/image`, `./runtime/image/preact`) inject
 *   `@zanix/space/assets-manifest`'s own `resolveAssetHref` — byte-for-byte the same
 *   auto-resolving behavior this component has always had, SSR-only, `@zanix/space`-dependent by
 *   design.
 *
 * All three resolved props are plain strings, never a bespoke `Asset` type: whatever produced the
 * file at that path — the same responsive-image pipeline that produces `src`'s own final variant, a
 * separate thumbnail-extraction step for a video, anything else — is not this component's concern.
 * The moment a generated file is registered as a normal asset, it's indistinguishable from any other
 * `src`/`sources[].src`/`placeholder` value here; this component never imports, calls, or knows
 * about whatever produced it.
 *
 * Renders a bare `<img>` when {@linkcode ImageProps.sources} is absent or empty, or a `<picture>`
 * (one `<source>` per entry, in order, the fallback `<img>` always last) when it isn't.
 *
 * Design decisions worth spelling out:
 * - `sources?: ImageSourceProps[]` mirrors native `<source>` attributes 1:1 (`media`/`src`/`type`)
 *   rather than a named-breakpoint API — `@zanix/space` doesn't export a canonical breakpoint-name
 *   set, and a caller-supplied media condition is strictly more general anyway. `type` is an
 *   optional pass-through, never inferred from `src`'s extension — MIME detection by extension is
 *   a resolver-side concern this component doesn't own.
 * - `loading?: 'lazy' | 'eager'` is native only — no custom placeholder-swap or `IntersectionObserver`
 *   machinery, same principle `IFrame.loading`/`Video.loading` already establish. Browser-native
 *   lazy-loading needs zero JavaScript and works before hydration.
 * - `width`/`height` (typed `string | number`, matching `Video`/`IFrame`'s own convention) are the
 *   only sizing/CLS-prevention mechanism — no `aspectRatio` prop or JS-computed sizing. Real CSS
 *   `aspect-ratio` via `className` covers the case `width`/`height` alone can't (only one dimension
 *   known): it works before JS hydrates and needs no runtime computation, so adding a bespoke prop
 *   for it here would just be a worse version of a mechanism the platform already provides.
 * - No `object-fit`/`object-position` (or any other visual) default is applied — `className` is the
 *   one styling mechanism this whole package uses, and a component-owned visual default would be the
 *   only exception to that. A consumer wanting a fill-and-cover look sets it directly:
 *   `.my-image { width: 100%; height: 100%; object-fit: cover; }` — with full control (`contain`
 *   included) that a component-owned default could never offer per-instance.
 * - No `alt` interpolation/formatting of any kind — `alt` is a plain, already-resolved string, the
 *   same "already-resolved data as props" principle the rest of this package follows.
 * - No ref of any kind is exposed — no component in this package has an established
 *   renderer-agnostic ref-forwarding pattern yet, and inventing one for this component alone isn't
 *   warranted.
 * - No `srcSet`/`sizes` `w`-descriptor API — `@zanix/space` has no pixel-width data anywhere to back
 *   one; the `sources` art-direction array already covers responsive-image selection without
 *   needing real dimensions.
 *
 * An SSR-string quirk, unrelated to any prop above: React's `renderToStaticMarkup` serializes
 * `alt=''` explicitly as `alt=""`, while Preact's `preact-render-to-string` serializes it as a
 * bare `alt` attribute with no `=""` at all. Both parse to the identical empty-string `alt` IDL
 * value in a real browser (an attribute with no `=value` gets the empty string per the HTML spec)
 * — a pure SSR string-representation difference, not a behavior difference, so nothing to remap
 * here; see `image-preact.test.tsx`'s own test for the exact output.
 *
 * `fetchPriority`/`crossOrigin`/`referrerPolicy`/`onLoad`/`onError` are real, standard platform
 * primitives (the same "thin, zero-cost pass-through" bar `IFrame.sandbox` already cleared).
 * `fetchPriority`/`crossOrigin`/`referrerPolicy` serialize identically, camelCase, on the real
 * `<img>` element in both React's `renderToStaticMarkup` and Preact's `preact-render-to-string` —
 * no casing remap needed here, unlike `allowFullscreen`→`allowFullScreen` (`IFrame`) or
 * `track.srcLang` (`Video`). One real, React-specific asymmetry, not a bug in this component and
 * nothing to remap: React 19's `renderToStaticMarkup` emits its own
 * `<link rel="preload" as="image">` resource hint as a sibling whenever `fetchPriority` is left
 * unset, `'auto'`, or `'high'` — only `fetchPriority='low'` suppresses it. A real SSR optimization
 * with no Preact equivalent. It doesn't change this component's own rendered `<img>`/`<picture>`
 * markup, doesn't affect hydration, and isn't something `render.ts` can or should suppress.
 *
 * `id`/`className`/`data-space-ui="image"` always render on the `<img>` itself, in BOTH branches —
 * never on `<picture>` when one is rendered. `object-fit`/`object-position`/percentage sizing only
 * ever apply to a replaced element (`<img>`, `<video>`, …); `<picture>` generates no box of its own
 * besides its `<img>`. Putting these on `<picture>` instead would silently break exactly the CSS a
 * consumer is most likely to reach for. The one documented trade-off: a consumer who wants to style
 * the `<picture>` wrapper itself (e.g. a background shown during an art-direction swap) has no hook
 * for that in this first version — not adding a second style-target prop for an unconfirmed need.
 *
 * `placeholder?: string` — a plain, already-resolved asset path/URL (same `resolveFileSrc` rules as
 * `src`) shown while the real image hasn't loaded yet. `<img>` has no native attribute for this
 * (unlike `<video poster>`); CSS `background-image` on the `<img>` itself is the only mechanism that
 * achieves it with zero JavaScript: the browser paints the background layer first, then paints the
 * decoded `<img>` content on top of it once ready, with no explicit swap of any kind involved.
 * Rendered ONLY when `placeholder` is set — with no `placeholder`, `<img>` gets no inline `style` at
 * all, identical to every prior version of this component. This is a narrow, deliberate exception to
 * "no component-owned visual defaults" (see the `object-fit` note above), justified precisely because
 * it isn't a visual OPINION the way `object-fit` would be: it's the same "already-resolved data as a
 * prop" contract `src` already has, just with no HTML attribute to carry it, so CSS is the only route
 * available at all. The three companion values (`center / cover no-repeat`) aren't configurable and
 * shouldn't be — unlike `object-fit` on the final image (where `cover` vs `contain` is a legitimate,
 * app-specific call), a background placeholder has exactly one sane rendering: filled, centered,
 * un-tiled; there's no real scenario where a consumer wants a placeholder to repeat or misalign, so
 * exposing that as a configurable API would be inventing choice where none is actually useful. This
 * also means `placeholder` composes with `sources`/art-direction for free with zero extra branching:
 * it's set on the same `<img>` in both branches, independent of which `<source>` the browser picked,
 * so it stays visible for as long as ANY chosen source is still loading.
 *
 * `placeholder` is independent of `loading` by design — a legacy version of this idea tied the two
 * together (a placeholder shown only in the lazy-loading case); here they're orthogonal, exactly
 * like the responsive-image taxonomy this component follows: `loading` is a viewport-triggered
 * lazy-loading concern (WHEN the browser fetches `src`), `placeholder` is a plain fallback-content
 * concern (WHAT is visible in the meantime) — a large `eager` image benefits from a placeholder just
 * as much as a `lazy` one does. Per the HTML Loading Attribute specification, `loading` governs only
 * the element's own `src`/`srcset` request — it has no defined effect on CSS-triggered resource
 * fetches like `background-image`, so `placeholder`'s request is never deferred by `loading='lazy'`
 * on the same element. No hydration risk either way: `placeholder`'s only effect is one
 * prop-derived inline `style` string, computed identically on every render with no client-only state
 * — the same server and client output every time, same as every other prop this component has.
 */
export function createImage<E>(
  h: CreateElement<E>,
  resolveHref?: (src: string) => string,
): (props: ImageProps) => E {
  const resolveFileSrc = createResolveFileSrc(resolveHref)

  return function Image(props: ImageProps): E {
    const {
      src,
      alt,
      sources,
      placeholder,
      decoding = 'async',
      loading,
      fetchPriority,
      crossOrigin,
      referrerPolicy,
      width,
      height,
      onLoad,
      onError,
      id,
      className,
    } = props

    const img = h('img', {
      src: resolveFileSrc(src),
      alt,
      decoding,
      loading,
      fetchPriority,
      crossOrigin,
      referrerPolicy,
      width,
      height,
      onLoad,
      onError,
      id,
      className,
      'data-space-ui': 'image',
      style: placeholder
        ? { background: `url(${resolveFileSrc(placeholder)}) center / cover no-repeat` }
        : undefined,
    })

    if (!sources?.length) return img

    return h(
      'picture',
      null,
      ...sources.map((source: ImageSourceProps) =>
        // A native `<source>` inside `<picture>` has no `src` attribute of its own — the real DOM
        // attribute is `srcSet` (`ImageSourceProps.src` stays named `src` for API consistency with
        // `ImageProps.src`; this is the one place that naming difference needs remapping, same
        // spirit as `IFrame`'s own `allowFullscreen`→`allowFullScreen` remap).
        h('source', { media: source.media, srcSet: resolveFileSrc(source.src), type: source.type })
      ),
      img,
    )
  }
}

/** Builds this component's own `resolveFileSrc`, closing over whichever `resolveHref` (if any)
 * `createImage` was given. An already-absolute URL always passes through untouched — handing an
 * injected resolver (e.g. `@zanix/space/assets-manifest`'s own `resolveAssetHref`, documented to
 * take a bare relative path) an already-absolute URL would look it up under that whole URL as a
 * literal key, miss, and fall back to a nonsense `/assets/https://…` path. With no `resolveHref`
 * injected at all, a relative path passes through exactly as given — the deliberate, documented
 * root-barrel degradation (see this file's own module doc). Deliberately duplicated from
 * `Video/render.ts`'s own identical helper (not imported from a shared module) — this package's
 * `render.ts` files are independently reviewable/movable by design; a ~10-line function used at two
 * call sites doesn't justify a new shared-helpers precedent. */
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
