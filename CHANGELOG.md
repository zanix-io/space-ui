# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/) and this project
adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-09-01

### Added

- **`Modal`/`Drawer`/`Toast` accept a new `closeButtonContent` prop** that overrides their built-in
  close button's visible content (a `CatalogIcon`, a plain `<svg>`, any renderer node) — the
  default, when omitted, is now a real inline "X" `<svg>` (`shared/close-button-icon.ts`) instead of
  a plain Unicode glyph, since a system-font character can render inconsistently, or as a
  missing-glyph box, across browsers/platforms. `aria-label="Close"` stays the button's accessible
  name either way.
- **`Modal`, `Drawer`, `Toast`, `Tooltip`, and `Popover` accept a new `nonce` prop** for pages
  running a nonce-based `style-src` Content-Security-Policy — `@zanix/space`'s own zero-config
  default is exactly this shape. All five now position themselves (`position`/`z-index`, plus each
  component's own per-instance anchor) via a self-rendered `<style nonce={nonce}>` element instead
  of an inline `style` attribute, since a CSP nonce never applies to a `style="..."` attribute, only
  to a `<style>` element — applying it inline is a real, confirmed-in-browser CSP violation.
  `Tooltip`/`Popover`'s own genuinely dynamic positioning (a
  `transform`/`visibility`/`pointerEvents` recomputed every render from a live `usePosition`
  measurement) is covered too, via a CSSOM rule mutated inside that same `<style>` element rather
  than `HTMLElement.style` directly. `nonce` is optional and has no effect when the consuming page
  has no such CSP.
- **New shared helpers backing the above**: `src/shared/overlay-position-css.ts` builds the static
  CSS text for a fixed-position overlay from its existing style-object constants
  (`MODAL_POSITION_STYLE`/`DRAWER_SIDE_STYLE`/…) and manages the CSSOM rule `Tooltip`/`Popover` use
  for their dynamic positioning; `src/shared/create-element-nonce-hydration-fix.ts` (React binding
  only) suppresses the cosmetic hydration-mismatch warning React logs for a server-rendered
  `<style
  nonce>` element, since a browser clears the `nonce` content attribute back to `""` right
  after use and React's hydration check doesn't special-case `<style>` the way it does `<script>`;
  `src/shared/close-button-icon.ts` renders the new default close icon.
- `docs/styling.md` documents the new `nonce`-based positioning contract and the dynamic-rule
  mechanism `Tooltip`/`Popover` use; `README.md` documents the new `closeButtonContent` contract for
  `Modal`/`Drawer`/`Toast`.

### Changed

- **`Modal`'s/`Drawer`'s backdrop and dialog/panel positioning, and `Toast`'s stack positioning,
  move from an inline `style` attribute to a component-rendered `<style>` element** (see `nonce`,
  above). The values and their shape are unchanged; only how they reach the DOM is different. One
  real, honest trade-off: unlike inline `style`, the injected rule is now ordinary CSS with ordinary
  specificity, so a consumer's own same-specificity rule loaded later in the DOM could in principle
  override it — in practice not a real risk for the common case (a stylesheet in `<head>` still
  resolves in the component's favor by source order against a `<style>` element rendered later in
  `<body>`).

## [0.2.1] - 2026-08-30

### Fixed

