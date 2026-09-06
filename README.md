# Zanix - Space UI

[![Version](https://img.shields.io/jsr/v/@zanix/space-ui?color=blue&label=jsr)](https://jsr.io/@zanix/space-ui/versions)

[![Release](https://img.shields.io/github/v/release/zanix-io/space-ui?color=blue&label=git)](https://github.com/zanix-io/space-ui/releases)

[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

## Table of Contents

1. [Description](#description)
2. [Current status](#current-status)
3. [Design principle](#design-principle)
4. [Styling](#styling)
5. [Installation](#installation)
6. [Basic Usage](#basic-usage)
7. [Documentation](#documentation)
8. [Changelog](#changelog)
9. [License](#license)

## Description

A component library for apps built on [`@zanix/space`](https://jsr.io/@zanix/space) — presentational
building blocks (icons, social buttons, structured data, and eventually interactive pieces) that
stay usable on their own terms rather than assuming Space's full stack is present.

## Current status

Early and intentionally small. Only what's listed below is implemented — nothing else is stubbed
ahead of time:

- ✅ **`Icon`** — an SVG sprite icon (`<svg><use href="#..." /></svg>`). Takes an already-resolved
  sprite `href`, a symbol `name`, and an explicit `viewBox` — no client-side fetch-and-sniff, no
  flash of an empty icon while a real `viewBox` loads in.
- ✅ **`CatalogIcon`** — `Icon`, pre-wired to an optional, curated default icon catalog (17 common
  UI glyphs, `CC BY 4.0`-licensed, no brand icons). Resolves a known `name` to the catalog's own
  `viewBox` and delegates the render to the unmodified `Icon` — `href` is still yours to provide.
  Entirely opt-in: nothing here is loaded, imported, or scaffolded unless you reach for it. Built on
  **`createCatalogIcon`**, a public, renderer-agnostic factory
  (`(h, viewBoxByName) => (props) => E`) — the same "known `name` → real `viewBox`" ergonomics are
  available for a catalog of your own, not just this package's. See
  [`docs/icons.md`](./docs/icons.md) for the full catalog, its license, its independence from any
  visual theme, and `createCatalogIcon`'s own worked example.
- ✅ **`SocialNetworks`** — a list of external social links, each an accessible `<a>` wrapping
  either an `Icon` or an image logo. Default accessible label/tooltip built from the network name;
  both overridable per link. Renders nothing for an empty list.
- ✅ **`StructuredData`** — a JSON-LD `<script>` tag from typed [schema.org](https://schema.org)
  data (`schema-dts`). Renders `data` exactly as given; defaults `@context` to
  `'https://schema.org'` only when `data` doesn't already set it. Its own resolution logic is also
  available standalone as **`resolveStructuredData`**, independent of any renderer.
- ✅ **`Link`** — a plain `<a>` with sensible external-link attributes, overridable `rel`, an
  optional `onClick` alongside navigation, and a native `title` passthrough. No internal-routing
  special case: `@zanix/space`'s own Orbit navigation intercepts plain anchor clicks without an
  opt-in component, unlike `react-router`'s `Link`.
- ✅ **`Button`** — a real `<button>`, split out from `Link` (an action belongs on a button, never
  an anchor styled to look like one). `onClick` optional, `name`/`value` for multi-action forms, no
  forced accessible-name prop when visible text already provides one. `role="switch"`/`"tab"`/etc.
  require their own WAI-ARIA companion state (`checked`/`selected`) at the type level — impossible
  to forget, not just documented. Plain `aria-expanded`/`aria-controls`/`aria-current` passthrough
  for any button that discloses, controls, or represents the current selection among others,
  forwarded verbatim to the real `<button>`.
- ✅ **`IFrame`** — a real, standalone `<iframe>` primitive (not private to any other component — a
  future `Video` embed, a map, a scheduling widget all reuse this same one). `title` is required — a
  real accessibility guarantee, never optional. `loading="lazy"` is browser-native, no
  `IntersectionObserver` involved; `sandbox` is supported.
- ✅ **`Video`** — YouTube, Vimeo, a generic embeddable URL, or a local/CDN file, one component:
  classified by `@zanix/space`'s own `detectVideoSource` (a real, unconditional dependency — see
  below), rendered via `IFrame` (embeds) or a real native `<video>` (files). Native
  `controls`/`autoPlay`/`loop`/`muted`/`playsInline`/`preload`/`tracks` for the file case; the same
  four playback options thread through the provider's own real embed URL for YouTube/Vimeo.
  `sources?: VideoSourceProps[]` (file case only) renders real `<source media type src>` children —
  the browser selects among them once, at load time, with no JavaScript and no reactive re-selection
  on resize; a video already playing is never interrupted by responsive logic. No pretty-controls,
  no custom lazy-loading — headless, same as every other component here. Renders nothing for an
  undetectable/unsupported source (e.g. an `.m3u8` HLS manifest — `@zanix/space` doesn't support
  HLS). Ships in TWO forms, same name: the default `.`/`./preact` export is comet-safe (an
  already-absolute file/poster/track path works as-is; a relative one is left unresolved, since
  `@zanix/space/assets-manifest`'s own `resolveAssetHref` is never injected here) — the
  `./runtime/video` subpath is the byte-for-byte identical, auto-resolving sibling (relative paths
  resolve via `resolveAssetHref`, SSR-only, not comet-safe). `@zanix/space/video-source`'s own
  classification stays a real, unconditional dependency in BOTH forms (safe for a Comet — no
  `'server-only'` directive) — see `Video/render.ts`'s own doc for the full contract.
- ✅ **`Image`** — a real `<img>`, or a `<picture>` with art-direction `<source>`s when `sources` is
  given. Native `loading`/`decoding`/`fetchPriority`/`crossOrigin`/`referrerPolicy` only; no custom
  lazy-loading machinery. `placeholder` shows a fallback image while the real one loads (a real
  independent capability, not a lazy-loading detail — it works the same regardless of `loading`) via
  CSS `background-image` on the `<img>` itself, since `<img>` has no native `poster`-equivalent
  attribute. Applies no `object-fit` (or any other visual) default of its own — a consumer gets a
  fill-and-cover look, with full control (`contain` included), via plain CSS on `className`.
  `id`/`className`/`data-space-ui="image"` always render on the `<img>` itself, never on the
  `<picture>` wrapper (`object-fit`/sizing only ever apply to the replaced `<img>` element). Ships
  in TWO forms, same name, same as `Video` above: the default `.`/`./preact` export is comet-safe —
  an already-absolute `src`/`sources[].src`/`placeholder` works as-is; a relative one is left
  exactly as given, never resolved against a manifest — while `@zanix/space-ui/runtime/image`
  auto-resolves a relative path through `@zanix/space`'s own `resolveAssetHref` (SSR-only, not
  comet-safe, unchanged from every prior version of this component). `resolveHref` is an optional,
  injected parameter on the shared `render.ts` factory — this is what makes both forms possible from
  one implementation — see `Image/render.ts`'s own doc for the full set of design decisions behind
  this component.
- ✅ **`ProgressBar`** — a determinate (`timeout`) or indeterminate loading indicator, two nested
  elements (track + fill) with no animation of its own: real CSS in this package's optional
  `shared/behavior.css` scaffold drives it, keyed off `data-space-ui="progress-bar"` and the fill's
  `data-timeout`/`--space-ui-progress-duration` — with zero CSS applied, it's valid, inert,
  correctly sized markup, the same "headless until styled" posture every other component here has.
  Decorative (`aria-hidden`) by default, same convention `Icon.label` establishes; passing `label`
  switches it to `role="progressbar"` with declared `aria-valuemin`/`aria-valuemax` bounds —
  `aria-valuenow` is never set, since a CSS-only animation has no discrete value to report at any
  instant.
- ✅ **`Grid`/`GridItem`** — a real `display: grid` container plus its cell primitive.
  `templateColumns`/`templateRows` accept a number (`repeat(n, 1fr)`), an array of track sizes, or
  any raw CSS track-list string; `columnStart`/`columnEnd`/`rowStart`/`rowEnd` map straight onto the
  real CSS grid-line properties, identically on both axes, with no offset applied to either — pass
  the real CSS grid line number directly. `children` are trusted to be `GridItem` elements at the
  type level, with no runtime check. Preact's serializer appends an invalid `px` suffix to a bare
  number in `GridItem`'s style object for these specific properties (React's does not) — every
  grid-line value is stringified first to avoid it in both renderers.
  `data-space-ui="grid"`/`"grid-item"` on their respective roots; a consumer wanting a cell's own
  children to size directly against the grid (rather than through a wrapping box) adds a single
  declarative `[data-space-ui="grid-item"] > * { display: contents; }` rule — no JavaScript.
- ✅ **`Card`** — a title/subtitle/content/footer/visual composition built entirely on `Grid` and
  `Link` — no duplicated link-rendering logic. Stacked (mobile) vs. side-by-side (desktop, ≥721px)
  is resolved entirely by an optional CSS file (`shared/card.css`) — `Card` itself runs no viewport
  detection of any kind and renders one fixed structure either way, in the correct order (title,
  subtitle, content, footer, visual) with or without that CSS loaded. `visual?: () => Node` is a
  render-prop slot — the caller supplies an already-built element (their own `Image` instance, a
  plain `<img>`, anything), never a data shape this component resolves itself; `image` is
  convenience sugar on top for the common case (an `Omit<ImageProps, 'alt'>` shape) — internally
  builds `Image({ ...image, alt: '' })` using the comet-safe, root-barrel `Image` (never the
  `./runtime/image` subpath's auto-resolving one, so a relative `image.src` is left unresolved), and
  loses to `visual` when both are given. Either way, this component's own module stays free of any
  `@zanix/space` dependency (see [Design principle](#design-principle)). `align: 'left' | 'right'`,
  its own top-level prop (Card's own layout concern, never really the visual's own), controls which
  column it sits in once side-by-side; `stacked?: boolean` overrides the automatic choice at every
  viewport when set, via `data-align`/`data-stacked` on the root — the media query, `align`, and
  `stacked` variants all resolve purely through CSS `grid-template-areas` (the one grid property
  `Grid` itself never sets inline), so nothing here ever needs `!important` to win. See
  `Card/render.ts`'s own doc for the full mechanism, including why `Grid`/`GridItem` needed zero
  changes to support it.
- ✅ **`ImgButton`** — a labeled `Icon` or caller-supplied visual composed onto either a real `Link`
  (`href` given) or a real `Button` (no `href`), never a new interactive-element implementation of
  its own. `onClick` works on either branch; `label` is the one accessible name on the interactive
  element — the inner `Icon`/visual/`image` is always decorative. `icon` reuses `IconProps`
  verbatim, so every capability `Icon` already has carries over with no duplicated logic;
  `visual?: () => Node` is a render-prop slot for anything else (an already-built `Image` instance,
  a plain `<img>`, anything); `image` (an `Omit<ImageProps, 'alt'>` shape) is convenience sugar on
  top, building `Image({ ...image, alt: '' })` via the comet-safe, root-barrel `Image` (a relative
  `image.src` is left unresolved there — an already-absolute URL works as expected). Precedence when
  more than one is given: `icon` → `visual` → `image`. Composing `Image` this way is what keeps this
  component's own module free of any `@zanix/space` dependency, since `Image/render.ts` no longer
  hardcodes that import (see [Design principle](#design-principle)). An optional `caption` renders
  as a trailing `<span>`. No wrapping element of its own — the root **is** the `Link` or `Button`.
- ✅ **`Counter`** — a number that animates from `0` up to `target` the first time it becomes
  visible, and never again (`IntersectionObserver`, `threshold: 0.05`, disconnected after the first
  intersection). This package's first component with real interactive state — a full, independent
  React/Preact implementation, not a shared factory. Before intersecting (including the entire SSR
  markup), the animated number is simply absent; the root's `aria-label` carries the exact final
  value from the very first render regardless, so an assistive-technology user or a crawler always
  gets the real number. The animated text itself is `aria-hidden`, never a live region — a
  fast-changing number is a poor `aria-live` candidate. Interpolates linearly and always lands on
  `target` exactly, decimals included, on the last frame. Never calls `toLocaleString()` — an
  optional `format?: (value: number) => string` (default: plain `String`) formats both the animated
  value and the fixed accessible name identically, so this component's own output never silently
  depends on the server or browser's ambient locale. Changing `target`/`duration` mid-animation, or
  unmounting, always cancels the exact `requestAnimationFrame` in flight — never a competing
  animation loop.
- ✅ **`Menu`** — a `<nav>` navigation list, each item optionally a disclosure trigger for a nested
  submenu, to any depth. The WAI-ARIA Disclosure Navigation pattern — plain `<nav><ul><li><a>`,
  never `role="menu"`. `toggle` is a plain boolean; `Menu` reads no viewport/breakpoint/hydration
  state of any kind — the caller decides whether the whole menu sits collapsed behind its own toggle
  button. An item with both a `url` and a `submenu` gets two separate controls (a real navigable
  `Link`, plus a bare disclosure `Button` with its own `aria-expanded`/`aria-controls`) rather than
  one control doing both. `openMode`: `'onClick'` (default), `'onHover'` (opens on hover OR keyboard
  focus — never mouse-only), or `'onRender'` (always expanded, no trigger). Every open submenu is
  independent — opening one never closes a sibling — and closes on its own trigger, outside click,
  or `Escape` (closing only the innermost open level and returning focus to the control that opened
  it). This package's second component with real interactive state, after `Counter` — a shared
  `render.ts` factory (`createMenu(h, hooks, Fragment)`) composing the already-built
  `Link`/`Button`/`Icon`. Each item's decorative visual is `icon` (`IconProps`, wins when both are
  given) or a `visual` render-prop (an already-built element the caller supplies — their own
  `Image`/`ImgButton` instance, a plain `<img>`, anything) — never `Image`/`ImgButton` composed
  internally, which is what keeps this component's own module free of any `@zanix/space` dependency
  (see [Design principle](#design-principle)).
- ✅ **`Slider`** — a carousel: one slide visible at a time, advanced by arrows, dots, keyboard, or
  autoplay. The WAI-ARIA Carousel pattern — `role="region"` + `aria-roledescription="carousel"` —
  never `role="slider"` (a single-value range-input widget role, not a carousel's), and a fixed
  `tabIndex={0}`, never the current slide index. A visited slide never remounts while it stays
  cached (up to 10 slides at once, oldest-visited evicted first) — a real, tested capability. Each
  cached slide carries the native `hidden` attribute rather than an inline style, so switching is
  correct and instant with zero optional CSS; an optional stylesheet can override `[hidden]` on
  `[data-space-ui="slider-item"]`/`[data-active]` for a real crossfade. `loop` and
  `autoPlayInterval` are independent props — `autoPlayInterval` alone stops at the last slide; with
  `loop`, it wraps around continuously. Autoplay pauses via an explicit, accessible `Button` (its
  own accessible name changes between "Pause"/"Play slideshow"); hovering is a real, kept complement
  but can never override a manual pause. `ArrowLeft`/`ArrowRight` navigate while the carousel has
  focus. Each dot gets its own accessible name and `aria-current` on the active one. A
  visually-hidden live region announces the current slide, silenced (`aria-live="off"`) while
  autoplay is actively advancing to avoid announcement spam. No shared store — plain local state per
  instance, the same `useState`-based pattern as `Counter`/`Menu`.

- ✅ **`Modal`** — a dialog: `role="dialog"` + `aria-modal="true"`, a focus trap, `Escape`, an
  accessible close button, and correct stacking with several open at once — declarative by default
  (`<Modal open onClose>`, visibility owned by whoever renders it, no extra infrastructure), with
  `ModalProvider`/`useModal` as an explicit opt-in for triggering one from an arbitrary depth. Both
  modes render the exact same `Modal`, so nothing about focus management, the backdrop, `Escape`,
  positioning, or accessibility is duplicated between them; `ModalProvider` is plain `useState` +
  `Context`, the same shape `IntlProvider` already uses in this package — never Zustand. No portal —
  `position: fixed` plus a high `z-index` (Preact core has no `createPortal`; building one only for
  React would be asymmetric complexity without a real consumer needing it). `showOverlay` (default
  `true`) decides backdrop and outside-click-closes together, not as two separate props: a backdrop
  absorbs outside clicks, no backdrop means an outside click closes it. An accessible name
  (`label`/`ariaLabelledBy`) is required by the type but only warned about at runtime if skipped — a
  real accessibility gap, not a structural error worth throwing over. On open, focus moves to the
  dialog's first real content control (deliberately skipping its own close button as the _initial_
  target, to avoid an accidental dismiss from a reflexive Enter/Space — the close button is still
  reachable via `Tab`), and returns to whatever had it once the topmost modal closes. With several
  modals open, only the topmost traps `Tab`/reacts to `Escape`; the page's scroll stays locked,
  restored to its exact prior value, only once the last one closes — via a small module-level stack,
  not a store. The close button's own visible content is a real inline "X" `<svg>` by default — not
  a Unicode character (inconsistent glyph rendering across platforms) and not a bundled
  `CatalogIcon` call (its sprite is a consumer-scaffolded template asset this component has no
  `href` for) — overridable per-instance via `closeButtonContent`, for a consumer with an icon
  system of their own; `aria-label="Close"` stays the accessible name either way.
- ✅ **`Showcase`** — `children` grouped into pages of `itemsPerSlide`, each page one `Slider`
  slide; nothing else — every one of `Slider`'s own capabilities (loop, autoplay, dots vs. arrows,
  keyboard, accessible structure) is available here unchanged through a `slider` passthrough prop.
  `itemsPerSlide?: number | Record<number, number>` — a `Record`'s keys are `ResizeObserver`-
  measured width thresholds of THIS component's own rendered container, never the viewport, so it
  stays correct even when Showcase isn't rendered full-width (a sidebar, a modal, a narrower
  column). Mobile-first: the largest threshold that still fits wins; below every one, the smallest
  threshold's own value applies — the same value used before any real measurement exists at all, so
  SSR and the very first client paint are byte-identical by construction, never a `window`/
  `matchMedia` read during render. `ResizeObserver` stays private to this component — no second real
  consumer exists yet for "track my own container's width" as a standalone primitive. `Slider`
  itself handles a shrinking `children` array correctly (any consumer regrouping its own children
  live, not just this one): `currentIndex` never points past the end — the user's position is
  preserved as exactly as it still can be, never reset to the first slide.

- ✅ **`Disclosure`** — the WAI-ARIA Disclosure (Show/Hide) pattern: a
  `<button aria-expanded
  aria-controls>` toggling a region's visibility, `hidden` (not unmounted)
  when closed so the content stays crawlable and any interactive state inside it survives a
  close/reopen. Controlled (`open`/`onOpenChange`) with an uncontrolled `defaultOpen` fallback, same
  shape as every other stateful component here. Deliberately not built on native
  `<details>`/`<summary>` (its `toggle` event isn't cancelable, so it can't be reliably controlled)
  — see `Disclosure/index.ts`'s own doc for the full reasoning, including why `trigger` is content
  for a button this component owns, never a pre-built element.

- ✅ **`Accordion`** — a list of `Disclosure` sections with one component coordinating which are
  open: data-driven (`items: AccordionItem[]`, same shape `Menu.items` already establishes),
  single-open by default or `multiple` for several at once, controlled (`openItems`/
  `onOpenItemsChange`) with an uncontrolled `defaultOpenItems` fallback. Composes `Disclosure`
  directly rather than duplicating its markup or behavior — every section is a real, independent
  `Disclosure`, coordinated purely by which one's `open` this component currently passes it. No
  extra keyboard handling: the optional WAI-ARIA arrow-key-between-headers enhancement isn't
  roving-tabindex in the strict sense (headers stay individually `Tab`-reachable), so it's left out
  until a concrete shape motivates it.

- ✅ **`RadioGroup`** — a single-select set of `Button`s wired as the WAI-ARIA radiogroup pattern:
  `role="radiogroup"` wrapping `role="radio"` items, roving tabindex (arrow keys move — and
  immediately select — the focused item; only the selected one, or the first when nothing's selected
  yet, sits in the normal `Tab` sequence). Data-driven (`items: RadioGroupItem[]`), controlled
  (`value`/`onValueChange`) with an uncontrolled `defaultValue` fallback. The same shape also
  correctly covers a visually segmented single-select control — no separate component for that,
  since ARIA cares about the logical relationship, not the styling. Deliberately does NOT cover a
  multi-select toggle group (independently-pressable buttons, `aria-pressed` rather than
  `aria-checked`, no roving tabindex at all) — a genuinely different widget, out of scope until
  something needs it.

- ✅ **`Tabs`** — the WAI-ARIA Tabs pattern: `role="tablist"` wrapping `role="tab"` items, roving
  tabindex with the same "arrow keys select immediately" automatic-activation behavior `RadioGroup`
  already uses, exactly one `role="tabpanel"` rendered at a time. Data-driven
  (`items:
  TabItem[]`), controlled (`value`/`onValueChange`) with an uncontrolled `defaultValue`
  fallback — unlike `RadioGroup`, defaults to the first item when nothing's selected, since an empty
  tablist shows no panel at all rather than a legitimate empty state.

- ✅ **`VisuallyHidden`** — hides content visually while keeping it announced to assistive
  technology, via the same clip-and-collapse technique `shared/live-region.ts`'s own
  `VISUALLY_HIDDEN_STYLE` already applies inline for live announcements — broader use than that one
  case (an icon-only control's accessible label spelled out as real text, a skip link's
  destination). Stateless, same `render.ts` factory pattern `Icon` already establishes.

- ✅ **`Alert`** — a persistent, VISIBLE inline message banner: `role="alert"` (default) or
  `role="status"` via `politeness` — both implicit live regions on their own, no explicit
  `aria-live` needed. Resolved to one component rather than two (`Alert`/`InlineNotice`), since the
  one real semantic distinction is a single prop. No severity/`variant` prop — purely visual, zero
  ARIA backing, already achievable via `className`. Deliberately doesn't reuse
  `VISUALLY_HIDDEN_STYLE` — this is a banner meant to be seen, not an announcement-only region.

- ✅ **`Pagination`** — Previous/Next plus a windowed sequence of page numbers, the current one
  marked `aria-current="page"`. Never constructs a URL itself — `getPageHref?` is the caller's own
  function; page items render as real `Link`s when given, plain `Button`s otherwise. A boundary
  (page 1 or the last page) omits Previous/Next from the DOM entirely rather than rendering a
  "disabled link" — a real anchor has no coherent disabled state. Controlled (`page`/`onPageChange`)
  with an uncontrolled `defaultPage` fallback.

- ✅ **`Skeleton`** — a pending/loading placeholder: childless, no width/height/shape/animation of
  its own (purely visual, fully achievable via `className`). Decorative (`aria-hidden`) by default;
  `label` switches it to an accessible `role="status"`.

- ✅ **`Drawer`** — an edge-anchored off-canvas panel: `role="dialog"` + `aria-modal="true"` (the
  WAI-ARIA APG has no separate "drawer" pattern — this IS a dialog, just anchored to `side`
  (`'left'`/`'right'`/`'top'`/`'bottom'`, no default — the caller always makes that call explicitly)
  instead of centered). Composes the exact same focus-trap/`Escape`/backdrop primitives `Modal`
  does, and genuinely shares `Modal`'s own overlay-stacking coordination — a `Drawer` and a `Modal`
  open at once correctly defer to whichever is truly topmost, regardless of kind. Same close-button
  default/override contract as `Modal`'s own (`closeButtonContent`).

- ✅ **`Field`** — a labeled form-field wrapper: a `<label>`, the caller's own input, an optional
  hint, and an error message, correctly cross-referenced via `aria-describedby`/`aria-invalid`.
  `error?: string | string[]` takes already-resolved message(s) — deliberately never
  `@zanix/space`'s own `PageFieldErrors` shape, extracting the real message(s) for one field stays
  the caller's own job. The one component in this package whose `children` is a render-prop
  (`(fieldProps) => ...`) rather than plain content — `Field` has to ARIA-wire an arbitrary native
  form control it doesn't render itself, which `cloneElement` can't do safely. Composes `Alert` for
  the error message rather than reimplementing `role="alert"`.

- ✅ **`Input`** — a thin, accessible wrapper around a native `<input>`
  (`text`/`email`/`password`/`number`/`tel`/`url`/`search`); `placeholder`/`disabled`/`readOnly`/
  `required`/`autoComplete`/`min`/`max`/`step`/`maxLength`/`pattern`/`name` all pass straight
  through, no reimplementation of `<input>`'s own contract — `name` is what lets a plain
  `<form method="post">` submit actually collect this field into `FormData(form)`. Controlled
  `value`/`onValueChange` with an uncontrolled `defaultValue` fallback. Accepts exactly the props
  `Field`'s own render-prop hands back (`id`/`aria-describedby`/`aria-invalid`), so spreading them
  straight onto `Input` is the whole integration when composing inside `Field` — a bare `Input` with
  no `Field` around it is just as legitimate.

- ✅ **`FileInput`** — a thin wrapper around a native `<input type="file">`, a genuinely different
  shape from `Input`, not a `type` variant of it: browsers never let a script set `.value`/`.files`
  to a specific selection, so the usual controlled `value`/`onValueChange` contract doesn't apply.
  `onFilesChange` always fires a real `File[]` (converted from the native `FileList`);
  `accept`/`multiple`/`capture`/`name` pass straight through (`name` is what lets a plain
  `<form method="post">` submit actually collect the selection into `FormData(form)`). No
  add/remove-file UI, no upload progress, no preview — real, consumer-side composition territory.
  `resetTrigger` (changed to force the one native mutation a script CAN make — clearing the
  selection) reuses the same shape `Recaptcha`/`HCaptcha`/`Turnstile`'s own `resetTrigger` already
  established for an analogous platform constraint.

- ✅ **`ToastProvider`/`useToast`** — imperative toast notifications: `showToast(message)`/
  `closeToast(id)`, plain `useState`+`Context` like `ModalProvider` (never Zustand). Always-present
  close button, no default `timeout` (never auto-dismisses unless given one), upsert-by-`id`
  semantics. Cleanup uses a real `clearTimeout`, matched to the `setTimeout` that scheduled the
  auto-dismiss; every toast composes `Alert` for its own message, so the toast region always carries
  a real `role`/`aria-live`. `position` is set per-`ToastProvider` rather than per-toast, since
  per-toast positions don't compose correctly with genuine stacking. Same close-button
  default/override contract as `Modal`'s own, per-toast via `ToastMessage.closeButtonContent`.

- ✅ **`Popover`** — a floating panel anchored to a `trigger`, positioned via `computePosition`/
  `usePosition`. `trigger` is a render-prop (`(triggerProps) => ...`), the same shape
  `Field.children`/`Tooltip.trigger` use — but no `ref` crosses the boundary: the trigger element is
  found by querying a plain owned wrapper's `firstElementChild`. Non-modal (no focus trap), closes
  on outside click or `Escape` (refocusing the trigger), unmounts when closed. No portal —
  `position: fixed` is viewport-relative in the common case, and Preact core has no `createPortal`
  at all.

- ✅ **`Tooltip`** — a short, ambient description shown on hover or focus of a `trigger`, also built
  on `computePosition`/`usePosition`. Unlike `Popover`, always mounted (never unmounted) — the
  WAI-ARIA APG's own reference tooltip pattern keeps the node present so the trigger's
  `aria-describedby` never dangles; only `visibility` toggles. Every trigger event
  (`mouseenter`/`mouseleave`/`focus`/`blur`) is spread directly onto the caller's own element, never
  a wrapper — none of the four bubble natively. Optional `openDelay`/`closeDelay` (default `0`)
  debounce mouse hover only; keyboard focus/blur always open/close instantly, no artificial delay.
  `Escape` closes it via a document-level listener rather than the trigger's own `onKeyDown`,
  because the trigger might not hold real focus at all (a hover-only open) — a `Popover`-style
  refocus-on-close would fire a spurious `focus` event and immediately reopen it.

- ✅ **`Combobox`** — a text input paired with a filterable listbox, the heaviest of this package's
  interactive components. The WAI-ARIA 1.2 single-input pattern: `role="combobox"` lives on the real
  `<input>` itself. Real DOM focus never leaves the input — `aria-activedescendant` tracks the
  highlighted option instead of roving tabindex, calling `shared/roving-focus.ts`'s own
  `getNextRovingIndex` directly rather than `createRovingKeyDownHandler` (which moves real focus —
  wrong here on purpose). `options` is never filtered internally — the caller already owns
  `inputValue` and decides what counts as a match, same "presents data, never owns it" seam every
  component here keeps. No `trigger` render-prop unlike `Popover`/`Tooltip` — the input isn't
  arbitrary caller content, so this component owns and renders it directly.

- ✅ **`Select`** — a single-select dropdown: a trigger `Button` showing the current selection,
  opening a positioned popup (`role="listbox"`/`role="option"`) — the WAI-ARIA "Collapsible Dropdown
  Listbox" pattern, genuinely different from `Combobox`'s own `role="combobox"` pattern (no
  free-text filtering, the trigger is a real `<button>`, never a text input). Beyond this package's
  original 14-component build plan — added once a concrete need for it existed, the "future
  menu-button dropdown" `docs/architecture.md`'s own `roving-focus.ts` row already anticipated. The
  trigger composes `Button` verbatim (inherits `data-space-ui="button"`, no redundant hook); the
  listbox/options carry `"select-listbox"`/`"select-option"`, the same naming convention `Combobox`
  already established. Real focus moves onto the listbox itself on open (via an effect),
  `aria-activedescendant` tracks the current option (`shared/roving-focus.ts`'s own
  `getNextRovingIndex`, called directly), and arrow keys commit the selection immediately —
  automatic activation, the same convention `RadioGroup`/`Tabs` already use, unlike `Combobox`'s own
  manual Enter-to-commit (nothing here types, so there's no separate not-yet-committed highlight to
  maintain). Disabled options are skipped entirely during arrow navigation. Controlled
  (`value`/`onValueChange`, `open`/`onOpenChange`) with uncontrolled `defaultValue`/`defaultOpen`
  fallbacks, same shape as every other stateful component here. No `aria-describedby`/`aria-invalid`
  passthrough in this first version — `Button`'s own closed prop API has no such passthrough today;
  a disclosed, not guessed-at, scope limit, same spirit as `Combobox`'s own `noOptionsMessage`
  omission.

- ✅ **`RichText`** — renders ICU rich-text content (the default) or literal Markdown
  (`contentFormat: 'markdown'`) into real component output, built on `useIntl().formatRichText` —
  the same native `@formatjs/intl` mechanism, exposed directly, rather than a hand-rolled tag
  parser. Population (a `<props>key=val</props>` tag nested inside any other tag, handing it extra
  props) works via a typed sentinel value, never a stringified-marker round-trip. `video` renders
  through the real `Video` component. Markdown parses through `markdown-to-jsx`'s own pure AST-only
  subpath, walked by hand via `h` — zero `preact/compat` involved, enforced by a dependency-boundary
  test. Document loading is a standalone `resolveRichTextDocument` resolver a `loader` calls,
  mirroring `StructuredData`'s own resolver precedent, rather than a prop on the component itself.
  See [CHANGELOG](./CHANGELOG.md) for the full design record.

- ✅ **`Recaptcha`**/**`HCaptcha`**/**`Turnstile`** — the client-side complement to `@zanix/auth`'s
  own `captchaGuard`; this package never imports `@zanix/auth` or mentions
  `CAPTCHA_TOKEN_HEADER`/`X-Znx-Captcha-Token` in real code — each component's own JSDoc mentions it
  only as a usage example, transporting the token to your backend stays entirely your own call.
  Three separate components, not one with a `provider` prop — each provider ships its own real
  client-side JS runtime, so using only one never pulls the other two providers' glue code into your
  bundle. All three share one internal script-loading primitive: a `<script src>` is injected at
  most once per distinct URL, deduped across every widget of the same provider/mode on the page.
  Same API shape throughout: `onVerify(token)` (a plain callback, `IFrame.onLoad`'s idiom, never a
  ref), `verifyTrigger`/`resetTrigger` (change either to force an explicit
  re-verification/`.reset()` — needed for `Recaptcha`'s invisible/v3 modes, `HCaptcha`'s invisible
  mode, and `Turnstile`'s `appearance="execute"` mode, where no checkbox exists to click),
  `onExpire`/`onError` (mapped to each provider's real `expired-callback`/`error-callback` —
  `onError` also fires, separately, for a `<script>` load failure, network or CSP block, so a caller
  always gets a real signal even when the provider's own SDK never loads at all). `action` (v3
  scoring) exists only on `Recaptcha` — neither hCaptcha nor Turnstile has an equivalent
  scoring-only mode. `size` (`Recaptcha`/`HCaptcha`) and `appearance` (`Turnstile`'s own real option
  name) are each a shared, publicly-exported type (`CaptchaWidgetSize`/`TurnstileAppearance`), not
  an inline union repeated per component. `scriptSrc?: string` (all three) overrides the default
  script URL verbatim — a self-hosted/proxied mirror, reCAPTCHA Enterprise's own different endpoint,
  or a test double; still deduped the same way the default URL is. The first render — server or
  client, before mount — is always the same inert, empty container, satisfying this package's own
  seam 6; the real `<script>` injection and widget render both happen post-mount. See each
  component's own JSDoc for the CSP gotcha in a `@zanix/space` app (the zero-config default blocks
  every provider's script and challenge iframe) and a real end-to-end usage example.

- ✅ **`Table`** — the only genuinely new component `@zanix/console`'s architecture requires: a
  headless `<table>` over caller-resolved `columns`/`rows`, generic over the caller's own row shape.
  No fetch, no router calls, no form state — this package presents data, it never owns it.
  Controlled `sort`/`onSortChange` (with an uncontrolled `defaultSort` fallback) mirrors
  `Pagination`'s own `page`/`onPageChange`/`defaultPage` shape exactly — a sortable header's click
  only computes the next sort state and hands it back, never applying it to `rows` itself, which
  stays entirely your own job. `getRowHref?: (row, index) => string` mirrors
  `Pagination.getPageHref` — when given, each row's first column renders wrapped in a real,
  navigable `Link` instead of plain content; there's no "`Button` otherwise" fallback the way
  `Pagination` has for its own page items, since a table row has no native interactive-control
  equivalent. A sortable column's header carries the real `aria-sort` attribute rather than a
  hand-rolled indicator. `caption` renders as a real `<caption>` — the WCAG-preferred accessible
  name for a data table; `emptyState` renders as a single row spanning every column when there are
  no rows to show.

- ✅ **`NavDrawer`** — a ready-made, hamburger-triggered navigation drawer, shipped as a real
  `'use comet'` Comet (`@zanix/space/comet`'s `defineComet`) — import from
  `@zanix/space-ui/runtime/nav-drawer`/`@zanix/space-ui/runtime/nav-drawer/preact`, not the default
  barrel, and not a shared `./runtime` barrel either (removed — see the
  [CHANGELOG](./CHANGELOG.md)). Composes the toggle `Button`, the sliding `Drawer` (`side` defaults
  to `'left'`, unlike bare `Drawer`'s own no-default), and `Menu` (`toggle: false`, always rendered
  — `Drawer` itself is what's shown or hidden) — inherits every one of their own `data-space-ui`
  hooks, adds none of its own. Its own `items: NavDrawerItem[]` deliberately omit `Menu`'s own
  `visual` render-prop: a Comet's props cross the server/client boundary as plain JSON, and a
  function isn't JSON-serializable, so `icon` (already-JSON `IconProps`) is the only
  decorative-visual path available here. Always uncontrolled — no `open`/`onOpenChange` escape
  hatch, for the same JSON-boundary reason — and closes itself automatically the instant a real
  navigation link inside it is clicked, plain DOM click delegation, never a router/URL read.

All thirty-nine ship for **both React and Preact** (see [Installation](#installation)).

Also included, though not a rendering component: **`IntlProvider`/`useIntl`/`createFormatter`** —
this package's own ICU message-formatting runtime (`formatMessage(id, values)` for plain messages,
`formatRichText(id, tags, values)` for ICU rich-text tags — `RichText`'s own foundation, usable
standalone too), with independent React and Preact implementations. See the
[CHANGELOG](./CHANGELOG.md) for the full contract.

Document `<head>`/meta/SEO management (title, meta tags, canonical/hreflang links, sitemap, robots)
is intentionally out of scope for this package — `@zanix/space` already owns it architecturally
(`HeadDescriptor`/`resolveHead()`, a page's own `static head`, `layout.tsx`'s `head` export, plus
`buildCanonicalLink`/`buildHreflangLinks`/sitemap/robots helpers), resolved as plain data before
render starts so it works correctly under streaming SSR. See `@zanix/space`'s own documentation for
that API.

## Design principle

Every component but one takes already-resolved data as props — a URL, a label, a `viewBox` — never a
"source name" or an i18n key it resolves itself. This package doesn't know how a consuming app
serves assets, translates strings, or manages responsive breakpoints; those stay the app's own
concern (or `@zanix/space`'s, once it has them). That keeps `@zanix/space-ui` genuinely optional and
versioned independently of the rendering engine it's meant to sit on top of — an app can use
`@zanix/space` without ever installing this package.

The exceptions are `RichText` and `NavDrawer`: `RichText` resolves a relative asset path embedded in
its own dynamic, caller-uncontrolled content through `@zanix/space`'s own `resolveAssetHref`
directly (`resolveRichTextDocument`, plus its own `img`/`video` tags injecting the same resolver
into `Image`/`Video`'s shared `render.ts`) — there's no single prop a caller could pre-resolve the
way a plain `src` prop allows; `NavDrawer` is a real Comet, importing `@zanix/space/comet`'s own
`defineComet` directly. Because of that real runtime dependency, each is exported from its OWN
`./runtime/<name>`/`./runtime/<name>/preact` subpath (`./runtime/rich-text`, `./runtime/nav-drawer`)
instead of the default `.`/`./preact` barrel — never a shared combined `./runtime` barrel either
(removed; see the [CHANGELOG](./CHANGELOG.md) for the exact import paths and why one subpath per
component, rather than a shared one, is what actually closes the underlying bug).

`Video`/`Image` are a narrower case: `resolveAssetHref` is an OPTIONAL, injected parameter on their
shared `render.ts` factories now, not a hardcoded import, so each ships in TWO forms under the SAME
name — the default `.`/`./preact` barrel (comet-safe, no resolver injected, an already-absolute
`src`/`poster`/`sources[].src`/track `src` works as-is, a relative one is left unresolved) and
`./runtime/video`/`./runtime/image` (the `/preact` variant alongside each — `resolveAssetHref`
injected, auto-resolving, SSR-only, byte-for-byte unchanged from every prior version of either
component). `Video`'s own `@zanix/space/video-source` classification dependency stays real and
unconditional in BOTH forms — it's core logic every branch needs, not an asset-resolution nicety,
and it's genuinely safe for a Comet (no `'server-only'` directive, confirmed by reading the module
directly). `Menu`, `ImgButton`, and `Card` each compose only zero-`@zanix/space`-dependency
components internally via their own `visual` render-prop — `ImgButton`'s and `Card`'s own `image`
convenience prop composes the comet-safe, root-barrel `Image` (never `./runtime/image`'s
auto-resolving one), which is what keeps them dependency-free despite composing `Image` at all — so
all three ship from the default barrel, alongside every other dependency-free component.

**React and Preact both work, with no `preact/compat` shim.** A presentational component with no
per-renderer hook usage has its real logic written once against `React.createElement`/`Preact.h`'s
shared call signature — never JSX, never a runtime "which renderer am I" check — then bound to each
renderer exactly once. A component with real interactive state won't fit that pattern and will ship
as a genuine second implementation instead, mirroring how `@zanix/space` itself splits its own
React/Preact render paths.

## Styling

No CSS ships with this package, and none is planned as a default — no seeded palette, no BEM/utility
classes, no bundled stylesheet of any kind. Every component takes an optional `className`, forwarded
verbatim, plus a stable (but inert) `data-space-ui="..."` selector hook on its root element — how it
looks is entirely the consuming app's decision, using whatever it already uses (`@zanix/space`'s own
`--space-*` semantic tokens, Tailwind, CSS Modules, vanilla-extract, plain CSS). BEM and Tachyons
are not part of this package's implementation or contract — see
[`docs/styling.md`](./docs/styling.md) for the full reasoning, the `theme/`/`shared/` starter
templates, and exactly what "replacing styling completely" means here. The one optional default
resource is a curated icon catalog (`CatalogIcon`, above) — see [`docs/icons.md`](./docs/icons.md).

## Installation

```ts
// React (default)
import { Icon } from 'jsr:@zanix/space-ui@[version]'

// Preact — same props, same markup
import { Icon } from 'jsr:@zanix/space-ui@[version]/preact'
```

## Basic Usage

```tsx
import { Icon } from 'jsr:@zanix/space-ui@[version]'

function NextButton() {
  return (
    <button>
      Next{' '}
      <Icon
        name='arrow-right'
        href='/assets/icons/sprite.svg'
        viewBox='0 0 24 24'
      />
    </button>
  )
}
```

`href` is whatever URL your app already serves the sprite at — with `@zanix/space`, that's typically
a file under `assetsDir`, served at `/assets/<path>` (see `@zanix/space`'s own documentation for
that mechanism).

## Documentation

- [`docs/styling.md`](./docs/styling.md) — why this package ships no default CSS/theme, the
  `data-space-ui` hooks, the `theme/`/`shared/` starter templates, and why BEM/Tachyons aren't part
  of it.
- [`docs/icons.md`](./docs/icons.md) — the optional default icon catalog: `CatalogIcon`,
  `catalog.svg`, its license/attribution, and its independence from any visual theme.

Contributors: see `docs/architecture.md` in this repo (excluded from the published package — an
internal architecture/roadmap record, not consumer documentation) for the ownership boundary this
package keeps against `@zanix/space`/the application, and which internal primitives are reserved for
future interactive-page components.

## Changelog

For a detailed list of changes, refer to the [CHANGELOG](./CHANGELOG.md).

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for more
details.
