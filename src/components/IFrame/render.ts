import type { CreateElement } from 'typings/renderer.ts'
import type { IFrameProps } from './types.ts'

/**
 * A rescue of the legacy `zjs-react-components` `IFrame` — a real, standalone primitive, not
 * something private to `Video`, same reasoning `SocialNetworks` already established for reusing
 * `createIcon(h)` directly instead of duplicating its logic. `Video`'s `'provider'`/`'iframe'`
 * branches (YouTube, Vimeo, any other embeddable third-party URL) compose this component directly
 * rather than rendering their own `<iframe>` — see `Video/render.ts`'s own doc for the full
 * mapping. Keeping the primitive standalone here means anything else that needs an `<iframe>` (a
 * map embed, a scheduling widget) can reuse it the same way, not just `Video`.
 *
 * No per-renderer hook usage — this file never imports React or Preact, and is bound to both
 * (`index.ts`/`index.preact.ts`) exactly like `Icon`/`Link`/`Button`'s own `render.ts`.
 *
 * Carries `data-space-ui="iframe"` — the same stable, inert selector hook every other component
 * here has on its own genuine root element (see `Link/render.ts`'s own doc for the full
 * reasoning), not a deliberate exception the way `StructuredData`'s `<script>` (nothing to
 * visually select) or `Showcase`'s own private measurement wrapper (never meant to be a public
 * target) are. `Video`'s `'provider'`/`'iframe'` branches compose this component directly and
 * inherit this hook automatically, the same "composed, not reimplemented" pattern `ImgButton`
 * already establishes for `Link`/`Button` — they never render their own `data-space-ui` of any
 * kind.
 *
 * SEO: an `<iframe>`'s own embedded document is a separate resource — Google (and search engines
 * generally) do not credit its content to the PARENT page's own indexing/ranking, cross-origin or
 * same-origin alike. Content a page actually wants indexed belongs in that page's own markup, never
 * inside an iframe. `width`/`height`/`loading` each carry their own real Core Web Vitals guidance
 * (CLS, LCP respectively) — see their own doc comments on {@linkcode IFrameProps}.
 *
 * Kept from the legacy `IFrameProps`: `src` (renamed from `url`), `allow`, `allowFullscreen`,
 * `title`, `width`/`height`.
 *
 * Changed:
 * - `title` is now REQUIRED — see `types.ts`'s own doc.
 * - `lazy` (a custom `IntersectionObserver`-driven mechanism, with its own placeholder-swapping
 *   event bus) is replaced outright by the native `loading` attribute. This is not merely a
 *   simplification of the same idea — `loading="lazy"` is handled entirely by the browser's own
 *   scheduler with zero JavaScript, at zero bundle cost, and needs no `IntersectionObserver`
 *   polyfill story; the legacy mechanism existed only because no native equivalent was available
 *   when it was written.
 * - `onLoad` (a plain DOM event callback) replaces the legacy's global `eventManager` pub/sub
 *   notification — the CAPABILITY (know when the iframe finished loading, to drive your own
 *   loading-placeholder UI) survives; the specific mechanism (a cross-tree global event bus keyed
 *   by a generated string) does not. See `types.ts`'s own doc for the full reasoning.
 * - `sandbox` is new — the legacy component always embedded third-party content with no sandboxing
 *   story at all.
 *
 * Deliberately dropped, with real arguments each (not "no gap" bookkeeping — genuine omissions):
 * - `role` — the one real consumer this package's own design docs found for it
 *   (`Selector.tsx`'s `role="video"`) was an INVALID ARIA role; a native `<iframe>` already has the
 *   correct implicit role for embedded content, and no other real use case surfaced. Re-adding a
 *   free-text `role` escape hatch would just reopen that same footgun.
 * - `datatype` — a non-standard DOM attribute, internal/analytics-only in the legacy codebase,
 *   never meant to be part of a component's own public contract.
 * - `aspectRatio` — computed via a JS hook (`useAspectRatio`) tied to a legacy resolution store.
 *   This component owns no styling of its own; a consumer sizes it with real CSS `aspect-ratio` via
 *   `className` instead — the native property this whole mechanism predates.
 * - `format` (i18n interpolation of `title`/`src` via a message catalog) — a component here always
 *   takes already-resolved data as props, never a source it resolves itself; see this package's own
 *   `README.md` design principle.
 * - `onError` — deliberately NOT added, for a real, verified reason, not an oversight: confirmed
 *   empirically (a bare native `<iframe onError={...}>`, isolated from this component entirely)
 *   that React's own synthetic event system never fires `error` for an `<iframe>` element — unlike
 *   `onLoad` (which does fire) and unlike `Image`/`Video`'s own `onError` (which fires on `<img>`/
 *   `<video>`). Preact fires it correctly. Shipping this prop would mean it silently never runs
 *   under the React binding — worse than not having it, since it would look wired but never call
 *   back. Revisit if/when React changes this (or if a consumer's real need justifies a ref-based
 *   workaround, which no component in this package uses today).
 */
export function createIFrame<E>(h: CreateElement<E>): (props: IFrameProps) => E {
  return function IFrame(props: IFrameProps): E {
    const {
      src,
      title,
      allow,
      allowFullscreen,
      loading,
      sandbox,
      width,
      height,
      id,
      className,
      onLoad,
      children,
    } = props

    return h('iframe', {
      id,
      className,
      'data-space-ui': 'iframe',
      src,
      title,
      allow,
      sandbox,
      width,
      height,
      loading,
      onLoad,
      // React only recognizes this specific casing (`allowFullScreen`, capital S) as a known DOM
      // property for `<iframe>` — anything else (`allowFullscreen`, `allowfullscreen`) is silently
      // dropped with an "Invalid DOM property" warning. Preact accepts any casing. This is the one
      // spelling that produces a real `allowfullscreen`-equivalent attribute in both
      // `react-dom/server`'s `renderToStaticMarkup` and `preact-render-to-string`'s `render`
      // output. `types.ts`'s own public prop stays `allowFullscreen` (matching the real DOM IDL
      // property name) — this remapping is the ONE place that quirk needs to be known at all.
      allowFullScreen: allowFullscreen,
    }, children)
  }
}