- **`Modal`/`Drawer` no longer pull `@zanix/utils`'s full, server-capable `Logger`
  (`@zanix/utils/logger`) into a browser bundle.** Both components' own `render.ts` imported that
  entry directly for their one `logger.warn` call; its `WorkerManager` and
  `Deno.readTextFile`-backed default storage don't resolve to a local file for a browser bundler, so
  bundling either component pulled in real, remote `https://jsr.io/...` fetches for
  `@std/fmt/colors`/`@std/path` on every page load — a confirmed, reproduced regression (a
  consumer's own error page took noticeably longer to become interactive, traced to this exact chain
  via the browser's own Network panel). Both now import the new `src/shared/client-logger.ts`, a
  thin wrapper around `@zanix/utils/logger/client`'s browser-safe `createClientLogger`, the same fix
  `@zanix/space`'s own `modules/client/client-logger.ts` already applies. The `'noSave'` flag each
  call site passes is unrelated to this fix and stays: it's a runtime flag on that one call, and was
  never able to keep the OTHER entry's static import graph out of a bundle in the first place.

### Changed

- **`theme/space-defaults.css`'s scaffolded root-element hook is now the generic
  `[data-space="content"]`, replacing the `--template welcome`-specific `[data-space="welcome"]`.**
  Every `@zanix/cli`-scaffolded template (`welcome`, `population`, and any future one) renders the
  same `<main data-space="content">`, so a new template inherits this styling automatically, with no
  changes needed here. Also adds baseline `code`/`pre` styling — scoped outside
  `[data-space="content"]`, since either element can appear on any scaffolded page — matching
  `--template population`'s own tutorial content, the first scaffold to use them. See
  [`docs/styling.md`](./docs/styling.md).

## [0.2.0] - 2026-08-26

### Changed

- **BREAKING: `Video`, `Image`, `RichText`, `ImgButton`, `Card`, and `Menu` (plus `RichText`'s own
  `resolveRichTextDocument`, `ResolveRichTextDocumentOptions`, and `extractRichTextProps`) are no
  longer exported from the default `.`/`./preact` entrypoints — import them from the new
  `./runtime`/`./runtime/preact` subpaths instead.** Each of these six has a real,
  direct-or-composed runtime dependency on `@zanix/space` (its `resolveAssetHref`, from
  `@zanix/space/assets-manifest`): `Video`/`Image`/`RichText` resolve it directly; `RichText` also
  composes `Image` and `Video` internally for its built-in tags; `ImgButton` and `Card` each compose
  `Image`; `Menu` composes both `Image` and `ImgButton`. Leaving them in the same barrel as the
  other ~27 components (which have zero `@zanix/space` dependency) meant importing even ONE
  unrelated component from `.` (e.g. `Button`) forced resolution of the entire barrel, including
  these six — pulling `@zanix/space` back into the graph. Since `@zanix/space`'s own build pipeline
  is what resolves a `@zanix/space-ui` import when building a `@zanix/space` app that uses this
  package, that produced a genuine circular resolution (`@zanix/space`'s own build tooling needing
  to resolve `@zanix/space` itself, one repo away) that hung `@deno/loader`'s native workspace
  resolution in a real `zanix space build` (confirmed via an isolated minimal repro). No deprecation
  window: `space-ui@0.1.0` was published this same release cycle with no confirmed external consumer
  of any of these six components from the bare root — an ecosystem-wide audit (`cli`, `console`)
  found only `createFormatter`, `Link`, `Button`, `Modal`, `Table`, `Field`, `Input`, and
  `TableColumn` imported from `@zanix/space-ui` today, none of which move. `.`/`./preact` now never
  reach `@zanix/space` at all (a permanent structural guard already enforces this — see
  `src/@tests/unit/intl/dependency-boundary.test.ts`); `./runtime`/`./runtime/preact` do, by design.

  | Was (root)                                                                                  | Now                                                                                                 |
  | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
  | `import { Video } from '@zanix/space-ui'`                                                   | `import { Video } from '@zanix/space-ui/runtime'`                                                   |
  | `import { Image } from '@zanix/space-ui/preact'`                                            | `import { Image } from '@zanix/space-ui/runtime/preact'`                                            |
  | `import { RichText, resolveRichTextDocument, extractRichTextProps } from '@zanix/space-ui'` | `import { RichText, resolveRichTextDocument, extractRichTextProps } from '@zanix/space-ui/runtime'` |
  | `import { ImgButton, Card, Menu } from '@zanix/space-ui'`                                   | `import { ImgButton, Card, Menu } from '@zanix/space-ui/runtime'`                                   |

### Added

- **`theme/space-defaults.css`** (`src/templates/`, scaffold-only — never imported by this package's
  own runtime, and never imported by `@zanix/space` either) — real, minimal styling for
  `@zanix/space`'s own built-in `[data-space="not-found"]`/`[data-space="error"]` fallback views and
  `--template welcome`'s `[data-space="welcome"]` landing page, wired up by `@zanix/cli`'s
  `zanix new space --template themed`. References only semantic `--space-*` tokens from
  `theme/tokens.css`, same discipline `shared/behavior.css` already follows. See
  [`docs/styling.md`](./docs/styling.md). **Not yet fetched over JSR by `@zanix/cli`** — this file
  postdates the currently published `0.1.0`, so `space-theme.ts` ships a byte-identical embedded
  copy for now (`LOCAL_SPACE_DEFAULTS_CSS`); the NEXT publish that includes this file should switch
  `cli` over to fetching it for real and delete that embedded copy.

## [0.1.0] - 2026-08-24

### Added

- **`Icon`** — an SVG sprite icon (`<svg><use href="#..." /></svg>`). Takes an already-resolved
  sprite `href`, symbol `name`, and explicit `viewBox` as props — no client-side fetch-and-sniff of
  the sprite to discover the `viewBox`, so it renders correctly on the very first paint (SSR or
  not), with no layout shift once real dimensions "arrive." Decorative by default (`aria-hidden`);
  passing `label` switches it to an accessible image (`role="img"` + `aria-label`). Optional `id`
  passthrough (e.g. for `aria-describedby` from elsewhere, or a test/CSS selector).
- **`data-space-ui` hooks** — `Button`, `Icon`, `Link`, and `SocialNetworks` each render a stable
  `data-space-ui="<name>"` attribute on their root element (`"button"`/`"icon"`/`"link"`/
  `"social-networks"`) — a semver-protected, but otherwise inert, selector hook for an _optional_
  stylesheet (the `theme`/`shared` templates below, or a consumer's own CSS) to target, without
  resorting to a bare element selector. Nothing in this package reads or reacts to it; `className`
  remains the primarily supported styling path. `StructuredData` carries none — it has nothing to
  style. See [`docs/styling.md`](./docs/styling.md).
- **`theme/tokens.css` and `shared/behavior.css`** (`src/templates/`, scaffold-only — never imported
  by this package's own runtime) — two independent optional starter files a scaffolded project owns
  outright. `theme/tokens.css`: a starter default palette, primitive + semantic `--space-*` tokens,
  following `@zanix/space`'s own `docs/theming.md` convention exactly. `shared/behavior.css`:
  structural/animation CSS (`.overlay`/`.hidden-overlay` + five `@keyframes`) rescued from the
  legacy `react-components` library's Tachyons extension — re-tokenized (no hardcoded color/z-index;
  both now reference semantic tokens) and renamed with a `space-ui-` prefix for collision safety,
  deliberately theme-agnostic so any theme (or none) can reuse it unchanged. **Resolves the legacy
  BEM + Tachyons system as a mechanism, not just a choice of which utility framework to use**: BEM
  stops being an architecture/collision-avoidance mechanism of `space-ui` — no runtime
  `useStyles`-style hook exists here, and its naming convention is only ever an optional, unenforced
  choice inside a future CSS Module. Tachyons is not part of the implementation or the contract at
  all — its role (atomic utility CSS) is already covered by Tailwind v4, `@zanix/space`'s own
  `cssPlugin` default. See [`docs/styling.md`](./docs/styling.md) for the full resolution.
- **`CatalogIcon` and the default icon catalog** — `Icon`, pre-wired to an optional, curated 17-icon
  default catalog (`spinner`, `close`, `gear`, `phone`, `envelope`, four arrows, `map-location-dot`,
  `search`, `check`, `plus`, `minus`, `triangle-exclamation`, `circle-info`, `circle-check` —
  `CatalogIconName`, a closed union, never a bare `string`). Resolves `name` to the catalog's own
  real, individually-verified `viewBox` (a plain object lookup — no `Map`, no fetch, no I/O) and
  delegates the actual render to the unmodified `Icon`; `href` is still the caller's own concern,
  exactly as `Icon` already requires. Zero cost for a consumer that never imports it. The catalog
  itself (`src/templates/shared/icons/catalog.svg` + `NOTICE.md` +
  `LICENSES/fontawesome-free-7.3.1.txt`) is sourced from the official
  `@fortawesome/
  fontawesome-free@7.3.1` npm package (verified against that exact version, not an
  older one) — `CC BY 4.0`-licensed, zero brand/social icons (a separate trademark restriction Font
  Awesome's own license carries), zero icons copied from the legacy `react-components` sprite
  (`base.svg`), which had no license/attribution artifact of its own. Every symbol uses
  `fill="currentColor"` — color always arrives via ordinary CSS inheritance, never a prop or token
  reference. Shipped here readable, not pre-minified — formatted with this package's own `deno fmt`,
  same as every other file; minification is a build-time concern for a consuming project's own
  `assetsPlugin`, not baked in. That's safe by default now, not just opt-in: `@zanix/space`'s own
  `assetsPlugin` scans a file's `<symbol id>`s before svgo runs and hands them to svgo's own
  `cleanupIds` plugin as ids to preserve, on every eligible file, with no config needed (svgo's
  plain default config otherwise strips every symbol id in a multi-symbol sprite — it can't see an
  external `<use href="...#name">` reference living in a separate file). A bare
  `optimize: { svg: true }` in a consuming project's `space.app.ts` already keeps this catalog's 17
  ids intact — `optimize.svg`'s `{ preserveIds }` object form still exists, but only as a
  supplementary escape hatch for a rarer, non-symbol case. See
  [`docs/icons.md`](./docs/icons.md#svg-optimization) for the full mechanism and its own current
  status. Lives under `shared/`, never `theme/` — usable by any theme, a fully custom one, or none
  at all; changing or deleting a project's theme never affects it. A matching `--icons` flag exists
  in `@zanix/cli`'s `zanix new space`/`spacecraft` (independent of `--template`), also generating
  this project's own `src/space/catalog-icon.ts` (`CatalogIcon` pre-wired to
  `resolveAssetHref('icons/catalog.svg')`, so a consumer never passes `href` themselves) and wiring
  `loadAssetsManifest` into the generated `mod.ts` — fully wired and tested on the CLI side,
  including a real end-to-end integration test with no mocks — but **the actual scaffold fetch
  cannot run yet**, since this package isn't published to JSR; it fails with a clear, deliberate
  error rather than guessing a version or falling back to any kind of live "latest" lookup. See
  [`docs/icons.md`](./docs/icons.md) for the complete picture, including exactly what's blocked and
  why.
- **`createCatalogIcon`** — the factory `CatalogIcon` itself is built from, now a public,
  renderer-agnostic export (`(h, viewBoxByName) => (props) => E`), exported identically from both
  entrypoints (parametrized by `h`, not bound to one, same as `resolveStructuredData`). Lets a
  consumer bind the exact same "known `name` → real `viewBox`, no lookup at the call site"
  ergonomics `CatalogIcon` gives this package's own 17-icon set to their **own** name→viewBox map
  instead — one call, once per renderer, no build step. Ships with its generic props type,
  `IconCatalogProps<Name>` (`CatalogIconProps` is now just `IconCatalogProps<CatalogIconName>`), and
  `CreateElement`, needed to type a custom `h`/`createElement` binding. See
  [`docs/icons.md`](./docs/icons.md#building-your-own-catalog-with-createcatalogicon) for the full
  use case and a worked example.
- **`@zanix/space-ui/preact`** — a Preact-bound entrypoint alongside the default (React) one, same
  props and rendered markup either way. `Icon`'s actual logic (`components/Icon/render.ts`) is
  shared verbatim between both — never `preact/compat`, never a runtime renderer check — by writing
  it against `React.createElement`/`Preact.h`'s common call signature instead of JSX, then binding
  it to each renderer once, at `index.ts`/`index.preact.ts`. This is the pattern every future
  presentational (non-stateful) component in this package will follow; a component with real
  per-renderer hook usage will need a full second implementation instead, the same way
  `@zanix/space` itself splits `render-page-react.tsx`/`render-page-preact.ts`.
- **`SocialNetworks`** — a list of external social-network links (`links: SocialNetworkLink[]`),
  each rendered as an accessible `<a target="_blank" rel="noopener noreferrer">` wrapping either an
  `Icon` (sprite reference) or an image logo (`SocialNetworkLogo` — for a brand mark that isn't in
  the sprite). The accessible label defaults to `` `Go to ${name}` ``, the `title` defaults to
  `` `${name} logo` ``, both overridable per link. Renders `null` for an empty `links` list, rather
  than an empty, landmark-less `<ul>`. Available for both React and Preact, same pattern as `Icon`.
  Per-link `rel` override — same escape hatch `Link.rel` already offers, for the same real case:
  `rel="me"` (IndieWeb/Mastodon identity verification) needs the safe `noopener noreferrer` tokens
  kept alongside it, not replaced. An image logo (`SocialNetworkLogo`) also takes an optional native
  `loading` passthrough — unset by default, since whether a social-links list sits below the fold
  (where `'lazy'` is a real Core Web Vitals win) or in a prominent header spot (where it would only
  hurt LCP) is the caller's own layout call, never assumed here.
- **`StructuredData`** — a `<script type="application/ld+json">` tag from typed
  [schema.org](https://schema.org) data (`schema-dts`'s own `Thing`/`WithContext` types). `data` is
  rendered exactly as given, except `@context` defaults to `'https://schema.org'` when `data`
  doesn't already set it — an explicit `@context`, even a non-default one, is never overridden.
  Never formats content or resolves a logo URL. Available for both React and Preact. Serialized via
  **`escapeJsonLd`** (also exported standalone), not a bare `JSON.stringify` — `JSON.stringify`
  never escapes `/`, so a `data` value containing the literal text `</script>` (a realistic field
  for the schemas this is actually used for — `Review.reviewBody`, `Product.description`, anything
  sourced from user content) would otherwise close this element's own `<script>` tag early and let a
  following `<script>` actually execute, in both React's real `renderToStaticMarkup` and Preact's
  `render()` output. The escaped payload still `JSON.parse`s back to the exact original value — this
  changes the serialization's safety, never the data.
- **`resolveStructuredData`** — the `@context`-defaulting computation behind `StructuredData`,
  exported standalone (renderer-agnostic, no `h`/`createElement` involved) for a consumer that wants
  the final JSON-LD object without the component itself — e.g. injecting it into a raw HTML template
  outside React/Preact entirely. The component's own bindings call this too; there is only one
  implementation of the logic. The closest equivalent to the legacy `useStructuredData` hook, minus
  the parts that only existed because that hook depended on i18n Context.
- **`Link`** — a plain `<a>` with sensible external-link attributes (`target="_blank"` + safe `rel`
  when `external` is set — `rel` itself overridable for `'nofollow'`/`'sponsored'`/pagination
  `'next'`/`'prev'`). No internal-vs-external routing branch, unlike the legacy component this
  replaces: `@zanix/space`'s own Orbit navigation intercepts plain anchor clicks without an opt-in
  `Link`-style component the way `react-router`'s does, so this component only ever adds attributes,
  never routing logic. `onClick` is optional, for real cases that need it alongside navigation
  (analytics, confirm-before-leaving) — it never replaces navigation. Available for both React and
  Preact.
- **`Button`** — a real `<button>`, split out from the legacy `Link`'s `role="button"` variant into
  its own component: an action belongs on a `<button>` for real keyboard/`disabled`/assistive-tech
  semantics, never on an `<a>` styled to look like one. `onClick` is optional (a `type="submit"`
  button in a `<form>` often needs none of its own); `name`/`value` identify which button was
  pressed in a multi-action form. `label` is only needed for an icon-only button; one with visible
  text `children` already has an accessible name from that text — unlike the legacy `Button`, this
  one doesn't force an accessible-name prop by type when the text content already provides it.
  `role` is a discriminated union, not a loose string: `role="switch"` (or
  `"checkbox"`/`"radio"`/`"menuitemcheckbox"`/`"menuitemradio"`, see `CheckedButtonRole`) is a
  compile error without `checked`, and `role="tab"` without `selected` — both are REQUIRED companion
  state per their own WAI-ARIA spec, with no sensible default `Button` could supply (whether a
  switch is on is always caller-owned), so the type makes forgetting them impossible rather than
  leaving it to a comment. Available for both React and Preact.
- **`IFrame`** — a real, standalone `<iframe>` primitive, not private to any other component: every
  embed branch a future `Video` (built on `@zanix/space`'s `detectVideoSource`) needs — YouTube,
  Vimeo, a generic third-party URL — ends at this same primitive, and anything else (a map, a
  scheduling widget) can reuse it too. A rescue of the legacy `zjs-react-components` `IFrame`
  (`src`, renamed from that component's own `url`; `allow`; `allowFullscreen`; `width`/`height`).
  `title` is now REQUIRED, not optional — a real, common accessibility gap the legacy type allowed.
  `loading="lazy"` (browser-native, zero JavaScript) replaces the legacy `lazy` prop, a custom
  `IntersectionObserver`-driven mechanism with its own placeholder-swapping event bus; `onLoad` (a
  plain DOM callback) replaces that same mechanism's global pub/sub load notification — the
  capability survives, the bespoke machinery does not. `sandbox` is new; the legacy component always
  embedded third-party content with no sandboxing story at all. Deliberately dropped, each with its
  own real argument (see `render.ts`'s own doc): `role` (its one real legacy consumer was an invalid
  ARIA value), `datatype` (non-standard, analytics-only), `aspectRatio` (a JS hook tied to a legacy
  resolution store — a consumer sizes this via real CSS through `className` instead), `format` (i18n
  interpolation — this component always takes already-resolved props). `allowFullscreen` (matching
  the real DOM IDL property name) is remapped internally to the one prop spelling
  (`allowFullScreen`, capital S) React actually recognizes for `<iframe>` — the one each renderer's
  real serialized output actually uses. SEO: `width`/`height` (CLS) and `loading` (LCP) each carry
  their own Core Web Vitals guidance in their own doc comments; embedded third-party content is
  never credited to the parent page's own indexing regardless. Available for both React and Preact.
- **`Video`** — a rescue of the legacy `zjs-react-components` `Video` (`Selector.tsx` + `Main.tsx` +
  `Sources.tsx`), built entirely on primitives this package/ecosystem already has: `@zanix/space`'s
  `detectVideoSource` classifies `src`; `buildProviderEmbedUrl` builds the real YouTube/Vimeo embed
  URL; `IFrame` (this package's own) renders the YouTube/Vimeo/generic-URL cases; `@zanix/space`'s
  `resolveAssetHref` resolves a local file/poster/track `src` to its real, possibly content-hashed
  build URL — an absolute URL passes through untouched. The file case gets real native `<video>`
  attributes: `controls`, `autoPlay`, `loop`, `muted`, `playsInline`, `preload`
  (`'none'|'metadata'|'auto'`), and a real `tracks: VideoTrackProps[]` (replacing the legacy
  `captions` boolean, which the legacy `Main.tsx` ignored entirely — it always rendered exactly one
  hardcoded `<track>` regardless of that flag's value). The SAME `controls`/`autoPlay`/`muted`/
  `loop` also thread through to a YouTube/Vimeo embed's own real query parameters; a generic
  third-party iframe embed ignores all four — rewriting an arbitrary provider's own query string
  isn't something this package can do safely, the same conclusion `buildProviderEmbedUrl`'s own doc
  already reaches. `title` is required (same reasoning as `IFrame.title`); used as the embed
  `IFrame`'s own title, or as an `aria-label` for the native `<video>` case. Renders `null` for an
  undetectable/unsupported source (e.g. an `.m3u8` HLS manifest — `@zanix/space` doesn't support
  HLS, so this is neither a playable file nor an embeddable page), the same "nothing meaningful to
  render" posture `SocialNetworks` already takes for an empty list. `playsInline` (capital I) and a
  `<track>`'s `srcLang` (capital L) are each remapped internally the same way `IFrame`'s own
  `allowFullScreen` already is — these are the specific spellings each framework actually recognizes
  in both renderers' real output. Deliberately NOT ported, each with its own real argument (see
  `render.ts`'s own doc): "pretty controls" (native `controls` only — headless, same principle as
  every other component here), custom lazy-loading (`loading="lazy"` only, same as `IFrame`), a
  `videoRef` (no ref-forwarding pattern exists anywhere else in this package yet), and Vimeo's
  `background` option (real, but not asked for — a consumer needing it calls `@zanix/space`'s own
  functions directly instead). This is also this package's FIRST real runtime dependency on
  `@zanix/space` (previously zero — every other component takes only already-resolved props),
  resolved through a local path override in `deno.jsonc` while `@zanix/space` is still unpublished,
  and through two matching narrow subpath exports on `@zanix/space`'s own side (`./video-source`,
  `./assets-manifest`) added so this never has to pull in the full framework (React/Preact
  renderers, router, `sharp`, `svgo`, …) just to detect a video source or resolve an asset href.
  Available for both React and Preact.
- **`Video.sources`** — `VideoSourceProps[]` (`media?`, `src`, `type?`), file case only, rendered as
  native `<source>` children of `<video>` — the same shape as `Image.sources`, resolved through the
  identical `resolveFileSrc` helper the file case's own `src`/`poster`/track `src` already use.
  `media` is deliberately optional: a `<source>` with no `media` is valid HTML and acts as an
  unconditional candidate, useful on its own for format/codec fallback (e.g. a `.webm` entry ahead
  of an `.mp4` one), and combinable with `media` on the same entry to express "this codec, at this
  breakpoint" in one candidate. Order is preserved verbatim, and the resolved top-level `src` is
  appended as the final, unconditional fallback candidate — the same role a `<picture>`'s trailing
  `<img>` plays for `Image`. One load-bearing spec detail this depends on, verified directly against
  the WHATWG "resource selection algorithm" (not assumed): a media element with a `src` ATTRIBUTE
  set on the element itself uses only that attribute — `<source>` children are never evaluated at
  all in that case. So when `sources` is non-empty, the rendered `<video>` carries no `src`
  attribute of its own; `sources`, plus the appended fallback, become its only `<source>` children.
  When `sources` is absent or empty, behavior is unchanged: `<video src="…">`, no `<source>`
  children. `media`/`type` on each `<source>` are passed verbatim to the browser, which performs its
  own resource selection — this component never evaluates a media condition or picks a candidate
  itself. Confirmed against the WHATWG spec that `media` on `<source>` is defined for `<video>`/
  `<audio>`, not only `<picture>`, and that source selection for a media element runs ONCE — at
  creation, when `src` changes, or on an explicit `.load()` — never automatically re-run later just
  because the viewport changed, unlike `<picture>`. `fetchPriority`/`crossOrigin`/`referrerPolicy`
  aside, `<source media src type>` inside `<video>` was confirmed to serialize identically, verbatim
  attribute names, in both React's `renderToStaticMarkup` and Preact's `preact-render-to-string` —
  no casing remap needed. No JavaScript-driven source switching is reintroduced: no `useResolution`,
  no resize listener, no `useEffect`, no video ref, no DOM mutation, no `.load()` triggered by a
  viewport change — a video already playing is never interrupted by responsive logic. This was a
  deliberate correction against a prior mechanism that reset `currentTime` to `0` and stopped
  playback (`paused` → `true`) on every resource swap, per the WHATWG "media element load algorithm"
  (`volume`/`muted` are the only playback-adjacent state that mechanism preserved). `poster` remains
  a single resource — there is no `<source>`-equivalent mechanism for it at all, so a
  breakpoint-aware poster would require this component to compute or react to the viewport itself,
  reintroducing exactly the responsive-JS machinery `sources` was designed to avoid needing; a
  conscious decision, not an oversight. No breakpoint preset names (`msm`/`mlg`/`dmd`/`dlg`/`thum`)
  are ever hardcoded — a caller supplies its own real `media` condition and resolved `src` directly,
  the same architecture already established for `Image.sources`. Has no effect on the YouTube/
  Vimeo/generic-iframe branches — never read there at all.
- **`Image`** — built on the same primitive `Video` already established: `@zanix/space`'s
  `resolveAssetHref` resolves `src`, each `sources[].src`, and the new `placeholder` (see below) to
  its real, possibly content-hashed build URL — an absolute URL passes through untouched, exactly
  like `Video.src`/`Video.poster` already do. This is also what makes a generated image file (e.g. a
  video thumbnail, once registered as a normal asset) trivially usable as an `Image.src` or
  `Image.placeholder` — this component has no notion of where either came from, by construction.
  Renders a bare `<img>` when `sources` is absent or empty, or a `<picture>` (one `<source>` per
  entry, in order, the fallback `<img>` always last) otherwise — an explicit
  `sources: ImageSourceProps[]` prop mirroring native `<source>` attributes 1:1; `@zanix/space` has
  no canonical, importable breakpoint-name set to key this by, so a caller-supplied `media`
  condition is the API instead. A native `<source>`'s real DOM attribute is `srcSet`, not `src` —
  `ImageSourceProps.src` stays named `src` for API consistency with `ImageProps.src`, remapped onto
  the real attribute in `render.ts`, the same spirit as `IFrame`'s own `allowFullscreen`→
  `allowFullScreen` remap. Native `loading?: 'lazy' | 'eager'` only, no custom
  `IntersectionObserver` machinery — same principle `IFrame.loading`/`Video.loading` already
  establish. New, real platform primitives: `fetchPriority`, `crossOrigin`, `referrerPolicy`,
  `onLoad`, `onError`. `fetchPriority`/`crossOrigin`/`referrerPolicy` serialize identically,
  camelCase, on the real `<img>` element in both React's `renderToStaticMarkup` and Preact's
  `preact-render-to-string` — no casing remap needed here, unlike `allowFullscreen`/`srcLang`. One
  real, React-specific asymmetry WAS found this way and is documented, not remapped (there's nothing
  to remap): React 19's `renderToStaticMarkup` emits its own `<link rel="preload" as="image">`
  resource hint as a sibling whenever `fetchPriority` is left unset, `'auto'`, or `'high'` —
  confirmed by testing all four values directly, not assumed from one — a real SSR optimization with
  no Preact equivalent; it doesn't change this component's own rendered markup or affect hydration.
  A second SSR-only quirk, unrelated to any new prop: React's `renderToStaticMarkup` serializes
  `alt=''` as `alt=""` explicitly, while Preact's `preact-render-to-string` serializes it as a bare
  `alt` attribute with no `=""` — both parse to the identical empty-string `alt` value in a real
  browser, a pure string-representation difference, confirmed by a dedicated test rather than
  assumed. `id`/`className`/`data-space-ui="image"` always render on the `<img>` itself, in BOTH
  branches — never on the `<picture>` wrapper: `object-fit`/`object-position`/percentage sizing only
  ever apply to a replaced element (`<img>`, `<video>`, …), never to `<picture>`, which generates no
  box of its own. No `aspectRatio` prop or JS-computed sizing (real CSS `aspect-ratio` via
  `className` is a strict upgrade — it works before JS hydrates and needs no runtime computation,
  same argument `IFrame` already used for its own dropped `aspectRatio`); no `alt`-formatting API
  (this package's own design principle is already-resolved props, same reasoning `IFrame` already
  used); no ref of any kind (no ref-forwarding pattern exists anywhere else in this package yet,
  same argument `Video` already gives for its own dropped `videoRef`); no `srcSet`/`sizes`
  `w`-descriptor pattern (no pixel-width data exists anywhere in `@zanix/space` to back it — only
  `<picture>`+`<source media>` art-direction, which `sources` already covers). Applies no
  `object-fit` (or any other visual) default of its own — `className` is the one styling mechanism
  this whole package uses; a consumer that wants a fill-and-cover look gets it, with full control
  (`contain` included), via plain CSS on `className`. `placeholder?: string` shows a fallback image
  while `src` hasn't loaded yet — a real, independent capability (not a lazy-loading detail: it
  works the same under `loading='lazy'`, `'eager'`, or unset, and composes with `sources` for free),
  rendered as a `background` shorthand CSS value on the `<img>` itself since `<img>` has no native
  `poster`-equivalent attribute the way `<video>` does. The one narrow, deliberate exception to "no
  component-owned visual defaults" in this whole package: `placeholder` isn't a design opinion (it's
  the same already-resolved-data contract `src` has, just with no HTML attribute to carry it), and
  the fixed `center / cover
  no-repeat` companion values aren't configurable because there's no
  legitimate scenario where a placeholder should tile or misalign — unlike `object-fit` on the final
  image, which stays a real, app-specific choice left entirely to `className`. Only present when
  `placeholder` is set; with no `placeholder`, `<img>` emits no inline `style` at all, identical to
  before this was added. Available for both React and Preact.
- **`ProgressBar`** — a determinate (`timeout`, milliseconds) or indeterminate loading indicator.
  Two nested elements, a track (`data-space-ui="progress-bar"`) and a fill — no hooks, no state, no
  timers, and no `animation` CSS property set by the component itself. All actual visual behavior
  lives in real CSS: this package's own optional `shared/behavior.css` scaffold now carries the
  rules (`[data-space-ui="progress-bar"] > div[data-timeout]` for the one-shot drain, using the
  already-present `space-ui-progress-bar`/`space-ui-infinite-progress` keyframes; a
  `prefers-reduced-motion: reduce` override removes the animation entirely rather than offering a
  motion alternative, since neither variant has a meaningful one). The fill exposes exactly the
  per-instance data an animation needs and nothing else: `data-timeout` (present, with the real
  millisecond value, whenever `timeout` is set) and a `--space-ui-progress-duration` custom property
  with that same value — never a hardcoded keyframe name or an `animation` property, which would
  mean this component assuming a specific external stylesheet exists. With zero CSS applied at all,
  it's still valid, correctly sized, inert markup — the same "headless until styled" posture every
  other component here already has. Real ARIA semantics, not just visual chrome: decorative
  (`aria-hidden`) by default, the same convention `Icon.label` already establishes; passing `label`
  switches the track to `role="progressbar"` with declared `aria-valuemin="0"`/`aria-valuemax="100"`
  bounds. `aria-valuenow` is never set on either path — this component has no JS ticking a real
  numeric value at any instant (the fill's position is a pure CSS animation), so per WAI-ARIA,
  omitting it is the correct, honest way to mark the widget indeterminate, rather than fabricating a
  number no assistive technology reader could trust. `height` accepts a bare number (treated as
  pixels, `7` by default) or any CSS length string verbatim. Available for both React and Preact.
- **`Grid`/`GridItem`** — a real `display: grid` container plus its cell primitive, both pure
  functions of their props: no hooks, no state, no timers. Audited for viewport dependence (the
  transversal criterion applied to every component going forward): none — `templateColumns`/
  `templateRows`/`gap`/`height` are all static, caller-supplied values, confirmed by reading the
  component this rescues directly. `templateColumns`/`templateRows` accept a `TemplateArea`
  shorthand — a `number` (`repeat(n, 1fr)`), a `string[]` (joined with spaces), or any raw CSS
  track-list string, defaulting to `'repeat(auto-fit, minmax(100px, 1fr))'` when omitted, same as
  before. `display: grid` is set inline, unconditionally — the one exception to "no component-owned
  styling" this needs: not a visual opinion with a legitimate alternative (there's no valid "Grid
  but not actually a grid" state), the same category as an `<img>`'s `width`/`height` attributes. No
  default height is imposed when `height` is omitted — the browser's own `height: auto` applies,
  never a component-chosen fallback (the height shorthand it rescues always added an
  inherited-height utility class unconditionally; this doesn't). `GridItem`'s
  `columnStart`/`columnEnd`/`rowStart`/ `rowEnd` map straight onto the real CSS
  `grid-column-start`/`grid-column-end`/`grid-row-start`/ `grid-row-end` properties, identically on
  both axes, with NO offset applied to either — a real fix, not a straight port: the version this
  rescues added `+1` to `columnEnd` only, never to `rowEnd` (confirmed by reading both code paths),
  an inconsistency with no real justification rather than an intentional convenience. Every value is
  now the real CSS grid line number on both axes; a `columnEnd` value carried over unchanged now
  spans one column less — add 1 at the call site for the previous visual result. A load-bearing
  cross-renderer difference applies here: React's own style-object serializer knows
  `grid-column-start`/`grid-row-end` (and their siblings) are unitless integer properties and emits
  them bare, but Preact's does not recognize these specific properties as unitless and silently
  appends an invalid `px` suffix to a bare JS `number` (the browser then drops the whole
  declaration, falling back to `auto` — a real, silent layout failure, not cosmetic). Both renderers
  behave this way directly, regardless of precedent; every grid-line value is stringified before it
  reaches the style object to sidestep this in both renderers identically — covered by a dedicated
  Preact test that would catch a regression back to a bare number. Runtime child-type validation
  (`item.type !== GridItem`, throwing otherwise) is not ported — this package trusts its own
  TypeScript types for structural contracts elsewhere (`Button`'s `role`/`checked`/ `selected`
  pairing has no runtime check either), and the specific thing that check protected — auto-injecting
  an `index` prop and merging a `styles` prop into every child via `cloneElement` — no longer exists
  to protect: both existed solely to feed this package's own discarded BEM styling convention and
  have no other purpose once that mechanism is gone. With nothing left to inject, `Grid` renders
  `children` exactly as given, with no React-specific child-manipulation API standing in the way of
  the Preact binding either. A `useEffect` that added a `display: contents` utility class to every
  one of `GridItem`'s own DOM children on mount (letting a wrapping element inside a cell disappear
  from grid-track sizing) is replaced by a single declarative CSS rule a consumer adds once —
  `[data-space-ui="grid-item"] > * { display: contents; }` — zero JS, and zero of the mount-only
  timing gap the imperative version had (a real, if minor, first-paint mismatch this doesn't have).
  `data-space-ui="grid"`/`"grid-item"` on their respective roots. Available for both React and
  Preact.
- **`Card`** — a title/subtitle/content/footer/image composition built entirely on `Grid`, `Image`,
  and `Link` — no duplicated asset-resolution, `sources`/`placeholder`, or link-rendering logic of
  any kind; this component's own render function contains no hooks, no state, and (confirmed by
  grep, not merely by omission) no `useResolution`, `window`, `resize`, `matchMedia`, or
  `IntersectionObserver` reference anywhere. The component this rescues used `useResolution('dsm')`
  to compute a stacked/side-by-side layout choice in JS, then branched between two different sets of
  Grid/GridItem props — a real structural difference (not just styling), reproduced here without any
  JavaScript at all: `Card` always renders the exact same structure — a fixed
  `templateColumns="1fr 1fr"`/`templateRows="repeat(5, auto)"` `Grid`, with every `GridItem` given
  no placement props whatsoever — and an entirely optional `shared/card.css` expresses the
  responsive reflow purely through `grid-template-areas`, the one grid property `Grid` never sets as
  an inline style (unlike `grid-template-columns`/`grid-template-rows`, which it always does — see
  `Grid/render.ts`'s own doc — an inline style that no external rule, media query or not, can
  override without `!important`; this design needs `!important` nowhere, by construction, not by
  overriding it). Each `GridItem` is made transparent to the grid via
  `[data-space-ui="card"] [data-space-ui="grid-item"] { display: contents; }`, scoped strictly under
  `Card`'s own root — a `GridItem` used anywhere else is entirely unaffected, and `Grid`/ `GridItem`
  themselves needed zero changes to support this. `grid-area` is assigned instead to `Card`'s own
  internal wrappers (`data-space-ui="card-title"`/`"card-subtitle"`/`"card-content"`/
  `"card-footer"`/`"card-image"` — the first component in this package with several named sub-part
  hooks in a single instance). The default (no media query) layout stacks every area into one visual
  column, in DOM order — title, subtitle, content, footer, then image last, always, regardless of
  `align` — matching the stacked case exactly; `@media (min-width: 721px)` — the exact threshold
  `useResolution('dsm')` used — splits it into two columns, with `align: 'left'` (read from
  `data-align` on the root) putting the image in the first column and anything else, including
  omitted, in the second, same default as before. `stacked?: boolean` is a real, explicit override
  (`data-stacked="true"|"false"` on the root) that wins over the automatic, media-query- driven
  choice at every viewport — achieved with one additional attribute selector for higher specificity,
  still with no `!important` anywhere. Omitting `stacked` **is** the automatic mode; there is no
  third `'auto'` value to pass explicitly. `title`/`subtitle` are already-resolved strings, not i18n
  keys, same principle already applied throughout this package; `content` accepts already-composed
  content only — rich markup-string parsing is explicitly deferred to a future `RichText` component,
  not duplicated ahead of it existing. A known, accepted trade-off: React's dev-mode console warns
  about a missing `key` on the item list passed to `Grid`, since `GridItem` itself accepts no `key`
  and isn't being changed to accept one — the list is entirely rebuilt from props on every render,
  with no internal state in any item (`Image`/`Link`/`GridItem` are all stateless), so the real risk
  that warning exists to flag doesn't apply; fixing it would mean either an extra wrapping element
  around every item (breaking the direct-grid-child structure `card.css` depends on) or a
  React-specific `cloneElement` call in this otherwise fully renderer-agnostic file. Available for
  both React and Preact.
- **`Link.title`** — a plain native `title` passthrough (a browser tooltip on hover), added
  specifically so `ImgButton` (see below) has a real capability to compose against: `Button` already
  carried `title`, `Link` didn't, and duplicating tooltip behavior at the `ImgButton` level instead
  would have meant real, new logic this package doesn't otherwise have anywhere. No tooltip logic of
  any kind lives in this component — the browser owns the entire behavior, the same way it already
  does for every other native attribute `Link` exposes. It serializes identically in both React's
  `renderToStaticMarkup` and Preact's `preact-render-to-string` — no casing remap needed.
- **`ImgButton`** — a composition of `Button`/`Link` + `Image`/`Icon`, not a new implementation of
  anything those already do. Dispatches on `href`: present → `Link` (real navigation); absent →
  `Button` (a real action, keyboard-accessible natively) — never the single always-`<a>`-even-
  without-`href` shape the component this rescues used, which produced a non-focusable anchor
  whenever only `onClick` was given. `icon?: IconProps`/`image?: ImageProps` are the exact,
  unreduced types `Icon`/`Image` already export — not a new, narrower shape — plain optional props,
  not a discriminated union; `icon` wins when both are given (documented, not silently decided).
  `label` (matching `Button`/`Link`/`Icon`'s own existing convention, not a new `ariaLabel` name) is
  the ONE accessible name, carried only by the interactive control — the inner `Icon`/`Image` are
  rendered decorative (`Icon` with no `label` of its own → its already-established `aria-hidden`
  default; `Image` with a fixed, non-configurable `alt=""`, never exposed as a prop `ImgButton` lets
  a caller set) — replacing the component this rescues, which redundantly applied the same
  accessible-name text to both the link/button AND the icon inside it. No wrapping `<div>` — the
  interactive element (`Link` or `Button`) IS this component's own root; that wrapper only ever
  existed to carry now-discarded styling classes. `float` (a hardcoded fixed-position visual
  variant) and `format` (i18n interpolation) are both dropped, same "already-resolved props"/
  "className is the one styling mechanism" principles already applied everywhere else in this
  package; positioning a floating instance is the caller's own `className`. Neither
  `decoding="sync"` nor a default square `aspectRatio` are reintroduced as internal defaults — the
  composed `Image` keeps its own already-decided defaults untouched. `useResolution`, `window`, a
  resize listener, and `IntersectionObserver` are all absent from this component's own code
  (confirmed by grep, not merely by omission) — every responsive capability `ImgButton` has comes
  entirely from composing the already-responsive `Image`/`Icon`, nothing reimplemented. Available
  for both React and Preact.
- **`Counter`** — a number that animates from `0` up to `target` the first time it becomes visible
  in the viewport, and never again. This package's first component with real interactive state: a
  full, independent React and Preact implementation (real `useState`/`useEffect`/`useRef`, no shared
  `render.ts` factory), the same reasoning `IntlProvider` (above) already established for why that
  split is necessary. The component this rescues gated the same animation behind a separate,
  general-purpose lazy-mount primitive (`IntersectionObserver` plus an entirely unrelated
  event-based path, a global pub/sub singleton, a placeholder rendered through another component
  entirely) — none of that is ported. The only real capability with a live consumer was "don't start
  counting until visible, and only once," so that lives inline in `Counter` itself, not as a new
  public primitive: a plain `IntersectionObserver`, `threshold: 0.05` (unchanged), disconnected
  after the first intersection, observing this component's own root node directly.
  `content-visibility` was considered and deliberately not used for this — it defers rendering/paint
  cost, a different problem than "tell JS when a timer should start," which is what
  `IntersectionObserver` actually solves here.
  - Before intersecting — including the entire SSR-rendered markup and the first client render
    before hydration — the animated number is simply absent, not `0` and not a placeholder of any
    kind; same state on server and first client render, so there's no hydration mismatch. Unlike the
    component this rescues, the root's `aria-label` carries the real final value
    (`prefix + format(target)`) from the very first render regardless — an assistive-technology user
    or a crawler gets the correct number even before any animation or intersection happens.
  - The animated text itself is a second, `aria-hidden` element — never a live region (a
    fast-changing number is a poor `aria-live` candidate, it would spam an announcement every
    frame). One accessible name, one decorative visual — the same pattern already established for
    `ImgButton`.
  - Linear interpolation (`progress = elapsedTime / duration`), same as the component this rescues,
    but the last frame always renders `target` exactly, decimals included — the original silently
    truncated (`Math.floor`) even a fully-finished non-integer `target`.
  - Never calls `toLocaleString()` with an implicit locale, unlike the component this rescues (whose
    output silently depended on whatever locale the server or browser happened to default to,
    controlled by no prop at all). `format?: (value: number) => string` (default: plain `String`, no
    separators) formats both the animating value and the fixed accessible name through the exact
    same function, so they can never disagree.
  - A real bug in the component this rescues, fixed here: it never cancelled its
    `requestAnimationFrame` loop, so changing `target`/`duration` mid-animation started a second,
    competing loop racing the first, and unmounting mid-count left the loop scheduling frames
    indefinitely. Both of `Counter`'s effects here return a real cleanup that cancels the exact
    frame most recently scheduled, so a prop change or an unmount always stops the loop that was
    actually running.
  - `data-space-ui="counter"` on its single root `<span>` — no wrapping element. Available for both
    React and Preact.
- **`Button.aria-expanded`/`Button.aria-controls`** — plain native ARIA passthrough for a button
  that discloses or controls another element, forwarded verbatim to the real `<button>` as the
  literal `aria-expanded`/`aria-controls` attributes (React and Preact both special-case
  `aria-*`/`data-*` prop keys, never camelCasing them — no component-owned disclosure logic lives
  here, same "plain attribute passthrough" contract `title` already is). `aria-expanded={false}`
  renders the literal string `"false"`, never omitted — the same behavior as
  `aria-checked`/`aria-selected` above, since an ARIA boolean's absence and its `"false"` value mean
  different things to assistive technology, unlike a native boolean attribute such as `disabled`.
  Added specifically so `Menu` (below) has a real capability to compose against, the same reasoning
  `Link.title` was added for `ImgButton`.
- **`Menu`** — a `<nav>` navigation list, each item optionally a disclosure trigger for a nested
  submenu, to any depth. This package's second component with real interactive state, after
  `Counter` — a full, independent React and Preact implementation, composing the already-built
  `Link`/`Button`/`ImgButton`/`Icon`/`Image` for every item's own visual and navigation.
  - **Structure**: plain `<nav><ul><li><a>` — the WAI-ARIA Disclosure Navigation pattern, never
    `role="menu"`/`"menuitem"` (that pattern is for application-style menus with full
    roving-tabindex/arrow-key navigation; a site's own navigation with expandable sections is
    correctly a semantic nav tree, focused with ordinary `Tab`).
  - **`toggle`** is a plain `boolean` — `Menu` reads no viewport/breakpoint/hydration state of any
    kind. The component this rescues computed `toggle: boolean | 'lazy'` from a viewport-resolution
    hook one layer up, threading a `'lazy'` escape hatch and a `suppressHydrationWarning` through
    just to avoid a hydration mismatch that same JS-driven breakpoint check caused. None of that is
    here — the caller owns entirely how, or whether, `toggle` varies by breakpoint.
  - **Per-item control shape**, depending on `url`/`submenu`: no `submenu` — a real `Link` (or
    `ImgButton` with an icon), plain navigation. `submenu` with no `url` — one control is both the
    item's own visual and its disclosure trigger (`aria-expanded`/`aria-controls`, composed via
    `Button` + `Icon`/`Image` directly rather than through `ImgButton`, whose own closed API has no
    ARIA disclosure fields). `submenu` **and** `url` — two separate controls: a real navigable
    `Link`, plus a bare, icon-less disclosure `Button` next to it. The component this rescues put
    both behaviors on the same `<a>` with no `preventDefault` — clicking such an item in
    `openMode="onClick"` silently navigated away instead of ever revealing the submenu; splitting
    the two affordances is the fix, not a stylistic choice.
  - **`openMode`**: `'onClick'` (default) toggles on click/Enter/Space. `'onHover'` opens on mouse
    hover **or** keyboard focus entering the item's own subtree — never mouse-only — and stays open
    while either condition holds, closing only once both are false. `'onRender'` is always expanded,
    no trigger of any kind. React and Preact need different event wiring to make `'onHover'` bubble
    correctly from a focused descendant control up to the item's own wrapper: React's synthetic
    `onFocus`/`onBlur` already bubble (implemented over native `focusin`/`focusout`), but Preact
    binds `onFocus`/`onBlur` directly to the native, non-bubbling `focus`/`blur` — a parent-level
    `onFocus` there never fires when a descendant is what's actually focused. Both bindings use
    `onFocusCapture`/`onBlurCapture` instead, identical in both renderers: capture-phase listeners
    see every focus/blur along the path to the real target regardless of whether the base event
    bubbles.
  - **Closing**: every item's open/closed state is independent — opening one never closes a sibling,
    no accordion. Each open submenu closes on its own trigger being toggled again, `mousedown`
    outside its own subtree, or `Escape` while focus is inside it. `Escape` closes only the
    innermost open level (the handler lives on each item's own `<li>` and stops propagation, so a
    keydown bubbling from a focused, deeply nested submenu is caught by the nearest open ancestor
    first) and returns focus to the exact control that opened that level — both gaps in the
    component this rescues, which had no `Escape` handling and no focus management anywhere.
  - **`aria-expanded`/`aria-controls`** replace the component this rescues' `rel="prev"/"next"` as a
    state indicator (a real misuse — those `rel` values are for sequential document navigation, not
    disclosure state) and its decorative chevron icon's own separate `aria-label` (the same
    double-labeling antipattern already fixed in `ImgButton` — one accessible name on the
    interactive control, a decorative visual never carries its own).
  - Outside-click closing is implemented as its own small, self-contained hook
    (`close-on-outside.ts`/`.preact.ts`) deliberately kept generic rather than `Menu`-specific — the
    same "click outside this, close it" need already exists for a future `Modal`, so lifting it out
    once that becomes a second real consumer is mechanical, not a redesign.
  - `menuModule`, a mutable module-level stub the component this rescues used to break a real import
    cycle (`List` needs `Item`, `Item` needs `List` again for a submenu), is not ported — the
    recursive item renderer here calls itself directly, genuine self-recursion inside one module,
    with no cycle to break in the first place.
- **`Button.aria-current`** — plain native ARIA passthrough for a button that's one of a set
  representing the current selection (a slide-picker dot, a paginated step), forwarded verbatim as
  the literal `aria-current` attribute. Same contract, same reasoning, and the same precedent as
  `aria-expanded`/`aria-controls` above — added specifically so `Slider` (below) has a real
  capability to compose against.
- **`Slider`** — a carousel: one slide visible at a time, advanced by arrows, dots, keyboard, or
  autoplay. This package's third component with real interactive state, after `Counter`/`Menu` — a
  full, independent React and Preact implementation, composing `Button` for every control (never a
  forced icon — same "bare, accessible, styleable via `className`" reasoning as `Menu`'s disclosure
  toggle).
  - **No store**: the component this rescues ran a real Zustand store per instance through React
    Context; no consumer was found reading or driving a slider's state from outside its own tree, so
    this is plain local `useState`, same as `Counter`/`Menu`. `zustand/react/shallow` (what the
    store depended on) imports from a `react` subpath specifically — dropping the store sidesteps
    ever having to confirm a Preact-compatible equivalent existed.
  - **Structure**: `role="region"` + `aria-roledescription="carousel"`, never `role="slider"` (the
    component this rescues used that role — the WAI-ARIA widget role for a single-value range input,
    requiring full keyboard support to adjust that value and a live `aria-valuenow`; a carousel
    isn't that). `tabIndex={0}` is fixed, never the current index — the component this rescues set
    `tabIndex` to the slide index itself, a real bug (any `tabIndex` above 0 pulls an element out of
    the page's natural tab order into a confusing manually numbered sequence).
  - **Never remounts a visited slide, capped at 10 mounted at once**: an intentional behavior of the
    component this rescues (a render counter on slide content stays at 1 across several navigations)
    — a slide keeps whatever internal state it has once shown. Ported with a deliberately simpler
    mechanism: an ordinary array of visited slide indices, oldest-first, versus the component this
    rescues' own positional arithmetic over a sparse array (which needed its own dedicated test file
    with hand-built fixtures). Same observable contract — cap enforced, no remount while cached —
    eviction order may differ from the original in edge cases, an accepted simplification. Each
    cached slide carries the native `hidden` attribute (not an inline style) on every slide but the
    current one, so a carousel with zero optional CSS is still correct: exactly one visible, instant
    switching, nothing left stacked or leaking through.
  - **Crossfade**: `data-space-ui="slider-item"` + `data-active="true"` on the current slide replace
    the component this rescues' direct `style.top`/`position`/`visibility` mutation and its
    hardcoded `setTimeout(100)` — an optional stylesheet can override `[hidden]` (author styles
    always beat the user agent's own `[hidden]{display:none}`, no `!important` needed) to build any
    real transition keyed off `[data-active]`. With no such stylesheet, switching is instant.
  - **`loop`/`autoPlayInterval`, independent props**: the component this rescues conflated them into
    one `infinity: boolean | {autoPlayTransition}` — autoplay only existed when that was an object,
    so a looping-but-not-autoplaying carousel and an autoplaying-but-not-looping one couldn't both
    be expressed. Here, `loop` alone just wraps `goNext`/`goPrev` at the ends; `autoPlayInterval`
    alone advances to the last slide and stops (the `setTimeout` driving it — chosen over
    `setInterval` — simply never reschedules itself once `goNext` stops changing the index, no extra
    bookkeeping needed to stop it); together, autoplay keeps wrapping around.
  - **Pausing autoplay**: the component this rescues paused only via `mousedown`/`mouseup` on the
    slide content, both wired to the same toggle — a plain click fired it twice and cancelled itself
    out (confirmed by reading the code), and there was no way to pause without a mouse at all. Here,
    an explicit, accessible `Button` (rendered only when `autoPlayInterval` is given) is the one
    real mechanism, its own accessible name changing between "Pause"/"Play slideshow". Hovering
    (`mouseenter`/`mouseleave`) is a real, kept complement, but strictly lower priority: two
    independent pieces of state (`hoverPaused`, `isPlaying`) mean the pointer leaving can never
    resume a slideshow the user paused manually through the button.
  - **Keyboard**: `ArrowLeft`/`ArrowRight` navigate while the region has focus — absent entirely in
    the component this rescues despite implying keyboard interactivity via `tabIndex`/
    `role="slider"`. Calls the exact same `goPrev`/`goNext` the arrows and dots do.
  - **`aria-live`**: a visually-hidden region announces `"Slide N of Total"` on every change,
    `aria-live="off"` exactly while autoplay is actively advancing on its own (avoiding announcement
    spam the component this rescues never had to consider, since it had no live region at all) —
    `"polite"` otherwise, including once manually or hover-paused.
  - **Dots**: each has its own accessible name (`` `Go to slide N` ``) and `aria-current="true"` on
    the active one, via `Button`'s own new native ARIA passthrough. The component this rescues gave
    every dot the exact same literal `aria-label` — a screen reader user tabbing through them heard
    the identical announcement N times, with no way to tell them apart or know which was active.
- **`IntlProvider`/`useIntl`/`createFormatter`** — this package's own ICU message-formatting
  runtime: the first real npm dependency it owns (`@formatjs/intl`), deliberately never added to
  `@zanix/space` itself (see that package's own CHANGELOG for `loadMessages()`'s matching decision —
  it stays opaque to ICU/AST, transporting whatever a catalog contains without inspecting it).
  `createFormatter(locale, messages)` (`src/intl/formatter.ts`) is the one renderer-agnostic core
  both bindings share verbatim — wraps `@formatjs/intl`'s own `createIntl()` (the "imperative API"
  FormatJS documents for use outside a component tree), not a reimplementation of ICU. A catalog
  value may be a hand-authored ICU string OR a precompiled AST (`MessageFormatElement[]`,
  `@zanix/cli`'s own future ICU→AST compiler output) — freely mixed across keys in the same catalog,
  migrating one message at a time rather than an all-or-nothing switch; verified structurally
  (`intl-messageformat`'s own constructor accepts either shape per call) and behaviorally (a
  dedicated test formats a precompiled AST value and its own ICU source identically).
  `IntlProvider`/`useIntl` are two full, independent implementations — React (`src/intl/index.ts`,
  this package's default entrypoint) and Preact (`src/intl/index.preact.ts`,
  `@zanix/space-ui/preact`) — never `preact/compat`, the same "real per-renderer hook usage needs a
  full second implementation" rule this CHANGELOG's own `Preact` entry above already states for a
  component with real state; a Context Provider/consumer pair is exactly that, not the
  shared-`render.ts` pattern `Button`/`Icon` use. Deliberately not a `react-intl` clone: only
  `formatMessage(id, values)`, no `formatDate`/`formatNumber`/`formatList`, no rich-text tag
  support, no `defaultMessage` (a missing id falls back to the id itself), no
  `formatData`/`formatContent` (the legacy component's own recursive-object formatter — stays
  unported, same as `@zanix/space`'s own `loadMessages()` never ported it). Deliberately NOT wired
  into any of this package's own components (`Button`'s `label`, etc.) — every component here
  already takes only already-resolved data as props (see `mod.ts`'s own module doc); an app calls
  `formatMessage()` itself and passes the result in, the same contract as an already-resolved asset
  URL, never a `{id, defaultMessage}` descriptor a component resolves on its own.
  - 21 new tests: 6 for `createFormatter` (plain message, interpolation, ICU plural, missing-id
    fallback, a precompiled AST formatting identically to its own source, a single catalog mixing
    both), 4 each for the React and Preact bindings (the same cases through `<IntlProvider>`, plus
    each throwing outside one), and 7 structural tests verifying — via `deno info --json`'s actual
    resolved module graph, not a grep over `deno.jsonc`'s own `imports` — that `mod.ts` never
    reaches `preact` (compile time or runtime) and `mod-preact.ts` never reaches `react`/
    `react-dom`, that neither ever reaches `preact/compat`, and that
    `@formatjs/icu-messageformat-parser` is reachable ONLY as a type in both entrypoints, never as a
    real runtime dependency — compiling ICU is `@zanix/cli`'s own job, not this package's.
- **`Modal`/`ModalProvider`/`useModal`** — a dialog: `role="dialog"` + `aria-modal="true"`, a focus
  trap, `Escape`, an accessible close button, correct stacking with several open at once. This
  package's fourth component with real interactive state, after `Counter`/`Menu`/`Slider` — a full,
  independent React and Preact implementation.
  - **Hybrid model, declarative by default**: `<Modal open onClose>` owns its own visibility, no
    infrastructure required — the same "state belongs to whoever renders it" default as
    `Counter`/`Menu`/`Slider`. `ModalProvider`/`useModal` are an explicit opt-in layered on top for
    triggering a modal from an arbitrary depth, decoupled from where it renders — the only way the
    component this rescues ever worked, but here it costs nothing unless actually mounted/called.
    Both models render the exact same `Modal`, so focus management/backdrop/`Escape`/positioning/
    accessibility are never duplicated between them.
  - **No store**: `ModalProvider` is plain `useState` + `Context`, the same shape `IntlProvider`
    already uses in this package — the component this rescues ran a Zustand store through Context
    for the same job; no consumer needed cross-tree reads/writes of a modal's own open state, so
    that dependency doesn't carry over.
  - **No portal**: `position: fixed` plus a high `z-index`, same as the component this rescues used
    (successfully). Preact CORE has no `createPortal` (`Object.keys(await import('preact'))` has no
    such export; only `preact/compat`, which this package has never depended on, does) — building
    one by hand only for the React binding would be real, asymmetric complexity without a real
    consumer demonstrating the CSS-clipping failure mode this package's own `overflow`/`transform`
    ancestors could otherwise cause.
  - **Accessible name, required by the type, not enforced by a throw**: `label`/`ariaLabelledBy` — a
    union type makes skipping both a compile error for typed callers, but a value that resolves to
    `undefined` at runtime only gets a `logger.warn` (`@zanix/utils/logger`, marked `'noSave'`),
    never a thrown error — a missing accessible name is a real accessibility gap to catch in
    development/tests, not a structural misuse on `useIntl()`'s footing (which does throw); a
    mislabeled dialog still opens, traps focus, and closes correctly.
  - **Backdrop and outside-click are one decision**: `showOverlay` (default `true`) — a backdrop
    renders and absorbs outside clicks; `showOverlay={false}` renders no backdrop and an outside
    click closes the dialog instead, via `useCloseOnOutside` (`src/shared/`, first written for
    `Menu`'s own submenu disclosure, moved here once `Modal` became a second real consumer of the
    identical mechanism — never built ahead of one). No separate `closeOnOutsideClick` prop; it
    would only be a second way to express what `showOverlay` already determines.
  - **Focus management**: on open, the currently-focused element is captured and focus moves to the
    dialog's first real content control — deliberately skipping the dialog's own close button
    (always focusable descendant #1, by construction) as the _initial_ target, since auto-focusing a
    dismissive control risks an accidental close from a reflexive Enter/Space; the close button is
    the fallback target when it's the only focusable thing in the dialog, and the dialog's own
    container (`tabIndex={-1}`) is the last resort with no focusable content at all. `Tab`/
    `Shift+Tab` cycle only among the dialog's own focusable descendants (close button included — the
    skip is initial-focus-only) while open. On close (or unmount while still open), focus returns to
    whatever was captured — but only if that instance was the topmost open modal at that moment, so
    closing one modal never yanks focus out of another still-open one stacked on top of it. None of
    this exists in the component this rescues at all.
  - **Stacking**: `Modal/modal-stack.ts` — a small, pure, renderer-agnostic module (no React/Preact
    import at all) holding a private stack of registered modal ids, not a store. Only the topmost
    open modal traps `Tab` or reacts to `Escape`; every keydown handler checks this at event time,
    so no modal instance needs cross-instance signaling when a sibling opens or closes.
  - **Scroll lock**: `document.body.style.overflow` is set to `'hidden'` while any modal is open,
    restored to its exact prior value (not just cleared) once the last one closes — absent entirely
    in the component this rescues, confirmed by a repo-wide search that found no scroll-locking code
    anywhere.
  - **Deliberately not attempted**: making the rest of the page `inert`/`aria-hidden` while a modal
    is open — the focus trap already prevents a keyboard user from reaching background content, and
    genuinely marking that background `inert` would need knowing which DOM subtree is "the rest of
    the app," visibility this package doesn't have into a consumer's own root. Left for a future
    app-shell-level integration, if one appears, rather than guessed at speculatively here.
  - **Position**: all nine values from the component this rescues kept unchanged (`center`, the four
    corners, the four edge-midpoints) — no evidence any of them was itself the problem.
  - 61 new tests: 26 (React) + 25 (Preact) for `Modal`/`ModalProvider`/`useModal` (SSR/structure,
    the backdrop/outside-click contract, `Escape`, focus management including the close-button-skip
    and the `Tab`/`Shift+Tab` trap, scroll lock, multiple simultaneously open modals, `useModal`
    outside a provider, `ModalProvider`'s own `onClose` safety guarantee, mixing the declarative and
    global APIs, and — React only — a `StrictMode` mount/unmount leaving no phantom scroll-lock
    state), plus 9 for `modal-stack.ts` on its own (SSR/no `document` access at import time,
    idempotent register/unregister, multiple modals, closing the bottom one doesn't affect the
    scroll lock, closing the last one restores the exact prior `overflow`, a `StrictMode`-shaped
    mount→cleanup→mount sequence leaving no phantom entry).
- **`@zanix/utils/logger` — this package's second real runtime dependency, and its own
  no-bare-`console`-anywhere policy**: `Modal`'s missing-accessible-name warning above is this
  package's first (and, as of this entry, only) dev-time diagnostic — it now goes through
  `@zanix/utils`'s own `logger` instead of `console.warn` directly, enforced by
  `deno-zanix-plugin/no-znx-console` (this package's own lint plugin, already in place, previously
  suppressed here with a one-off `deno-lint-ignore`). Every call is marked with the trailing
  `'noSave'` flag, since a dev-time warning like this is inherently ephemeral output, never meant to
  be persisted — `Logger#log`'s own early return means a `'noSave'` call never reaches its storage
  path at all. That specifically matters here because this warning fires from browser-bundled
  component code, not just Deno/SSR: every `Deno.*` call `Logger`'s own construction/log path could
  otherwise reach (`readConfig()` for the console header's app-name prefix, `Deno.uid()` for the
  formatted log's process id, the file-based save itself) is either wrapped in its own try/catch or
  lives inside the deferred save/format closures a `'noSave'` call skips entirely — so importing
  `@zanix/utils/logger` here never risks a runtime error once bundled for the browser. One real gap
  this surfaced — the logger's own console header used real ANSI escape codes unconditionally, which
  a browser console doesn't interpret (they printed as raw control-sequence bytes instead of color)
  — was fixed at the source, in `@zanix/utils` itself, rather than accepted here as a cosmetic
  trade-off: `logger`'s own header now branches on `typeof Deno === 'undefined'` and uses the
  browser devtools' own `%c` + CSS convention instead of ANSI there, byte-for-byte unchanged in
  Deno/a terminal. Until `@zanix/utils` publishes a version that includes that fix, this package
  depends on it through a local path override in `deno.jsonc` (see that file's own comment), with
  `--no-check` at every call site that touches it. Establishes the pattern for every future
  component's own dev-time diagnostics in this package: `logger`, never bare `console`.
- **`Slider`: a shrinking `children` array never leaves `currentIndex` pointing past the end** — a
  general robustness guarantee for ANY consumer with dynamic `children` (found auditing `Showcase`,
  below, which regroups its own children live on a container resize — fixed here, generally, not
  with a workaround scoped to that one consumer). Every derived value used for rendering (which
  slide is `data-active`, which dot carries `aria-current`, the live region's own "Slide N of
  Total", `exhausted`/`autoPlayActive`) now reads a `clampedIndex`
  (`Math.min(Math.max(currentIndex, 0), itemsQuantity - 1)`, or `0` for zero slides) computed fresh
  every render, instead of the raw stored `currentIndex` — so there is never a render, not even the
  very first one after `itemsQuantity` drops, with an out-of-range index visible. `Math.min` — not a
  reset to `0` — preserves the user's position as exactly as it still can: landing on the new LAST
  slide, not back at the first one. `goNext`/`goPrev` independently re-clamp their own base before
  stepping, so the next navigation is always correct even if the raw state was left momentarily
  stale between renders. `visited` (the never-remount-while-cached cache) gets the same treatment —
  pruned of any index `>= itemsQuantity` in its own effect — otherwise a stale index keeps occupying
  a real slot against `MAX_MOUNTED_SLIDES`, which could evict a slide that's still genuinely valid
  and cached the moment `itemsQuantity` grows back (e.g. the container widening again) — exactly the
  guarantee that cache exists to provide. 12 new tests (6 React + 6 Preact): shrinking to one slide,
  shrinking-but-preserving-position (not resetting to slide 0), shrinking to zero, a dedicated
  cache-budget-pruning scenario (fills the cache exactly, shrinks, grows back, and confirms a
  genuinely new visit doesn't evict a slide that stayed relevant throughout), and a
  `Showcase`-shaped composition test (independent of `Showcase`'s own API) that regroups children
  live and asserts DOM node IDENTITY survives — not a render-invocation counter, which would give a
  false positive/negative here since the parent itself legitimately re-invokes each item's render
  function on every regroup; what actually matters, and what this guarantee is really about, is that
  React/Preact's own keyed reconciliation never tears the node down.
- **`Showcase`** — `children` grouped into pages of `itemsPerSlide`, each page one `Slider` slide,
  composed exactly the same way the component this rescues did — no visual/behavioral logic of its
  own beyond that. This package's fifth component with real interactive state, after
  `Counter`/`Menu`/`Slider`/`Modal`.
  - **Conserved**: the whole capability — item count per slide responding live to available space,
    without remounting the underlying items (confirmed by the component this rescues' own test,
    which resizes across breakpoints and shows re-grouping while a render counter on slide content
    stays at 1) — and pagination itself, chunking a flat list into non-overlapping, same-order pages
    (never a sliding window; advancing jumps by a full page, not by one item at a time, matching
    what the component this rescues actually demonstrated). `itemsPerSlide` larger than the item
    count clamps to a single slide with everything, same as the original `maxItems` guard. The
    `slider` prop passes every other `Slider` capability straight through unchanged.
  - **Discarded**: the entire mechanism — a global Zustand store (`useResolution`, already rejected
    package-wide, see `Image`'s own doc for `useAspectRatio`) driving `window.innerWidth` through 6
    hardcoded breakpoint IDs (`msm`/`mmd`/`mlg`/`dsm`/`dmd`/`dlg`) that appear nowhere else in this
    package, plus a `window.resize` listener registered 7 separate times (once per delimiter
    combination). Also discarded: `LayoutContainer` as the per-page wrapper (its own lazy-mount/
    aspect-ratio/ref-forwarding capabilities — none of which this usage ever opted into) and a dead,
    unused duplicate of the grouping logic implemented a second time as its own component
    (`Items.tsx`'s own `Items` export — confirmed by a repo-wide grep that nothing imported it).
  - **Why viewport width is discarded, specifically**: `window.innerWidth`/`matchMedia` describe the
    BROWSER's own viewport, not the space this component itself was actually given — the assumption
    breaks the moment `Showcase` isn't rendered full-width (a sidebar, a modal, a narrower column on
    an otherwise-wide screen), showing more items than the available space can actually fit. That's
    not a new problem introduced here — it's the same gap the component this rescues' own
    `window.innerWidth` read was silently exposed to; measuring THIS component's own rendered
    container directly finally closes it.
  - **Why container width, specifically**: `itemsPerSlide?: number | Record<number, number>` — a
    `Record`'s keys are `ResizeObserver`-measured width thresholds (in px) of this component's own
    private wrapper element, mobile-first (the largest threshold `<=` the measured width wins; below
    every threshold, the smallest threshold's own value applies). Verified first, before committing
    to any JS mechanism at all: CSS (media queries or container queries alike) has no channel to
    report "I'm currently showing N of M items" back into the JS state driving `Slider`'s own
    accessible navigation (how many dots to render, what the live region announces, how far keyboard
    `ArrowLeft`/`ArrowRight` can step) — that number has to exist in JS specifically because it
    drives rendering decisions, not because of an inherited assumption. Threshold ordering never
    depends on `Object.keys()`'s own iteration order (which returns numeric-looking keys as
    lexicographically-sorted strings) — every key is parsed back to a real `number` and sorted with
    an explicit numeric comparator before anything reads from it (`resolve-items-per-slide.ts`, a
    pure, renderer-agnostic function, independently unit-tested for exactly this).
  - **New complexity `ResizeObserver` introduces, and how each is resolved**: (1) `Slider` doesn't
    forward a ref to its own root — resolved with a private, unstyled, unmarked wrapper `<div>`
    around `<Slider>` existing only to give `ResizeObserver` something to observe, never extending
    an already-shipped component's API for this. (2) No measurement exists during SSR, and
    `ResizeObserver`'s own first callback is asynchronous — never available during, or synchronously
    after, the very first client render either. Resolved by starting the measured width at an
    explicit `null` ("no real measurement yet") rather than reading `window.innerWidth`/`matchMedia`
    synchronously during render — `resolveItemsPerSlide` treats `null` identically to "narrower than
    every threshold," so SSR and the first client paint are byte-identical BY CONSTRUCTION, not by
    accident: a narrow container has nothing to visually correct once the real measurement arrives;
    a wider one refines upward exactly once. (3) A real client browser lacking `ResizeObserver`
    degrades to that same `null` state permanently, rather than throwing or never rendering — the
    same fallback philosophy `Counter`'s own `IntersectionObserver` guard already uses. (4) Kept
    entirely private — no new exported hook — since no second real consumer exists yet for "track my
    own container's width" as a standalone primitive (same reasoning `close-on-outside.ts` documents
    for staying `Menu`-local until `Modal` became a genuine second consumer).
  - **The group wrapper**: `display: flex` is the one functional default (without it, a group's own
    items — plain block-level children — would stack vertically instead of sitting side by side,
    meaning "N items visible together" wouldn't materialize at all with zero consumer CSS, the same
    bar `Grid`'s own unconditional `display: grid` holds) — nothing else: no `gap`, no
    `justify-content`, no padding/margin/color, all left to
    `className`/`data-space-ui=
    "showcase-group"` instead of assumed as the component this
    rescues' own centered/gapped default.
  - 42 new tests: 16 for `resolve-items-per-slide.ts` on its own (fixed numbers, threshold
    resolution at/below/above the edges, the empty-config default, an explicit numeric-vs-
    lexicographic threshold-ordering regression test, clamping, chunking), 13 React + 13 Preact for
    `Showcase` itself (SSR, first-client-paint-matches-SSR/no hydration mismatch, a fixed
    `itemsPerSlide` ignoring width entirely, the default-of-1 with no `itemsPerSlide` at all,
    over-sized `itemsPerSlide` clamping, container resize increasing AND decreasing the count, both
    threshold edges, a real 0-width measurement, a resize that shrinks the slide count never showing
    an invalid one, `ResizeObserver` observe-on-mount/disconnect-on-unmount, `id`/`className`
    landing on the real `Slider` root rather than the private wrapper, and the `slider` passthrough
    prop).
- **Foundation work closing out the ownership boundary against `@zanix/space`/the application**,
  plus a few primitives reserved (not built) for later:
  - **`Link.aria-current`** — the same plain native ARIA passthrough `Button` already has (see its
    own `aria-current` entry above), forwarded verbatim, never computed here — no `active`/
    `isActive` prop, no router/location awareness of any kind. Confirmed via 6 new tests (3 React +
    3 Preact): the verbatim token, the literal `"true"` string for a bare `true`, and absence when
    omitted — same three cases `Button`'s own `aria-current` tests already cover.
  - **`IFrame`/`Video`'s missing `data-space-ui`** — a real, previously undocumented gap (unlike
    `ImgButton`'s or `Showcase`'s own deliberate omissions, which are explicitly argued). `IFrame`
    now carries `data-space-ui="iframe"` on its own `<iframe>` root. `Video`'s `'file'` branch (its
    own real `<video>`, never delegated) carries `data-space-ui="video"`; its `'provider'`/
    `'iframe'` branches compose `IFrame` directly and inherit `"iframe"` automatically — composed,
    not reimplemented, the same pattern `ImgButton` already establishes for `Link`/`Button`. 6 new
    tests (3 React + 3 Preact) confirm both the own-root case and that the composed branches never
    render `"video"`.
  - **`shared/escape-to-close.ts`** (`createEscapeToCloseHandler`) — extracted from `Menu`, whose
    toggle and every submenu item build the identical `Escape`-closes-and-refocuses-the-trigger
    handler independently, byte-for-byte, across both real call sites. A plain function, not a hook
    — no `useEffect`/`useRef` needed, since it only ever gets wired into a JSX element's own
    `onKeyDown`, called fresh every render; genuinely renderer-agnostic (one file, not two) because
    `React.KeyboardEvent` and Preact's own native `KeyboardEvent` both structurally satisfy the same
    minimal event shape this module types against, without importing either renderer. **Deliberately
    not adopted by `Modal`**, despite superficially "also closing on `Escape`": it does no inline
    refocus at all (a separate, more general effect restores focus for ANY close reason — Escape,
    backdrop click, an external `open={false}` — checked at cleanup time via `isTopModal`, not tied
    to the `Escape` key specifically), and its own `Escape` branch is merged into the same handler
    as `Tab`-cycling. Forcing `Modal` onto this shape would have cost real correctness for no
    simplification — only `Menu`'s two call sites are truly identical; `Modal`'s is not a third one.
    All 42 of `Menu`'s existing tests (React + Preact) still pass unchanged, confirming the
    extraction is fully behavior-preserving.
- **Four more foundation primitives**, built ahead of a second real consumer per an explicit
  decision not to gate the foundation on current consumers:
  - **`shared/focus-scope.ts`/`.preact.ts`** (`useFocusScope`) — `Modal`'s own capture → trap →
    restore focus-management effect, extracted verbatim and generalized via two options
    (`initialFocusIndex`, `shouldRestoreFocus`). `Modal` itself now calls this hook instead of
    owning the logic inline; `FOCUSABLE_SELECTOR` moved out of `Modal/types.ts` into this module.
    Sibling `useEffect` cleanup order runs in declaration order, not reversed, in both renderers.
    All 66 of `Modal`'s existing tests (29 React + 28 Preact + 9 modal-stack) pass unchanged,
    confirming the refactor is fully behavior-preserving.
  - **`shared/live-region.ts`** (`liveRegionProps`, `VISUALLY_HIDDEN_STYLE`) — `Slider`'s own
    visually- hidden `aria-live` announcement span, extracted into a plain data helper
    (`VISUALLY_HIDDEN_STYLE` moved out of `Slider/types.ts`, and named in `UPPER_SNAKE_CASE` to
    align with this package's other static CSS-in-JS style-object constants — `DRAWER_SIDE_STYLE`/
    `DRAWER_Z_INDEX`/`MODAL_POSITION_STYLE`/`MODAL_Z_INDEX`/`CATALOG_VIEWBOX`, all already
    `UPPER_SNAKE_CASE`). All 53 of `Slider`'s existing tests (27 React + 26 Preact) pass unchanged.
  - **`shared/roving-focus.ts`** (`getNextRovingIndex`, `createRovingKeyDownHandler`) — new, zero
    current consumers. Grounded in the WAI-ARIA APG roving-tabindex keyboard convention rather than
    an existing call site, since no component needing it exists yet. Pure arithmetic (wraps at both
    ends, `Home`/`End` jump to first/last, `'horizontal'`/`'vertical'`/`'both'` orientations) plus a
    thin `onKeyDown` handler factory that looks up the target element fresh on every keypress rather
    than caching it. 14 new tests.
  - **`shared/positioning.ts`** (`computePosition`) and **`shared/positioning-dom.ts`**
    (`measurePosition`, `autoUpdate`) — new, zero current consumers, built as a "full engine" (not a
    minimal version) per an explicit scope decision: 12 placements (4 sides × center/start/end),
    `offset`, `flip` (tries the opposite side, only switches if it's a real improvement — never
    trades one overflow for a different one), `shift` (clamps the cross axis only, never changes
    which side), and a boundary rect defaulting to a large-but-finite "effectively infinite"
    sentinel — a literal `Infinity` sentinel produces `NaN` throughout instead
    (`-Infinity + Infinity` per IEEE 754), covered by 9 of 15 geometry tests. `positioning-dom.ts`
    adds the real-DOM measurement layer on top: `getBoundingClientRect`/viewport measurement and an
    `autoUpdate` that re-fires on `ResizeObserver` (gracefully skipped if unavailable), any
    scrollable ancestor of either element scrolling, or the window resizing. The per-renderer
    `usePosition` hook that wires this into a component's actual render cycle is deliberately
    **not** built — ref timing, when to re-measure, and an SSR guard are exactly the kind of details
    worth designing against a real first consumer (`Popover`) rather than guessing. 15 geometry
    tests + 9 DOM-measurement tests. A real gap existed in this suite's own `jsdom` test harness
    (`dom-test-setup.ts`): window-level APIs (`getComputedStyle`/`innerWidth`/
    `addEventListener`/etc.) were never bridged onto Deno's `globalThis` (only `document`/element-
    level globals like `HTMLElement`/`Event` were) — real browser code correctly reaching these
    through bare `globalThis` (this project's own `no-window`/`no-window-prefix` lint rules require
    exactly that) had nothing to resolve to under the test harness. Fixed by bridging them, except
    `dispatchEvent`, which collides with Deno's own runtime dispatching its native `load`/`unload`
    events on `globalThis` — tests needing to fire a window-level event now use a new
    `dispatchWindowEvent` helper instead.
- **The 7 foundation primitives above are now public API**, exported from `mod.ts`/`mod-preact.ts`
  (`useCloseOnOutside`, `createEscapeToCloseHandler`/`EscapeKeyEvent`, `FOCUSABLE_SELECTOR`/
  `useFocusScope`/`FocusScopeOptions`/`TabKeyEvent`, `liveRegionProps`/`VISUALLY_HIDDEN_STYLE`/
  `LiveRegionPoliteness`, `getNextRovingIndex`/`createRovingKeyDownHandler`/`NavigationKeyEvent`/
  `RovingFocusOrientation`, `computePosition`/`Rect`/`Size`/`Side`/`Alignment`/`Placement`/
  `ComputePositionOptions`/`ComputePositionResult`, `getViewportRect`/`measurePosition`/
  `autoUpdate`) — a deliberate reversal of the original "internal-only, gated on this package's own
  consumers" default: these are small, dependency-free building blocks a consumer app reaches for
  constantly when hand-rolling the same shape of component (a custom dropdown, a hand-rolled
  tooltip), so keeping them internal only forced the exact duplication this package exists to avoid.
  `modal-stack.ts` stays internal (still `Modal`-owned, not yet in `src/shared/`). Three private
  structural event types (`EscapeKeyEvent`, `TabKeyEvent`, `NavigationKeyEvent`) that were only ever
  used as an unexported return-type annotation got exported too — required for a clean public
  signature, not a behavior change. `FOCUSABLE_SELECTOR` picked up an explicit `: string` annotation
  (JSR's `no-slow-types` lint requires one on every symbol reachable from a public export). Verified
  renderer-isolation on every one of these holds under the same `deno info`-based module-graph
  method `dependency-boundary.test.ts` already uses for the rest of each entrypoint: the two
  hook-based pairs (`close-on-outside`, `focus-scope`) each resolve to exactly one renderer as a
  code dependency with an empty type-dependency set and no import of the other; the
  renderer-agnostic ones (`escape-to-close`, `live-region`, `roving-focus`, `positioning`,
  `positioning-dom`) resolve to neither `react` nor `preact` anywhere in their graph. `deno check`
  on both entrypoints still reports exactly the known 13-error baseline (unrelated `Znx` errors from
  a sibling package) — no new type errors from any of this.
- **`Menu.open`/`onOpenChange`** — a real controlled escape hatch for the `toggle`-mode collapse
  state, coexisting with the existing `defaultOpen` (still the uncontrolled seed when `open` is
  omitted; ignored, not invalid, once `open` is given — the same "controlled prop wins, default is
  simply ignored" contract React's own `value`/`defaultValue` pair already has). Closes a real gap:
  without it, nothing outside `Menu` could ever close an already-open toggled mobile nav — closing
  it after a client-side navigation (`@zanix/space`'s Orbit does soft navigation, no reload to reset
  this for free) needed exactly this and had no way to get it. `onOpenChange` fires in both the
  controlled and uncontrolled case (same "always notify" contract a native `<input>`'s own
  `onChange` has). `Modal`'s own fully-controlled-only shape was deliberately NOT copied here —
  audited separately and concluded it isn't a gap: a dialog is always triggered from elsewhere in
  the tree, so the caller already needs the boolean in its own state regardless; `Menu`'s toggle is
  different because trigger and content are self-contained in one place. 10 new tests (5 React + 5
  Preact): uncontrolled notifies without losing self-management, controlled notifies without
  self-opening, an external prop update re-renders with no click, a full click round-trip through
  real external state, and `open` taking precedence over `defaultOpen` when both are given. All 42
  pre-existing `Menu` tests pass unchanged.
- **`Disclosure`** — the WAI-ARIA Disclosure (Show/Hide) pattern, and the first of this package's
  interactive components. `trigger` is the content of a `<button>` this component owns and renders
  itself, never a pre-built element the caller passes in — avoids `cloneElement` entirely (the same
  shape `Menu`'s own disclosure triggers already use for their icon+label content). Closed content
  is hidden via the native `hidden` attribute, not unmounted — a deliberate divergence from
  `Modal`'s own `null`-when-closed: this component's content (FAQ answers, help text) is exactly the
  kind of thing a search crawler reading raw SSR HTML should still see collapsed, and unmounting
  would have omitted it from the very first response entirely. The same choice also means any
  interactive state inside the collapsible region (e.g. an `<input>`) survives a close/reopen
  unchanged, since the subtree is never actually torn down. Deliberately not built on native
  `<details>`/`<summary>`, evaluated seriously rather than skipped: its own `toggle` event isn't
  cancelable per spec, so a reliably CONTROLLED `<details>` isn't achievable (the browser flips its
  own state before any React/Preact-level correction can run) — a real constraint given this
  component's whole reason to exist is being `Accordion`'s controllable foundation. Consistent with
  `Menu`'s own prior call for the identical underlying pattern. Deliberately hydrated with no no-JS
  fallback, same category as `Modal`/`Menu`/`Slider` — a direct consequence of the `<details>`
  rejection above. No `role="region"` by default on the content — `region` is a landmark role, and
  putting one on every section of a page with several disclosures open at once (an FAQ list, a
  future `Accordion`) would flood a screen reader's landmarks list with noise; `aria-labelledby`
  (the relationship the pattern actually needs) stays. `id`/`className` land on the outer wrapper
  only, matching every other component's own "one root, one style hook" contract — the content
  region's own `id` (needed for `aria-controls`) is generated internally via two separate `useId()`
  calls, never exposed as a prop. Controlled (`open`/`onOpenChange`) with an uncontrolled
  `defaultOpen` fallback, same shape `Menu`'s own fix above just established. 36 new tests (18
  React + 18 Preact), including a real SSR-to-hydration round-trip asserting zero console errors and
  that the component is still interactive afterward (not just silently mismatched-and-replaced), and
  a dedicated test proving a stateful child element keeps its uncommitted value across a
  close→reopen cycle — the concrete case the `hidden`-not-unmount decision exists for.
- **`Accordion`** — a list of `Disclosure` sections coordinated by one component. Data-driven:
  `items: AccordionItem[]` (`{ id?, trigger, children }`), the same shape `Menu.items` already
  establishes, `id` optional with an index fallback (same "optional, index-fallback" convention
  `Menu`'s own item keys use). Composes `Disclosure` directly — one real, independent instance per
  item — rather than reimplementing its markup or behavior; single-vs-multi-open coordination lives
  entirely in `Accordion`'s own state, never inside `Disclosure` itself (opening one item in
  single-open mode closes any other purely because `Accordion` computes a new one-item open set and
  each other `Disclosure` re-renders with `open={false}` like any ordinary controlled prop change).
  `multiple` (default `false`) toggles single- vs. multi-open; controlled
  (`openItems`/`onOpenItemsChange`, wins over `defaultOpenItems` when both are given — ignored, not
  invalid, same contract established for `Disclosure`/`Menu`) with an uncontrolled
  `defaultOpenItems` fallback, truncated to at most one id when `multiple` is `false` — this
  component's own initial state only; a controlled `openItems` array is never second-guessed or
  rewritten, even one with more than one id while `multiple` is `false` (the caller's own
  responsibility once they've taken control). No extra keyboard handling: the WAI-ARIA APG's own
  Accordion pattern lists arrow-key-navigation-between-headers as an optional ("should", not "must")
  enhancement layered on headers that stay individually `Tab`-reachable — confirmed NOT the same
  shape `shared/roving-focus.ts` assumes (a radiogroup/tablist, where only one item is ever in the
  tab sequence), so nothing extra was added without a concrete shape motivating it. `id`/`className`
  land on the outer wrapper only, no ARIA role of its own imposed on it — same "no unrequested
  opinions" posture `Disclosure` already established. 24 new tests (12 React + 12 Preact):
  structure, single-open closing siblings, clicking an already-open item closing it, `multiple`
  never closing siblings, controlled/uncontrolled `openItems` in both directions, `openItems`
  precedence over `defaultOpenItems`, the index-fallback identity, and confirming each section
  really is an unmodified `Disclosure` (`hidden`, not unmounted). Also fixed: Deno's `--no-check`
  transpile path elides a named import with zero usages anywhere in the file, even a real value
  import (not just `import type`) — a test file importing `dom-test-setup.ts` purely for its side
  effect needs the bare `import './dom-test-setup.ts'` form, not a named binding it never actually
  calls, or the side effect silently never runs.
- **`Button.tabIndex`** — plain native passthrough, the one escape hatch a roving-tabindex widget
  needs (exactly one item in a set carries `tabIndex={0}`, every other one `{-1}`). Small, additive,
  same category as the earlier `aria-expanded`/`aria-controls` addition made specifically for
  `Menu`'s own disclosure triggers — this one exists specifically for `RadioGroup` below. 4 new
  tests (2 React + 2 Preact).
- **`RadioGroup`** — the first real consumer of `shared/roving-focus.ts`'s
  `createRovingKeyDownHandler` (built ahead of one — this is the concrete shape that justified it).
  No legacy equivalent. The WAI-ARIA radiogroup pattern: `role="radiogroup"` wrapping `role="radio"`
  `Button`s, roving tabindex — arrow keys move AND immediately select the focused item (the WAI-ARIA
  APG's own documented radiogroup behavior, unlike a listbox/tablist, where moving focus and
  activating are separate steps), only the selected item (or the first, when nothing's selected yet
  — a real, valid initial state, not an error) sits in the normal `Tab` sequence. Items are looked
  up fresh via a container ref + `querySelectorAll('[role="radio"]')` at navigation time, not cached
  per-item refs — same "read the current DOM, don't cache it" approach `shared/escape-to-close.ts`'s
  own `getRefocusTarget` already takes, and what let this compose `Button` completely unmodified (no
  `ref` forwarding needed on `Button` itself). Data-driven (`items: RadioGroupItem[]`, same shape
  `Menu.items`/`Accordion.items` already establish), each item's `value` always meaningful (unlike
  `Accordion`'s own optional index-fallback `id` — no fallback here, `value` IS the semantic
  payload). Controlled (`value`/`onValueChange`, wins over `defaultValue` when both are given —
  ignored, not invalid, same contract established for `Disclosure`/`Accordion`/`Menu`) with an
  uncontrolled `defaultValue` fallback (`undefined` by default — nothing selected is a real, valid
  radiogroup state). `orientation` (`'horizontal'` default, `'vertical'`, or `'both'`) controls the
  arrow-key axis, passed straight through to `getNextRovingIndex`. Scope explicitly narrowed during
  design: a single-select visually-segmented control (a toolbar-styled option set) needs no separate
  component — same ARIA relationship regardless of how it's styled — and a genuinely different
  MULTI-select toggle group (independently-pressable buttons, `aria-pressed` rather than
  `aria-checked`, no roving tabindex at all per the APG's own guidance for that pattern) was
  evaluated and deliberately scoped OUT, not forgotten. 30 new tests (15 React + 15 Preact) —
  real-DOM arrow-key navigation including wrap-around, orientation gating, roving `tabIndex`
  following the selection, click selection, controlled/uncontrolled `onValueChange` in both
  directions, and `value` precedence over `defaultValue`.
- **`Button.id`** — a real, previously-missing gap (not a deliberate omission — `id` simply wasn't
  wired through at all), needed for `Tabs`'s own `aria-labelledby` to reference a specific tab
  `Button` from its panel, a real ARIA cross-reference `RadioGroup`'s own roving-tabindex lookup
  never needed (it queries by `role` alone). 4 new tests (2 React + 2 Preact).
- **`Tabs`** — the second real consumer of `shared/roving-focus.ts`'s `createRovingKeyDownHandler`,
  alongside `RadioGroup`. No legacy equivalent. The WAI-ARIA Tabs pattern: `role="tablist"` wrapping
  `role="tab"` `Button`s (composing the `role: 'tab'`/`selected` variant `ButtonProps` already had
  from the start), roving tabindex, exactly one `role="tabpanel"` rendered at a time (`tabIndex={0}`
  on the panel itself too, a real, separate WAI-ARIA requirement — the panel needs to be directly
  `Tab`-reachable so a caller can reach its content without an extra intermediate stop). Automatic
  activation only (arrow keys select immediately, same behavior `RadioGroup` already established for
  the identical underlying reason) — the WAI-ARIA APG's alternative "manual activation" mode isn't
  offered, no evidence has asked for it. IDs generated from a SINGLE `useId()` call at the top
  level, derived per item by combining it with each item's own `value` (always unique, same "no
  index fallback" contract `RadioGroupItem.value` already has) — calling `useId()` inside
  `items.map(...)` would violate the rules of hooks (a variable call count depending on
  `items.length`), so this avoids that entirely rather than working around it. Data-driven
  (`items: TabItem[]`, same shape the rest of this component family already establishes). Controlled
  (`value`/`onValueChange`, wins over `defaultValue` when both are given — ignored, not invalid,
  same contract established throughout) with an uncontrolled `defaultValue` fallback — but unlike
  `RadioGroup`, where nothing-selected is a real, valid state, `Tabs` defaults to the FIRST item
  when neither `value` nor `defaultValue` is given: a tablist with nothing selected shows no panel
  at all, a broken UI rather than a legitimate empty one — a deliberate, documented divergence from
  `RadioGroup`'s own default, not an inconsistency. 28 new tests (14 React + 14 Preact) — structure,
  the tab/panel `aria-controls`/ `aria-labelledby` cross-reference, roving `tabIndex`, real-DOM
  click and arrow-key selection (including wrap-around and orientation gating), and
  controlled/uncontrolled `value` in both directions.
- **`VisuallyHidden`** — stateless, the same `render.ts`-factory pattern `Icon` already establishes
  (no hooks, one shared implementation parametrized by `h`/`createElement`) rather than the
  per-renderer-hook shape `Disclosure`/ `Accordion`/`RadioGroup`/`Tabs` all needed. Thin wrapper
  over `shared/live-region.ts`'s own `VISUALLY_HIDDEN_STYLE`, applied inline (never a class) —
  broader use than live regions alone: any content that should reach assistive technology without an
  on-screen presence (an icon-only control's accessible label spelled out as real text, a skip
  link's destination description). Only ever a `<span>` — no polymorphic "render as a different
  element" option, no precedent for that pattern anywhere else in this package. 10 new tests (5
  React + 5 Preact).
- **`Alert`** — a persistent, VISIBLE inline message banner — `role="alert"` (default,
  `politeness="assertive"`) or `role="status"` (`politeness="polite"`), both implicit live regions
  on their own, no explicit `aria-live` attribute needed. Resolved the `Alert`/`InlineNotice` naming
  question to a SINGLE component — the one real semantic distinction (assertive vs. polite) is one
  prop, not two components. Deliberately no `variant`/severity prop (info/success/warning/error) —
  purely visual, zero ARIA backing, already fully achievable via `className` without inventing new
  API surface. Deliberately does NOT reuse `shared/live-region.ts`'s own `VISUALLY_HIDDEN_STYLE` —
  that module is for announcement-ONLY regions no one needs to see (`Slider`'s "Slide N of Total");
  `Alert` is the opposite case, a banner meant to be visible on screen. One real, documented caveat,
  not solved here: some screen readers only reliably announce a `role="alert"` element when it's
  added to the DOM as a genuinely NEW addition — content already present in the very first SSR HTML,
  before any AT has started scanning, may not announce on that first load; `space-ui` never makes
  client-only render-time decisions about mount timing, so this is a real characteristic of the
  pattern itself. Stateless, same `render.ts`-factory pattern `Icon`/ `VisuallyHidden` already
  establish. 12 new tests (6 React + 6 Preact).
- **`Pagination`** — a `<nav>` of page-number controls — Previous/Next plus a windowed sequence of
  page numbers, the current one marked `aria-current="page"`. Never constructs a URL/query-string
  itself — `getPageHref?` is entirely the caller's own function; when given, every page item
  (including Previous/Next) renders as a real, navigable `Link` (`onClick` still fires
  `onPageChange` alongside it, same "navigation plus an optional side effect" contract
  `Link.onClick` already has); when omitted, a plain `Button` instead, for pure client-state
  pagination with no URL of its own. A boundary (page 1 or the last page) OMITS Previous/Next from
  the DOM entirely, rather than rendering some `aria-disabled` stub — a real anchor has no coherent
  "disabled" state at all (only `Button` has a native `disabled` attribute), so this sidesteps the
  "disabled link" problem instead of working around it; Previous/ Next also carry
  `rel="prev"`/`rel="next"` when rendered as `Link`, a real case `Link.rel`'s own doc already names
  by name. Controlled (`page`/`onPageChange`, wins over `defaultPage` when both are given — ignored,
  not invalid, same contract established throughout) with an uncontrolled `defaultPage` fallback
  (`1` by default). Renders `null` entirely when `totalPages <= 1` — nothing meaningful to paginate,
  same "nothing to show" convention `Modal` already has for its own closed state.
  - **`get-pagination-items.ts`** — the windowing algorithm (always shows page `1`/`totalPages`,
    plus `siblingCount` pages around the current one, collapsing larger gaps into a single
    `'ellipsis'` entry) extracted as a pure, renderer-agnostic, directly-unit-tested module — same
    "extract the arithmetic, test it exhaustively" discipline `Showcase`'s own
    `resolveItemsPerSlide` already established (and, like that one, NOT exported from `mod.ts`/
    `mod-preact.ts` — component-specific, not a cross-cutting primitive). Avoids a real off-by-one
    case: collapsing a gap of exactly ONE hidden page into an ellipsis — `"…"` in place of a single
    page number saves no space and reads oddly — so a lone hidden page is shown directly instead,
    which requires widening the displayed range to the boundary on whichever side isn't showing an
    ellipsis (the naive version would otherwise silently drop that one page from the output
    entirely). 11 new tests for this module alone, covering every boundary shape (zero/one page
    total, a huge page count staying bounded, both ellipses, one ellipsis, a `siblingCount` of `0`,
    a `siblingCount` wide enough to absorb what would otherwise be a lone hidden page).
  - 35 new component tests (18 React + 17 Preact): structure, `aria-current` placement, ellipsis
    rendering, Previous/Next boundary omission, `Link` vs `Button` branching (including `rel`),
    real-DOM click navigation, and controlled/uncontrolled `page` in both directions.
- **`Skeleton`** — a pending/loading placeholder — childless (stands in for content that hasn't
  loaded, never wraps real content), no width/height/shape (circle/text-line/rectangle)/animation
  prop of its own — purely visual concerns with zero ARIA backing, fully achievable via `className`,
  same "no unrequested styling opinions" discipline `Alert`'s own `variant` rejection already
  established. Decorative (`aria-hidden`) by default; `label` switches it to an accessible
  `role="status"` — same convention `Icon.label`/`ProgressBar.label` already establish, deliberately
  reserved for a genuinely standalone skeleton, since a page showing several at once should announce
  "loading" once from its own wrapper, not once per skeleton. Stateless, same `render.ts`-factory
  pattern `Icon`/ `VisuallyHidden`/`Alert` already establish. 10 new tests (5 React + 5 Preact).
- **`shared/overlay-stack.ts`** (`registerOverlay`/`isTopOverlay`) — `Modal`'s own former
  `modal-stack.ts` (`registerModal`/`isTopModal`), moved into `src/shared/` and renamed, byte-for-
  byte identical logic otherwise, once `Drawer` became the real second consumer this move was
  already anticipated for. The actual point of the move: ONE shared stack, not two — a `Modal` and a
  `Drawer` open at once now correctly defer `Escape`/focus-trapping to whichever is genuinely
  topmost regardless of kind, and the page's scroll stays locked for as long as EITHER kind is open,
  restored only once the very last one — of either type — closes. `Modal`'s own
  `index.ts`/`index.preact.ts` updated to import from the new location; all of its existing tests
  (plus the renamed `modal-stack.test.ts` → `overlay-stack.test.ts`, with a new test added
  specifically covering a mixed Modal-id/Drawer-id stack) pass unchanged — a behavior-preserving
  refactor. Still internal — not exported from `mod.ts`/`mod-preact.ts`.
- **`Drawer`** — an edge-anchored off-canvas panel — `role="dialog"` + `aria-modal="true"` (the
  WAI-ARIA APG has no separate "drawer" pattern; this IS a dialog, just anchored to an edge instead
  of centered). Composes the exact same primitives `Modal` does (`shared/focus-scope.ts`,
  `shared/close-on-outside.ts`, `shared/overlay-stack.ts` above) unmodified — not a rewrite of any
  of them, and genuinely shares `Modal`'s own overlay stack, verified with a real cross-component
  test in both renderers: a `Drawer` and a `Modal` mounted together correctly defer to whichever is
  truly topmost on `Escape`, regardless of which one opened first or which kind it is. `side`
  (`'left'`/`'right'`/`'top'`/`'bottom'`) has no default, unlike `Modal.position`'s own `'center'` —
  there's no single edge that's the unambiguous normal case for a drawer the way a centered dialog
  is for a modal, so the caller always makes that choice explicitly. No slide-in transition of any
  kind ships here — a `className`/CSS concern entirely, same "no CSS shipped" posture every
  component in this package already has; a consumer's own `transition: transform` keyed off this
  component's `open` state is exactly the intended hook. No `DrawerProvider`/`useDrawer` imperative
  opt-in the way `Modal`'s own `ModalProvider`/`useModal` exists — that pair specifically rescued a
  real legacy capability (`Modal`'s own predecessor component only ever worked imperatively);
  `Drawer` has no legacy equivalent at all, and nothing has demonstrated a real "open a drawer from
  an arbitrary depth" need yet — deliberately deferred, not forgotten, same "don't build speculative
  infrastructure" discipline this whole family already follows. Otherwise identical to `Modal`'s own
  contract: the same accessible-name requirement (compile-time via `DrawerAccessibleName`,
  `logger.warn` fallback for untyped callers), the same `showOverlay`/outside-click-is-the-same-
  decision, the same focus management (capture → move into the panel skipping the close button as
  initial target → restore on close, only if still topmost), the same scroll lock. 35 new tests (18
  React + 17 Preact) — SSR, accessible-name paths, `side` positioning (all four edges' own anchor
  set), backdrop/outside-click, close button, `Escape` (default and disabled), the full focus-
  management story (initial focus, close-button fallback, restore-on-close), scroll lock, and the
  Modal-cross-stacking test described above.
- **`Field`** — a labeled form-field wrapper: `<label>`, the caller's own input, an optional hint,
  and an error message, correctly cross-referenced via `aria-describedby`/`aria-invalid`. Owns no
  state at all: no validation, no dirty-tracking, no submission logic. Built against a real audit of
  `@zanix/space`'s own `PageFieldErrors` (`Record<string, unknown>`, deliberately opaque on that
  side too — the real runtime shape, per `@zanix/validator`, is
  `Record<field, Array<{ constraints: string[]; value: unknown; plainValue: unknown }>>`) — and a
  real, confirmed gap found during that audit: `PageFieldErrors` isn't re-exported from
  `@zanix/space`'s own `mod.ts`, so no consumer can import it by name today (now recorded in this
  doc's own "Known gaps in `@zanix/space` itself"). `error?: string | string[]` deliberately takes
  already-resolved message(s) instead of typing against that shape directly — extracting the real
  message(s) for one field stays the caller's own job, the exact pattern `@zanix/space`'s own
  reference test already uses (`Object.entries(fieldErrors).flatMap(e => e.constraints ?? [])`) —
  which sidesteps needing the upstream export fixed at all, and keeps `Field` equally usable with
  errors from any source, not just that one flow.
  - **The one component in this package whose `children` is a render-prop.** Every other "content,
    not a pre-built element" case in this component family (`Disclosure`'s `trigger`, `Tabs`'
    `label`) solves the "avoid `cloneElement`" problem by treating the prop as pure visual content
    THIS component's own owned element wraps. That doesn't work here: `Field` has to label and
    ARIA-wire an arbitrary NATIVE FORM CONTROL it doesn't render itself (an `<input>`, a `<select>`,
    a custom composed control) — a genuinely different problem shape, not the same one solved
    differently. The caller's render function receives `{ id, 'aria-describedby', 'aria-invalid' }`
    as plain data and spreads it onto whatever they render — no cloning, no assumption about what
    `children` even is.
  - Composes `Alert` for the error message rather than reimplementing `role="alert"` — a validation
    failure IS exactly the assertive, time-sensitive message `Alert` already exists for. Multiple
    error messages render as a `<ul>` inside one `Alert`, not one `Alert` per message.
  - `aria-invalid` is never a literal `"false"` when absent — omitted entirely, same "ARIA boolean
    absence vs. explicit `false` are different signals to assistive technology" convention already
    verified for `aria-expanded`/`aria-checked`/`aria-selected` elsewhere in this package.
  - 21 new tests (11 React + 10 Preact): label/input wiring, `aria-describedby` combining hint AND
    error ids correctly, single vs. multiple errors, `aria-invalid` presence/absence, and a real-DOM
    test confirming the render-prop actually produces a focusable, correctly-labeled native input —
    not just that the right markup strings appear.
- **`ToastProvider`/`useToast`** — the only component in this family with a real legacy equivalent
  (`Overlay/Toast.tsx`, audited in full alongside its shared `Overlay/` infrastructure, which
  genuinely shares one generic `createOverlayStore()`/`useModalStore(type, selector)` with legacy
  `Modal.tsx`, not just structurally similar code). Imperative-only, like legacy always was:
  `ToastProvider` (plain `useState` + `Context`, the same shape `ModalProvider`/`IntlProvider`
  already use — never Zustand, never assumed as a requirement just because legacy's own store
  happened to use it) and `useToast()` returning `showToast`/`closeToast`. No declarative
  `<Toast open>` exists — a deliberate choice, not an oversight: a toast is inherently triggered by
  an event, not naturally tied to rendered UI state the way `Modal`'s own dialog usually is, so
  forcing symmetry with `Modal`'s own declarative-plus-imperative shape would be symmetry for its
  own sake.
  - **Real legacy behaviors kept, deliberately:** a toast always renders a close button regardless
    of `timeout`; `timeout` has no default, so a toast never auto-dismisses unless one is given
    explicitly; `showToast` with an `id` matching an already-shown toast UPDATES it in place (same
    stack position, new content) instead of stacking a duplicate — legacy's own dedup-by-`id`
    behavior, made explicit and intentional here rather than left implicit.
  - **A real legacy bug NOT replicated:** legacy's own `useToast.ts` cleaned up a `setTimeout` with
    `clearInterval` — a genuine mismatch. The auto-dismiss effect here uses `clearTimeout`, covered
    by a deterministic fake-clock test (`installTimerMock`) proving the pairing actually works.
  - **A real accessibility gap closed:** legacy's entire `Overlay/` directory had exactly one
    accessibility attribute in it — an `ariaLabel` on the close button — no `role`, no `aria-live`
    anywhere on the toast region itself. Every toast here composes `Alert` for its own message
    (`politeness: 'assertive'` for `variant: 'error'`, `'polite'` otherwise) instead of
    reimplementing that logic — real reuse: a toast notification is exactly the kind of message
    `Alert` already exists for.
  - **A real improvement over legacy's own shape:** `position` moved from per-toast (`ToastMessage`)
    to per-`ToastProvider`. Legacy's own per-toast `position` never actually composed correctly with
    genuine stacking — two toasts anchored to different corners aren't stacked together at all,
    they're just two unrelated single toasts. Reuses `Modal`'s own 9-way position vocabulary
    verbatim (`MODAL_POSITION_STYLE`/`MODAL_Z_INDEX`, same functional-not- decorative
    justification). Newest toasts always append to the stack's end; for a bottom/middle-anchored
    stack that naturally lands the newest closest to the anchored edge, for a top-anchored one it
    lands farthest instead — a real, minor, deliberately-not-solved asymmetry, documented rather
    than silently shipped or over-engineered away without concrete evidence it matters.
  - **Dropped, with a real reason:** legacy's sixth `type` value, `'custom'`, existed only to opt
    out of the other five's FORCED background color/icon. This component forces no color of any kind
    for any variant — headless, same as every other component in this package — so there's nothing
    left for `'custom'` to opt out of; `variant` here is purely semantic (which `Alert` politeness
    applies, plus a `data-variant` hook on each toast's own wrapper for a consumer's own CSS), never
    a color mechanism.
  - `icon`/`buttons` reuse `Icon`'s/`Button`'s own real prop types verbatim (`IconProps`/
    `ButtonProps[]`), same "reuse the real type, don't hand-roll a narrower parallel shape" contract
    `Menu.icon: IconProps` already establishes.
  - 30 new tests (15 React + 15 Preact): `useToast` outside a provider throwing, show/close,
    always-present close button, `variant` → `Alert` role/politeness mapping, upsert-by-`id`,
    deterministic auto-dismiss timing (fires at exactly `timeout`, not a tick before — and never
    fires at all without one), manual close correctly canceling a pending timer (no dangling
    timeout, verified via the fake clock's own pending-count), `showProgress`'s `'loading'` default,
    the per-toast `onClose` callback, multiple simultaneous toasts, and `position` anchoring.
- **`Popover`** — `usePosition`'s first real consumer.
  - **`shared/use-position.ts`/`.preact.ts` (`usePosition`) shipped alongside it, public** — the
    deliberately-deferred hook layer on top of `positioning.ts`/`positioning-dom.ts`, built now
    against this real first consumer rather than speculatively. Returns `null` until the first real
    client measurement (SSR-safe via ref-gating, never measures during SSR). Depending on the raw
    `options` object in its `useEffect` would cause an infinite render loop: since callers naturally
    pass a fresh `{ placement, offset }` object literal every render, each of the effect's own
    `setResult` calls would trigger a re-render → a new `options` literal → the effect re-running →
    another `setResult` call, forever. The effect is keyed on `JSON.stringify(options ?? null)`
    instead of the object itself to avoid this. `usePosition`'s own isolated unit tests don't
    exercise a fresh-literal-every-render caller, so this is covered by `Popover`'s own real test
    suite instead.
  - **Why `trigger` is a render-prop:** the same underlying problem `Field.children` already solves
    for — the trigger is an arbitrary element this component doesn't render itself (a `Button`, a
    `Link`, a custom control), so `cloneElement` isn't safe and plain content can't carry the real
    `aria-expanded`/`aria-controls`/`onClick` wiring. Unlike `Field`, no `ref` crosses the
    render-prop boundary: the trigger is found by querying a plain, component-owned
    `<span style="display:contents">` wrapper's `firstElementChild` — the same "query fresh from the
    DOM, don't thread refs through a render-prop" approach `Menu`'s own `toggleWrapperRef`/
    `triggerWrapperRef` already establishes. `Popover`/`Field` remain the only two render-props in
    this whole package — everywhere else (`Disclosure.trigger`, `Tabs.label`) the prop is pure
    visual content wrapped by an element the component itself renders.
  - **No portal, revisited and held:** `Modal`'s own no-portal decision flagged this specific
    question — a popover anchored inside a scrollable/clipped ancestor is a more concrete risk than
    a viewport-centered dialog — as worth re-examining for a positioning primitive. Re-examined
    here, not inherited blindly: `position: fixed` is relative to the viewport, not a scrolling
    ancestor, unless that ancestor establishes its own containing block for fixed descendants
    (`transform`/`filter`/`will-change`/`perspective` — a real but non-default CSS state). Preact
    core still has no `createPortal` at all (only `preact/compat`, never a dependency here); no
    concrete consumer has demonstrated the clipping failure mode matters in practice. Same
    conclusion as `Modal`, confirmed independently rather than copied.
  - **No focus trap:** a popover is non-modal — focus moves freely in and out, `Tab` continues the
    page's normal order. Reuses `useCloseOnOutside`/`createEscapeToCloseHandler` verbatim, the same
    close-on-outside-click-plus-`Escape`-closes-and-refocuses-the-trigger shape `Menu`'s own submenu
    items already have — not `focus-scope.ts`, which `Modal`/`Drawer` need specifically because they
    trap focus.
  - **Unmounts when closed, like `Modal` — not `Disclosure`'s own `hidden`:** `Disclosure` diverges
    from `Modal` because its content (FAQ answers, help text) is often exactly what a search crawler
    reading raw SSR HTML should still see collapsed. A popover's content is the opposite case —
    ephemeral, contextual, rarely worth indexing while closed — so this follows `Modal`'s own
    precedent: `null` when closed, nothing rendered at all.
  - **Measured while hidden, revealed only once positioned:** the panel's own DOM node has to exist
    for its ref to attach before `usePosition` can measure it — gating the panel's very existence on
    already having a position would be circular. It mounts as soon as `open` is true, stays
    `visibility: hidden` until `usePosition` returns a real result, then reveals with the real
    `transform` — the standard "measure while hidden, then reveal" technique, avoiding a
    flash-of-unpositioned-content an `x: 0, y: 0` starting transform would otherwise cause.
  - Controlled/uncontrolled `open`/`defaultOpen`/`onOpenChange`, same contract every stateful
    component in this package already has: a given `open` always wins over `defaultOpen`, and
    `onOpenChange` fires in both modes.
  - 23 new tests (12 React + 11 Preact): SSR closed/open (no panel ever leaks into SSR HTML, no
    `x:0,y:0` flash), trigger `aria-expanded`/`aria-controls` cross-reference, real-DOM
    click-to-open, positioning via a stubbed reference rect plus a forced re-measurement,
    click-again-to-close, outside-click-closes, `Escape`-closes-and-refocuses-the-trigger,
    uncontrolled/controlled/ `onOpenChange` (×3), controlled `open` updating from outside with no
    click needed, and `id`/`className` landing on the panel.
  - **Fixed after originally shipping, not caught by the 23 tests above:** `useCloseOnOutside` was
    scoped to the trigger's own wrapper alone. Since the panel renders as a SIBLING of that wrapper,
    not nested inside it, every `mousedown` on the panel's own content — including any interactive
    element a caller put inside `children` — was itself treated as "outside" and closed the popover
    immediately, before that element could ever be interacted with. Fixed by wrapping both the
    trigger and the panel in one shared container ref, passed to `useCloseOnOutside` instead. One
    new regression test added per binding (25 total now), reproducing a real click on a real button
    rendered inside the panel.
- **`Tooltip`** — `usePosition`'s second real consumer alongside `Popover`.
  - **Always mounted, the one deliberate divergence from `Popover`'s own unmount-when-closed:**
    `Popover` unmounts when closed, reasoned from its own arbitrary, potentially heavy `children`. A
    tooltip's `content` is the opposite case by design (short, static, cheap), and the WAI-ARIA
    APG's own reference tooltip pattern keeps the tooltip node ALWAYS present in the DOM
    specifically so `aria-describedby` on the trigger can point at a stable id that never dangles.
    Only `visibility`/`pointerEvents` toggle — never `hidden`/`display: none`, which the
    accessible-name/-description computation excludes; the ACCNAME spec's own exception for
    `aria-describedby`/`aria-labelledby` targets means a `visibility: hidden` node's text is still
    read out correctly by assistive tech.
  - **Every trigger event lands on the caller's own element, none on a wrapper:** the same
    underlying render-prop problem `Field.children`/`Popover.trigger` already solve (ARIA-wire an
    arbitrary caller-owned element), but `mouseenter`/`mouseleave`/`focus`/`blur` don't bubble
    natively, and Preact (unlike React's synthetic event delegation) attaches `onX` props as real
    native listeners directly on the node that carries them — a `display: contents` wrapper has no
    box of its own to ever receive a native `mouseenter`. All four are spread onto the real trigger
    element via the render-prop; the wrapper still exists, but purely so `usePosition` can query the
    real trigger's DOM node for measurement, the same "query fresh from the DOM" technique
    `Popover`'s own doc already covers.
  - **`openDelay`/`closeDelay` debounce mouse hover only, both default `0`:** real, well-established
    UX convention (rapid transient mouse movement shouldn't flash every tooltip it crosses), not a
    speculative prop — but both default to `0` (immediate) rather than a guessed "correct" delay
    value, since no evidence justified picking one nonzero default over another. Keyboard focus/blur
    deliberately bypass BOTH delays unconditionally: an artificial delay before a keyboard user's
    own explicitly-focused description appears would be a pure accessibility regression a mouse
    user's incidental hover doesn't share.
  - **A real, confirmed bug found and fixed — not a hypothetical:** an early version wired `Escape`
    to the trigger via `createEscapeToCloseHandler`, the same shape `Popover` uses (refocus the
    trigger on close). A real test caught it reopening itself immediately: closing calls `.focus()`
    on the trigger for the refocus, which — when the trigger wasn't ALREADY genuinely focused (i.e.
    exactly the hover-only-open case, the common one) — fires a real `focusin` event synchronously,
    and this component's own `onFocus` handler treats any `focusin` as "open," undoing the very
    close that just happened within the same batched update. In a real browser this bug is worse
    than the test alone shows: a hover-triggered tooltip's trigger may not hold focus at all, so a
    keydown listener scoped to the trigger's own `onKeyDown` would never even receive the native
    `Escape` keypress in the first place, since keyboard events target wherever real focus actually
    is, not wherever the pointer happens to be. Fixed by listening for `keydown` on `document`
    instead, only while `open`, with no refocus side effect at all — per the WAI-ARIA APG's own
    guidance that `Escape` dismissing a tooltip "must not interfere with" whatever actually holds
    focus, so refocusing the trigger would be wrong here even for the keyboard-focused case (if the
    trigger already holds real focus, there's nothing to restore). Proven independently in both
    React's and Preact's own test suites, each with a dedicated regression test reproducing the
    exact hover-only scenario that caught it.
  - No outside-click dismissal (a tooltip isn't opened by a click in the first place) and no focus
    trap (non-modal, ambient, content guided — not enforced — to stay non-interactive text, per the
    APG's own guidance).
  - Measured while hidden, revealed only once positioned — the same technique `Popover`'s own doc
    covers in full, just triggered by conditional `visibility` here instead of conditional mount.
  - Default `placement` is `'top'`, unlike `Popover`'s own `'bottom'` — a tooltip conventionally
    sits above the element it describes.
  - Controlled/uncontrolled `open`/`defaultOpen`/`onOpenChange`, same contract every stateful
    component in this package already has.
  - 32 new tests (16 React + 16 Preact): SSR (panel always in markup, cross-referenced by
    `aria-describedby`, hidden visibility style while closed), real-DOM hover open/close,
    positioning via a stubbed reference rect, focus/blur open/close, `Escape` closing a
    keyboard-focused tooltip AND — the dedicated regression case — a hover-only one without
    reopening it, `openDelay`/`closeDelay` timing (deterministic via `installTimerMock`, including a
    mouseleave-before-the-delay-elapses cancellation case), focus bypassing `openDelay` entirely,
    uncontrolled/controlled/`onOpenChange` (×3), controlled `open` updating from outside, and
    `id`/`className` landing on the panel.
- **`Combobox`** — the heaviest of this package's interactive components: combines
  `shared/roving-focus.ts` with `shared/positioning.ts`/`usePosition`. No legacy equivalent — new.
  - **The WAI-ARIA 1.2 single-input combobox pattern**, not the older 1.0 wrapping-`<div>` shape:
    `role="combobox"` lives on the real `<input>` this component renders, with
    `aria-expanded`/`aria-controls`/`aria-autocomplete="list"`/`aria-activedescendant`. Nothing here
    auto-completes the input's own text inline — a materially different, more opinionated UX this
    component deliberately doesn't impose; results only ever filter, never rewrite what was typed.
  - **`aria-activedescendant`, not roving tabindex — `getNextRovingIndex` called directly, never
    `createRovingKeyDownHandler`:** real DOM focus never leaves the `<input>` for the whole
    interaction, the WAI-ARIA combobox pattern's own defining shape, unlike `Tabs`'/`RadioGroup`'s
    roving TABINDEX. `shared/roving-focus.ts`'s own doc anticipated exactly this split when it
    shipped, ahead of either real consumer — proven correct now by a real second shape actually
    needing it. `getNextRovingIndex` assumes a real in-range current index, so "nothing highlighted
    yet, `ArrowDown`/`ArrowUp` pressed" is handled explicitly (lands on the first/last option
    respectively) rather than fed a magic sentinel that wouldn't reproduce the right wrap-around
    math.
  - **No `trigger` render-prop, unlike `Popover`/`Tooltip`:** both of those anchor to a genuinely
    arbitrary caller-owned element. A combobox's own `<input>` isn't arbitrary in that sense — it
    needs specific ARIA wiring and keydown/input interception tightly coupled to this component's
    own internal state, the same reason `Field` renders its own `<label>` and `Menu` renders its own
    toggle. This component owns and renders its `<input>` directly; `Popover`/`Field`/`Tooltip`
    remain the only three render-props in this whole package.
  - **`options` is never filtered internally** — the same "presents data, never owns it" seam every
    component in this package already keeps. A case-sensitivity policy, a fuzzy-match algorithm, or
    server-side search are all real, divergent choices a headless package has no business making for
    every consumer; the caller already owns `inputValue` and passes back an already-filtered
    `options` for it.
  - **Typing never clears a committed `value` on its own** — a deliberate scope choice: once
    `options` for the new `inputValue` no longer includes the previously selected option, whether
    that former selection is still "valid" is a policy question this headless component has no
    business deciding. Only an explicit selection (`Enter` or a click), or the caller's own
    controlled update, ever changes `value`.
  - **`useCloseOnOutside` scopes to a container wrapping BOTH the input and the listbox from the
    start** — applying, deliberately, the exact real bug `Popover`'s own entry above documents in
    full (found there first): the listbox renders as a sibling of the input, not nested inside it,
    so scoping outside-detection to the input alone would treat every click on an option as
    "outside" and close the listbox before a click could ever select anything.
  - **Mouse selection needs `onMouseDown` `preventDefault`, not just `onClick`** — clicking an
    option would otherwise blur the `<input>` first (the default browser behavior for clicking
    anything else), firing the blur-closes-the-listbox handler before the matching `onClick`
    selection could ever run. The standard, well-established technique this exact WAI-ARIA pattern
    needs.
  - **Listbox unmounts when closed, like `Popover` — not `Tooltip`'s own always-mounted:** its
    length and render cost scale with `options`, exactly `Popover`'s own reasoning, unlike
    `Tooltip`'s short, static content. `aria-controls` (unlike `aria-describedby`) tolerates
    referencing a currently-unrendered id without issue, per the WAI-ARIA APG's own reference
    implementations.
  - **`Escape` wires to the input's own `onKeyDown` directly, not a document-level listener like
    `Tooltip`:** `Tooltip` needed a document-level listener specifically because it can be open from
    mouse hover alone, with real focus sitting anywhere else on the page. A combobox is never
    hover-triggered — the `<input>` genuinely holds real focus for the entire interaction, so the
    same class of bug that hit `Tooltip` doesn't apply here.
  - **A real React/Preact divergence, not safe to assume from the prop name alone:** React's own
    `onChange` is deliberately remapped to fire on every keystroke (the native `input` event) —
    historical React API design. Preact maps prop names to native event types literally, so its own
    `onChange` means the native `change` event, which a text `<input>` only fires on blur/commit,
    not per keystroke. Using `onChange` in the Preact binding would have silently only picked up
    typed text once focus left the input, breaking live filtering entirely — the Preact binding uses
    `onInput` there specifically instead. The same class of quirk `IFrame`'s own `allowFullscreen`
    casing and `Video`'s own `srcLang` already established, extended to event names this time.
  - `disabled` options are still visitable via arrow-key navigation and hover (never skipped), but
    `Enter`/click on one is a guarded no-op — simpler than special-casing navigation around them,
    and matches native `<select>`'s own inconsistent-across-browsers handling of disabled `<option>`
    closely enough that no evidence justified the extra complexity.
  - No `noOptionsMessage`, no built-in loading state — both real, common needs in practice,
    deliberately left out of this first version rather than guessed at. The listbox still renders
    (empty) when `open` and `options` is empty; a caller can compose their own empty-state UI around
    this component. Revisit if a concrete case shows the omission actually matters.
  - 44 new tests (22 React + 22 Preact): SSR (`role="combobox"`, closed, no listbox),
    `aria-controls` cross-reference, focus opens it, typing updates the value and opens it (via a
    native-value-setter bypass in the React suite, working around React's own internal "value
    tracker" that silently ignores a plain `.value =` assignment), option rendering, click-to-select
    (fills the input, closes it), a dedicated mousedown-doesn't-blur-first regression case, a
    disabled option's click/`Enter` being a no-op, `ArrowDown`/`ArrowUp` from nothing highlighted
    landing on the first/last option respectively, wrap-around, `Enter` selecting and `Enter` with
    nothing highlighted selecting nothing, `Escape` closing without selecting or clearing typed
    text, the highlight resetting when the option SET's own content changes, outside-click and blur
    both closing it, positioning via a stubbed reference rect, uncontrolled/controlled `open` (×2)
    and a combined controlled `value`/`inputValue` case (notifies, never self-mutates), and
    `id`/`className` landing on the input.
- **`formatRichText`** (`src/intl/formatter.ts`) — a new, public, generic addition to the same
  `Formatter` interface `formatMessage` already lives on, and the foundation `RichText` (below) is
  built on. Legacy's own `RichText` was itself a thin wrapper around react-intl's ICU rich-text tag
  feature (`formatMessage({id}, {tagName: (chunks) => ReactNode, ...})`) — `@formatjs/intl` (this
  package's own existing, single formatting dependency) already has that exact mechanism natively;
  `formatRichText` exposes it directly instead of hand-rolling a second tag parser. Per the real,
  installed `intl-messageformat`/`@formatjs/intl` `.d.ts` files: `IntlShape.formatMessage`'s own
  generic overload already accepts `Record<string, PrimitiveType | FormatXMLElementFn<T>>` and
  returns `string | T | Array<string |
  T>`. Required widening `createFormatter`'s own
  `createIntl(...)` call from its implicit default `createIntl<string>` to an explicit
  `createIntl<unknown>` (`Type 'FakeNode' does not satisfy the constraint 'string'` otherwise); the
  existing plain `formatMessage` path is unaffected (same one `intl` instance now serves both).
  Return shape: a message with no tags — even when `tags` itself is non-empty but unused — returns a
  plain `string`, identical to `formatMessage`; a message that's entirely one tag returns that tag's
  own `T` directly; anything mixing text with tags returns `Array<string | T>`, in document order.
  `tags`/`values` are two call-site parameters merged into the ONE record the real underlying call
  expects (a tag wins on a same-named collision) — a pure ergonomic split, not a second semantics.
  Deferred until `RichText` became its first real consumer, the same "build it once a real consumer
  needs it" reasoning `usePosition` was deferred under until `Popover` arrived. 13 new tests.
- **`RichText`** — the last piece of work, deliberately excluded from the 14-component build-out
  plan from the start and scoped separately. Unlike every other component in this whole family, this
  one has a real, fully-audited legacy equivalent (not "no legacy equivalent — new") — every design
  decision below is a Keep/Change/Fix/Drop resolved against that audit, not a from-scratch
  invention.
  - **Population (`<props>`), redesigned without the string round-trip that caused two confirmed
    legacy bugs.** ICU tags have no attribute syntax of their own — legacy's own nested
    `<props>key=val&...</props>` tag (which returned a STRINGIFIED `{{($...$)}}` marker the
    enclosing tag's own handler had to re-find via regex and re-parse) is a real, necessary answer
    to that constraint, not an arbitrary implementation quirk — kept, same authoring syntax. What's
    gone is the round-trip: legacy's own regex (`[^$]*`) broke on any value containing a literal
    `$`, and for "component-type" tags, any plain text sibling that wasn't a marker was silently
    swallowed and misparsed as bogus querystring. `<props>` (`RichText/props-sentinel.ts`) now
    parses its own querystring-shaped content IMMEDIATELY and returns a typed sentinel value — an
    unexported `Symbol`-tagged object, deliberately not a plain `{__richTextProps: true}` shape, so
    no chunk value a caller could construct themselves is ever mistakable for one — carried through
    the chunks array as real data, never restringified. The enclosing tag calls
    `extractRichTextProps(chunks)` once, uniformly — no tag is special-cased by a
    `type: 'element' | 'component'` distinction the way legacy's own `useProperties` was, which is
    exactly what makes the swallowed-plain-text bug class structurally impossible now, not merely
    patched. Merge policy across multiple `<props>` blocks on one tag kept identical to legacy's own
    `customPropsDefinition`, minus BEM (this package has none, per `docs/styling.md`'s already-
    settled position): `className` concatenates (space-joined, in order); a plain `style` object
    shallow-merges (later keys win per-key, not the whole object replaced); everything else is
    last-write-wins. `extractRichTextProps` is exported publicly — the one piece of `RichText`'s own
    internals meant to be reused: a custom tag passed through `RichText`'s own `tags` prop
    participates in population the identical uniform way every built-in tag does, nothing
    special-cased for the built-ins. A dedicated `parsePropsQuery` (`RichText/parse-props-query.ts`)
    parses the actual querystring — bracket-nesting for objects/arrays, `'true'`/`'false'`/numeric
    coercion, built on native `URLSearchParams`, not a third-party querystring library, same
    approach legacy's own `queryParams` took. 15 + 14 new tests (`parsePropsQuery` and
    `extractRichTextProps` respectively) — the merge semantics above are directly, explicitly tested
    (className concatenation, style shallow-merge, last-write-wins, and a literal-`$`-value case
    proving the exact legacy bug is gone), not just asserted in prose.
  - **The 34-tag legacy element table, audited entry by entry.** Structural/text tags (`h1`–`h5`,
    `n`, `p`, `b`, `i`, `u`, `ul`, `ol`, `li`, `del`, `span`, `div`, `ar`, `se`, `ma` — 19 of them)
    kept verbatim, same short names — real existing `.doc`/catalog content already authors these;
    renaming would be a pure compatibility break for zero benefit. `a`→`Link`, `btn`→`Button`,
    `sn`→`SocialNetworks`, `img`→`Image`, `ibtn`→`ImgButton`, `ifrm`→`IFrame` kept, same targets.
    `icon`→`CatalogIcon` (changed from legacy's own `Icon`) — content authors get named icons with
    no `href`/`viewBox` to manage. `video`→the REAL `Video` component — legacy's own `video` tag was
    a confirmed, UNCONDITIONAL self-recursion crash bug
    (`Video: ReactComponent = chunk => <Video
    {...} />`, resolving to itself, no base case),
    confirmed by a full-repo grep to have never once actually been used by any real content
    anywhere; this is the first version where it renders anything at all, proven by a dedicated
    test. `sus`→`Skeleton` (repurposed from legacy's own `SuspenseFallback`, never migrated to this
    package and React-Suspense-specific) — same loading-placeholder intent, backed by a real,
    already-shipped, both-renderer component instead. `br`→`BreakLine`'s own logic, with a real
    off-by-comparison bug fixed (`index < chunk.length -
    1` compared a fragment index against
    the ORIGINAL STRING's character length instead of `splitContent.length - 1`, appending a
    spurious trailing `<br/>` almost always) — and the _implicit_, unconditional "auto-split every
    literal `\n` into `<br/>` everywhere" behavior legacy applied to ALL content automatically is
    dropped entirely: no other component in this package has a blanket, non-opt-outable text
    transform, and an explicit `<br/>` tag (or the caller's own `white-space` CSS) replaces it.
    `page` and `lc` (`LayoutContainer`) dropped — `page` shared `video`'s own self-recursion bug AND
    has no real target concept in this package at all (page-level composition is `@zanix/space`'s
    own job, not this package's); `lc` has no migrated space-ui target yet (an open question since
    before this component existed). `menu` dropped too — `Menu` has no renderer-agnostic `render.ts`
    factory the way every other target component here does (real per-renderer hooks), and no
    consumer evidence inside rich text specifically has asked for it. `props`/`md` redesigned — see
    their own bullets.
  - **Markdown, explicit and genuinely expanded — not just legacy's own `<md>`-scoped-only
    capability kept as-is.** `markdown-to-jsx@9.10.2`'s own `/markdown` subpath — confirmed, by
    reading its real built JS directly (not its React-flavored `.d.ts` or root/`/react` entrypoint),
    to be a PURE markdown→AST parser with zero React import at runtime — is walked by hand via `h`
    (`RichText/markdown.ts`), the identical "parameterized by `h`" pattern `createCatalogIcon`
    already established, covering paragraphs, headings, emphasis/strong/ strikethrough/inline code,
    links, images, fenced/inline code, ordered/unordered lists, blockquotes, and line/thematic
    breaks. This is the concrete reason Markdown renders through Preact with ZERO `preact/compat`
    involved anywhere in the chain — proven, not just asserted, by a new dependency-boundary test
    (`mod.ts and mod-preact.ts: both reach markdown-to-jsx, but
    never through preact/compat`)
    that would fail immediately if a naive integration via markdown-to-jsx's own `/react` renderer
    had been used instead. Tables, footnotes, GFM task lists, frontmatter, and raw HTML/JSX blocks
    are a real, disclosed v1 scope limit (render as nothing, confirmed by a dedicated non-crashing
    test) — not a hidden gap. The legacy `_props`-on- URL convention (`MDLink`/`MDMedia`, routing a
    markdown link/image URL like `![caption](clip.mp4?_props[video]=true)` to
    `Link`/`Image`/`Video`) is kept, but unified onto the SAME `parsePropsQuery` the ICU-side
    `<props>` tag uses, replacing legacy's own second, parallel querystring implementation with one
    shared parser. New, explicit, and genuinely expanded relative to legacy (which only ever engaged
    Markdown inside a literal `<md>...</md>` tag, never at the document root):
    `contentFormat?: 'icu' | 'markdown'` (default `'icu'`) is the one explicit switch between
    ICU-tagged content and literal top-level Markdown — deliberately no sniffing by content shape or
    by where `content` came from, an explicit design request. Equally deliberate: `'markdown'` mode
    NEVER runs `content` through `formatMessage`/ICU parsing first, unlike `'icu'` mode — ICU
    MessageFormat uses `{...}` for its own interpolation/plural syntax, and real Markdown content (a
    fenced code block showing JSON or CSS, for one) commonly contains literal curly braces that ICU
    parsing would otherwise misinterpret as its own syntax before Markdown ever saw them; proven by
    a dedicated test asserting literal braces survive intact. 24 + 12 new tests for the renderer
    itself (React + Preact), plus markdown-mode coverage inside `RichText`'s own test suites below.
  - **`doc` is gone as a prop — moved out of this component entirely, not silently dropped.**
    Legacy's own `doc` mixed three real, confirmed problems directly into the component: Node's
    synchronous, server-only `fs.readFileSync` for the non-fetched branch (would throw in any
    browser/edge runtime bundle); an unconditional client-side `fetch` on every mount/`doc` change
    with no caching and no error handling (a failed load or a 404 error page's own HTML got rendered
    as if it were rich-text content, silently); and a real, ACKNOWLEDGED-but-never-fixed
    hydration-mismatch bug — legacy's own source carried a `TODO` comment directly above the
    offending `useState` call, acknowledging the value needed to be received from SSR instead to
    avoid the hydration mismatch, but the fix was never actually made. All three are real violations
    of this package's own principle that `space-ui` presents data, never owns it — no exceptions
    carved out for convenience — applied here explicitly for the first time — every other component
    in this whole family already honored it, `doc` alone hadn't yet had that discipline actually
    applied to it. Rather than assume the underlying "render an identified document" capability was
    itself the problem, a real architectural alternative was found before removing it:
    `resolveRichTextDocument` (`RichText/resolve.ts`) is a standalone, renderer-agnostic,
    ALWAYS-`fetch`-based async resolver (never `readFileSync`, works identically in
    browser/Deno/edge/Node 18+) — mirroring `StructuredData`'s own `resolve.ts` precedent exactly (a
    component plus an adjacent pure/async resolver a consumer can call independently), not a new
    abstraction invented just to keep `doc` around. Resolves a relative asset path through the SAME
    `resolveAssetHref` mechanism `Video`/`Image` already use (with an optional `baseUrl` for the
    server-side case, where — unlike a browser — there's no implicit page origin a root-relative
    path resolves against; a `@zanix/space` `loader` already has its own request's origin available
    to pass through). A failed load REJECTS with a real, descriptive error instead of legacy's own
    silent fetched-error-page-as-content bug — the caller (typically a `loader`, which already has
    real error-handling conventions of its own) decides what a failed doc load means for its page.
    Called from a `loader`, `content` arrives at `RichText` already resolved, server-side, before
    the page ever renders — deterministic first render by construction, never legacy's own
    client-only fetch state that caused its own hydration bug. 7 new tests, using a small local
    `fetch` stub (not yet worth extracting to `dom-test-setup.ts` — only one consumer so far, same
    "extract once a second consumer needs it" discipline this package applies throughout).
  - **Requires `<IntlProvider>` uniformly**, even in `'markdown'` mode, which doesn't actually use
    the formatter at all — a deliberate simplification (one invariant to document rather than a
    conditional one), and React's own Hooks rules make `useIntl()` awkward to call conditionally
    regardless. Confirmed by a dedicated test: `RichText` throws outside an `<IntlProvider>` even
    when only rendering Markdown.
  - No `trigger` render-prop, unlike `Popover`/`Tooltip`/`Field` — `RichText` doesn't anchor to or
    wrap a single arbitrary caller element the way those do; its own `tags`/`content` are its whole
    contract.
  - 24 + 21 new tests for the component itself (React + Preact): plain-text/no-tags rendering,
    content-as-catalog-id-with-self-fallback, every basic structural tag, nested tags, ICU
    interpolation alongside tags, a dropped legacy tag (`page`) rendering as harmless literal text
    rather than crashing, `<props>` population end to end (id/className/style, multi-block merge, a
    literal-`$` value), every zanix component tag (`a`/`btn`/`icon`/`img`/`video`/`sus`/`ifrm`)
    rendering through its real target component, a custom `tags` entry rendering alongside and
    overriding a built-in, `contentFormat="markdown"` rendering literal Markdown, markdown mode
    never treating `content` as a catalog id, markdown mode never running `content` through ICU (the
    literal-braces case), `contentFormat` defaulting to `'icu'`, and throwing outside an
    `IntlProvider`.
  - New package dependency: `markdown-to-jsx@^9.10.2` (only its `/markdown` subpath is ever imported
    — see the Markdown bullet above for why that specific subpath, not the package's own
    React-flavored root/`/react` entrypoint, is what makes this safe for Preact).
  - **`data-space-ui="richtext"` on every plain HTML element `RichText` renders itself** (`p`,
    `h1`–`h6`, emphasis/strong/strikethrough, `code`/`pre`, `ul`/`ol`/`li`, `blockquote`, `br`/`hr`
    — both ICU and Markdown mode), added after initial release once the question came up directly:
    unlike the `a`/`img`/`video`/`btn`/`icon`/`sn`/`ibtn`/`ifrm`/`sus` tags — which already compose
    a real space-ui component and inherit ITS `data-space-ui` (`"link"`, `"image"`, …), same "don't
    add a second identity on top of a real component's own" precedent `CatalogIcon` already holds
    for `Icon` — the plain structural/text tags render raw host elements directly, with no component
    of any kind behind them to provide a selector hook. `RichText` itself renders no root element
    (unchanged — no wrapper synthesized just to carry this), so the attribute lands on each
    individual element instead, in both `RichText/tags.ts` (ICU) and `RichText/markdown.ts`
    (Markdown) — one shared identifier, not a value per original tag name, same granularity every
    other `data-space-ui` in this package already uses. Overridable via `<props>`, same
    last-write-wins contract as any other populated prop. See `docs/styling.md`'s own updated table.
- **A full audit of `docs/styling.md`'s own `data-space-ui` table, and two real fixes found along
  the way** — the table itself covered only 14 of the (now) 33 components; rebuilt to cover all of
  them, each verified directly against that component's own real source (not against the previous
  table, not from memory).
  - **`shared/behavior.css` fix, not just a docs correction:** the file's own header comment claimed
    `Menu`/`Modal`/`Slider`/`Toast` "aren't built yet" — false, all four ship. More significantly,
    `.space-ui-overlay`/`.space-ui-hidden-overlay` were plain CSS CLASSES, but no component ever
    renders `class="space-ui-overlay"` — the file's own stated mechanism (same as
    `[data-space-ui="progress-bar"]`) was never actually followed for these two, so they could never
    have applied regardless of whether their claimed consumers existed. Fixed by rewriting
    `.space-ui-overlay` as `[data-space-ui="modal-backdrop"], [data-space-ui="drawer-backdrop"]` —
    `Modal`/`Drawer`'s own real, confirmed backdrop attribute values — matching `progress-bar`'s own
    real precedent. Deliberately sets ONLY `background`, not `position`/`z-index`/sizing like the
    legacy class did: `Modal`/`Drawer` already set `position: 'fixed'` and their own real `zIndex`
    (`MODAL_Z_INDEX`/`DRAWER_Z_INDEX`, both `999` for the backdrop) as inline `style`, which an
    external stylesheet can never override regardless of specificity — porting `--space-z-overlay`
    (`2147483646`, a wildly different number) into the rule would have misleadingly implied a value
    that could never actually apply. Keeping that stacking inline, not CSS-dependent, is deliberate:
    headless means `Modal`/`Drawer` stack correctly with zero CSS ever imported — making that depend
    on this optional stylesheet would be LESS headless, not more, so `--space-z-overlay` itself
    stays a known, accepted, unreferenced token rather than something to wire up. `.hidden-overlay`
    is dropped entirely, not merely left unwired: `showOverlay={false}` renders NO backdrop element
    in either `Modal` or `Drawer` — never an invisible one — and `Popover`/`Combobox` (which also
    need outside-click dismissal with no visible backdrop) independently chose `useCloseOnOutside`'s
    own `document`-level listener over a catch-all element too. Nothing in this package's current
    architecture has a rendered state that variant would ever style.
- **`Table`** — the only genuinely new component `@zanix/console`'s architecture requires: a
  headless `<table>` over caller-resolved `columns`/`rows`, generic over the caller's own row shape.
  No fetch, no router calls, no form state — same "presents data, never owns it" seam every
  component here keeps. Controlled `sort`/`onSortChange` (with an uncontrolled `defaultSort`
  fallback) mirrors `Pagination`'s own `page`/`onPageChange`/`defaultPage` shape exactly: a sortable
  header's `Button` click only computes the next `TableSort` (`get-next-table-sort.ts` — asc ↔ desc
  toggle on the same column, asc on a new one) and hands it back, never applying it to `rows`
  itself. `getRowHref?: (row, index) => string` mirrors `Pagination.getPageHref` — when given, each
  row's FIRST column renders wrapped in a real `Link` instead of plain content; there's no "`Button`
  otherwise" fallback the way `Pagination` has for its own page items, since a `<tr>` has no native
  interactive-control equivalent. `onRowClick` fires alongside real navigation, the same "navigation
  plus an optional side effect" contract `Link.onClick` already has. A sortable column's `<th>`
  carries the real `aria-sort` attribute (`'ascending'`/`'descending'`/`'none'`) rather than a
  hand-rolled indicator — the WAI-ARIA- recommended technique. `caption` renders as a real
  `<caption>` (the WCAG-preferred accessible name for a data table, over an `aria-label` on the
  `<table>` itself); `emptyState` renders as a single row spanning every column when `rows` is
  empty. `data-space-ui="table"` on the root; the sortable header's own `Button` and a row's own
  `Link` (when `getRowHref` is given) both inherit their composed component's own hook rather than
  adding a redundant one.
- **`Recaptcha`**/**`HCaptcha`**/**`Turnstile`** — the client-side complement to `@zanix/auth`'s own
  `captchaGuard`; this package never imports `@zanix/auth` or mentions
  `CAPTCHA_TOKEN_HEADER`/`X-Znx-Captcha-Token` in real code. Three separate components, not one with
  a `provider` prop — each provider ships its own real client-side JS runtime, so a consumer using
  only one never pulls the other two providers' glue code into their bundle. All three share a new
  internal primitive (`shared/script-loader-dom.ts` + `shared/use-script-loader.ts`/`.preact.ts`,
  not exported from `mod.ts`/`mod-preact.ts`) that injects a provider's `<script src>` at most once
  per distinct URL, deduped across every widget of the same provider/mode. Same API shape
  throughout: `onVerify(token)`, `verifyTrigger`/`resetTrigger` (`number | string`, changed by the
  caller to force an explicit re-verification/`.reset()`), `onExpire`/`onError` (mapped to each
  provider's real `expired-callback`/`error-callback`, plus a separate `<script>` load-failure path
  — network or CSP block — routed to the same `onError`). `action` (v3 scoring) exists only on
  `Recaptcha`. `size` (`Recaptcha`/`HCaptcha`) and `appearance` (`Turnstile`) are shared, publicly-
  exported types (`CaptchaWidgetSize`/`TurnstileAppearance`, `shared/captcha-types.ts`), not inline
  unions repeated per component. `scriptSrc?: string` (all three) overrides the default script URL
  verbatim — a self-hosted/proxied mirror, reCAPTCHA Enterprise's own different endpoint, or a test
  double; still deduped by the same registry as the default URL. SSR-safe: the first render is
  always an inert, empty container; the real `<script>` injection and widget render both happen
  post-mount. See each component's own JSDoc for the CSP gotcha in a `@zanix/space` app and a real
  end-to-end usage example.
- **`Select`** — a single-select dropdown: a trigger `Button` showing the current selection, opening
  a positioned popup listing options (`role="listbox"`/`role="option"`), single selection via click
  or arrow keys. The WAI-ARIA "Collapsible Dropdown Listbox" pattern — genuinely different from
  `Combobox`'s own `role="combobox"` pattern (no free-text filtering, the trigger is a real
  `<button>`, never a text input). Beyond this package's original 14-component build plan — added
  once a concrete need for it existed, exactly the "future menu-button dropdown"
  `docs/architecture.md`'s own `roving-focus.ts` row already anticipated. The trigger composes
  `Button` verbatim (inherits `data-space-ui="button"`, no redundant hook); the listbox/options
  carry `"select-listbox"`/`"select-option"`, the same naming convention `Combobox` already
  established. Real focus moves onto the listbox itself on open; `aria-activedescendant` tracks the
  current option via `shared/roving-focus.ts`'s own `getNextRovingIndex`, called directly. Arrow
  keys commit the selection immediately — automatic activation, the same convention
  `RadioGroup`/`Tabs` already use — rather than `Combobox`'s own manual Enter-to-commit; disabled
  options are skipped entirely during navigation. Controlled (`value`/`onValueChange`,
  `open`/`onOpenChange`) with uncontrolled `defaultValue`/`defaultOpen` fallbacks. No
  `aria-describedby`/`aria-invalid` passthrough in this first version — `Button`'s own closed prop
  API has no such passthrough today; a disclosed, not guessed-at, scope limit.
- **`Input`/`FileInput`** — plain native form-control primitives, no state of their own beyond the
  native uncontrolled input itself. `Input` wraps
  `<input type="text"|"email"|"password"|"number"|
  "tel"|"url"|"search">` — controlled
  (`value`/`onValueChange`, always wins over `defaultValue`) or uncontrolled, with the matching
  native passthroughs (`placeholder`/`disabled`/`readOnly`/
  `required`/`autoComplete`/`pattern`/`maxLength`/`min`/`max`/`step`/`name`). `FileInput` wraps
  `<input type="file">` — no `value` a script can ever set on a file input (a real DOM/security
  constraint), so it's reset-only via `resetTrigger` (`number | string`, the same change-triggered
  escape hatch `Recaptcha`/`HCaptcha`/`Turnstile`'s own `resetTrigger` already establishes for an
  analogous platform constraint), firing `onFilesChange` with a plain `File[]` (converted from the
  native `FileList`, never the `FileList` itself) on every change, including an explicit reset. Both
  accept `name`, forwarded verbatim — the one piece of information a plain `<form method="post">`
  submit needs to include either field's value in the resulting `FormData(form)` at all. Both
  compose into `Field` via the shared `aria-describedby`/`aria-invalid` spread contract
  (`FieldRenderProps`), or stand alone with their own `aria-label`/`aria-labelledby`. Available for
  both React and Preact.
- **`RichText` neutralizes an unsafe URL scheme** (`javascript:`, `vbscript:`, non-image `data:`) on
  any `href`/`src` an author supplies via `<props>`, rather than passing it through to the DOM.
  Applies everywhere a `<props>` value can become a navigable URL: `a`'s `href`, `img`/`ifrm`/
  `video`'s `src`, `ibtn`'s optional `href`, and each entry's `url` in `sn`'s `links` array —
  `<props>` content is author-controlled (CMS, translations, UGC), so none of it is trusted to carry
  script execution through to the page. The check (`@zanix/helpers`'s `sanitizeUrl`) strips ASCII
  tab/CR/LF and leading control characters before reading the scheme, the same normalization a
  browser applies, so a value like `"java\tscript:alert(1)"` is caught the same as
  `"javascript:alert(1)"`. A safe URL — including `data:image/…` — passes through unchanged.

### Known limitations

- `StructuredData`'s and the Preact bindings' public type signatures reference vendor types
  (`schema-dts`'s `Thing`, Preact's `VNode`) that JSR's slow-types checker flags — a deliberate,
  documented trade-off (see `mod.ts`'s own comment) rather than re-exporting those libraries' full
  internal type graphs into this package's own public surface. Does not affect correctness for any
  consumer; only JSR's fast pre-computed type inference is unavailable for these specific exports.
  `Messages` (`src/intl/formatter.ts`) is the same trade-off for a third vendor: it references
  `@formatjs/icu-messageformat-parser`'s `MessageFormatElement` type-only (never a runtime import —
  see that module's own doc), which JSR's checker flags for the same reason. `deno doc --lint`
  reports these as `private-type-ref` for every affected export; verified as exactly this known set
  (17 instances as of this entry), not a new/unexpected one, before each release.
