# Styling

`@zanix/space-ui` ships no CSS, and none is planned as a default. Every component here is headless
by design — it renders markup and takes an optional `className`; how it looks is entirely up to the
consuming app. This document explains that architecture, why the legacy `react-components` library's
BEM + Tachyons system isn't part of it, and what the two optional starter templates (`theme/`,
`shared/`) do and don't couple you to.

## Headless by default

No component imports a stylesheet, generates a class name, or assumes any styling tool is present.
`className?: string` is the one styling prop every component accepts, forwarded verbatim to its root
element — never merged with, or replaced by, anything this package authors itself. A consuming app
styles `Button`/`Icon`/`Link`/`SocialNetworks` with whatever it already uses: Tailwind, CSS Modules,
vanilla-extract, plain CSS, or nothing at all.

This isn't a temporary gap waiting to be filled — it's the permanent architecture. See
[`docs/icons.md`](./icons.md) for the one optional exception (a default icon catalog), which is
still `className`/CSS-free from the component's own point of view.

## Functional positioning under a strict CSP: `nonce`

`Modal`, `Drawer`, `Toast` (via `ToastProvider`), `Tooltip`, and `Popover` each need real
`position`/`z-index` (and, for `Modal`/`Drawer`/`Toast`, a per-instance anchor) to actually function
as an overlay — see `Modal/types.ts`'s own doc on `MODAL_POSITION_STYLE` for why this is treated as
functional, not decorative, the same footing as `Slider`'s visually-hidden live region. Applying
that as an inline `style` attribute is a real, confirmed-in-browser violation of a nonce-based
`style-src` Content-Security-Policy (`@zanix/space`'s own zero-config default is exactly this shape)
— a CSP nonce never applies to a `style="..."` attribute, only to a `<style>`
element/`<link
rel=stylesheet>`. All five components instead render their own
`<style nonce={nonce}>` element, built once at module scope from the same style-object constants
they always used (`MODAL_POSITION_STYLE`/`MODAL_Z_INDEX`/`DRAWER_SIDE_STYLE`/`DRAWER_Z_INDEX`/…),
keyed off `data-space-ui`/`data-position`/`data-side` attribute selectors — see
`shared/overlay-position-css.ts` for the shared CSS-building helper, and each component's own
`nonce?: string` prop doc for the per-component contract. Pass the consuming page's own real CSP
nonce as that prop; omit it entirely when no such CSP is in effect — nothing else changes either
way.

**`Tooltip`/`Popover`'s own genuinely dynamic positioning is covered too**, not just the static
part: their panel position — a `transform: translate(x, y)` (plus `visibility`/`pointerEvents`)
computed fresh every render from a real `usePosition` measurement — can't be expressed as a static
CSS rule the way `Modal`/`Drawer`/`Toast`'s fixed anchor can, so it doesn't use `buildOverlayCss` at
all. Instead it's applied to a CSSOM rule scoped to that one component instance
(`[data-space-ui='tooltip'][data-tooltip-id='...']`/`[data-space-ui='popover'][data-popover-id='...']`),
inserted once (via `sheet.insertRule(...)`) into the SAME `<style nonce={nonce}>` element already
rendering the static rule, then mutated on every position update via
`CSSStyleRule.style.setProperty(...)` — never `HTMLElement.style` (the attribute-backed inline style
object `style-src-attr` actually covers). A CSP nonce authorizes the `<style>` ELEMENT itself once;
CSSOM mutation of a rule already living inside that authorized element is a distinct code path from
mutating an inline `style` attribute, the same technique CSP-compatible CSS-in-JS runtimes
(styled-components "speedy" mode, Emotion) rely on. Applied via `useLayoutEffect` (never a plain
`useEffect`), so the update happens synchronously before the browser paints — a plain `useEffect`
would flash/jump visibly on every `autoUpdate` scroll-driven position update, which fires
continuously while open, not just once at mount. See `shared/overlay-position-css.ts`'s own
`getOrInsertDynamicRule`/`removeDynamicRule` doc for the full mechanism, including cleanup on
unmount/close (`Popover`'s own panel/style element unmount whenever it closes, unlike `Tooltip`'s
always-mounted one, so its insert/cleanup effect is keyed on `open` rather than running once).

**A real, cosmetic-only React hydration warning, and why it's fixed at the `createElement` level,
not in `render.ts`.** A browser clears an applied `nonce` CONTENT ATTRIBUTE back to `""` right after
using it (spec'd behavior — the real value survives only on the element's own `.nonce` property).
React's hydration mismatch check special-cases this for `<script>` (reading `.nonce` instead of the
attribute) but not for `<style>`, so a server-rendered `<style nonce="real-value">` would otherwise
log "A tree hydrated but some attributes of the server rendered HTML didn't match..." on every page
load — confirmed live under `@zanix/space`'s own CSP default; functionally harmless (the nonce still
applies, the CSP still passes), just noisy. `suppressHydrationWarning` fixes it, but it's a
React-only convention Preact's `h` doesn't recognize (it would leak a literal
`suppresshydrationwarning="true"` attribute into Preact's own markup) — so each of the five
components' React binding (`index.ts`, never `index.preact.ts`) passes
`shared/create-element-nonce-hydration-fix.ts`'s `createElementWithNonceHydrationFix` instead of raw
`createElement`, which adds `suppressHydrationWarning` only to a `<style>` element that actually
carries a `nonce` prop key. `render.ts` itself stays exactly as renderer-agnostic as before.

## `data-space-ui` — a stable selector hook, not a styling system

Every component in this package renders (or, composing another component, inherits) a
`data-space-ui="<name>"` attribute — a stable, semver-protected identity hook an _optional_
stylesheet (this package's own scaffolded `theme/`/`shared/` templates, or a consumer's own CSS) can
select against, without resorting to a bare element selector (`button`, `svg`, `a`) that would also
match unrelated markup elsewhere on the page. Audited component by component below:

| Component        | Attribute(s)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Accordion`      | `"accordion"` on the root                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Alert`          | `"alert"` on the root                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `Button`         | `"button"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Card`           | `"card"` on the root, plus `"card-title"`/`"card-subtitle"`/`"card-content"`/`"card-footer"`/`"card-image"` on its own internal wrappers — each of those wrappers is also a real composed `GridItem`, so it carries `"grid-item"` too (composed, not reimplemented); see `Card/render.ts`'s own doc for how `shared/card.css` uses them                                                                                                                                                                                                                                                                                                         |
| `CatalogIcon`    | None of its own — delegates to `Icon` verbatim and inherits its `"icon"`, same markup, nothing duplicated                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Combobox`       | `"combobox"` on the `<input>`, `"combobox-listbox"` on the listbox `<ul>`, `"combobox-option"` on each `<li>`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `Counter`        | `"counter"` on its single root `<span>`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `Disclosure`     | `"disclosure"` on the root                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `Drawer`         | `"drawer"` on the dialog itself, `"drawer-backdrop"` on the backdrop (only rendered when `showOverlay` is true)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `Field`          | `"field"` on the root — the error message composes real `Alert` and inherits its `"alert"` instead of reimplementing it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `Grid`           | `"grid"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `GridItem`       | `"grid-item"` — the intended target for a consumer's own `[data-space-ui="grid-item"] > * { display: contents; }` rule, see `Grid/render.ts`'s own doc                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `HCaptcha`       | `"hcaptcha"` on the widget's own container `<div>` — an inert, empty root until the provider script is ready and renders into it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `IFrame`         | `"iframe"` on the `<iframe>` itself                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `Icon`           | `"icon"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `Image`          | `"image"` (always on the `<img>` itself — never on the `<picture>` wrapper `Image` renders when `sources` is given; see `Image/render.ts`'s own doc for why)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ImgButton`      | None of its own — its root **is** a real `Link` or `Button`, so it already carries whichever of `"link"`/`"button"` that composed root has, nothing added or overridden                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `Link`           | `"link"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `Menu`           | `"menu"` on the root `<nav>`, `"menu-list"` on the top-level `<ul>`, `"menu-item"` on every `<li>`, `"menu-submenu"` on a nested `<ul>` — the disclosure toggle button and top-level toggle button carry `Button`'s own `"button"` instead (composed)                                                                                                                                                                                                                                                                                                                                                                                           |
| `Modal`          | `"modal"` on the dialog itself, `"modal-backdrop"` on the backdrop (only rendered when `showOverlay` is true) — the close button carries `Button`'s own `"button"` instead (composed)                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `Pagination`     | `"pagination"` on the root `<nav>`, `"pagination-list"` on the inner `<ul>` — each page item is a real `Link` (when `getPageHref` is given) or `Button`, inheriting `"link"`/`"button"` accordingly (composed)                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `Popover`        | `"popover"` on the panel only — the trigger is caller-owned content (a render-prop), and carries whatever it itself renders, never a `Popover`-specific hook                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ProgressBar`    | `"progress-bar"` on the track — the first component whose `shared/behavior.css` rules are actually wired to this hook, see below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `RadioGroup`     | `"radio-group"` on the root — each item is a real `Button`, inheriting `"button"` (composed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `Recaptcha`      | `"recaptcha"` on the widget's own container `<div>` — an inert, empty root until the provider script is ready and renders into it (v3/scored mode still carries this hook, even though no widget renders inside it — Google's own badge mounts elsewhere in the page, outside this element)                                                                                                                                                                                                                                                                                                                                                     |
| `RichText`       | `"richtext"` on every plain HTML element it renders directly (`p`, `h1`–`h6`, emphasis/strong/strikethrough, `code`/`pre`, `ul`/`ol`/`li`, `blockquote`, `br`/`hr` — in both ICU and Markdown mode); the `a`/`img`/`video`/`btn`/`icon`/`sn`/`ibtn`/`ifrm`/`sus` tags carry NO `"richtext"` — they already compose a real component and inherit ITS own `data-space-ui` instead (`"link"`, `"image"`, …), same "don't add a second identity on top of a real component's own" rule `CatalogIcon` follows for `Icon`. Overridable per element via `<props>data-space-ui=...</props>`, same last-write-wins contract as any other populated prop. |
| `Showcase`       | No root of its own — composes `Slider` verbatim and inherits its `"slider"` (same convention `ImgButton` uses for `Link`/`Button`); `"showcase-group"` on each per-slide group wrapper. The private `ResizeObserver` measurement wrapper carries no hook at all — deliberately not a public primitive.                                                                                                                                                                                                                                                                                                                                          |
| `Skeleton`       | `"skeleton"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `Slider`         | `"slider"` on the root region, `"slider-track"` wrapping the slides, `"slider-item"` (+ `data-active="true"` on the current one) per mounted slide, `"slider-dots"`/`"slider-arrows"` on the navigation row — arrows/dots/the Pause-Play control carry `Button`'s own `"button"` instead (composed)                                                                                                                                                                                                                                                                                                                                             |
| `SocialNetworks` | `"social-networks"` (on the `<ul>` only)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `StructuredData` | None — renders a `<script>` tag with nothing to style                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `Tabs`           | `"tabs"` on the root, `"tabs-list"`, `"tabs-panel"` — each tab trigger is a real `Button`, inheriting `"button"` (composed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `Toast`          | `"toast-stack"` on the stack container, `"toast"` (+ `data-variant="<variant>"`) on each toast — composes real `Alert` for the message, `Button` for the close button and any extra buttons, and optionally `Icon`/`ProgressBar`, all inheriting their own hooks (composed, not reimplemented)                                                                                                                                                                                                                                                                                                                                                  |
| `Tooltip`        | `"tooltip"` on the panel only — same trigger caveat as `Popover`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Turnstile`      | `"turnstile"` on the widget's own container `<div>` — an inert, empty root until the provider script is ready and renders into it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `Video`          | `"video"` on the native `<video>` (file case only, its own real root) — the `'provider'`/`'iframe'` cases (YouTube/Vimeo/generic embeds) compose `IFrame` directly and inherit its `"iframe"` instead, never `"video"` (composed, not reimplemented)                                                                                                                                                                                                                                                                                                                                                                                            |
| `VisuallyHidden` | `"visually-hidden"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

The attribute is inert on its own — nothing in this package reads or reacts to it, and it has no
visual effect by itself.

It's a stable, semver-protected contract — not because arbitrary external CSS is expected to depend
on it (`className` remains the primarily supported styling path), but because the official
scaffolded template does: renaming or removing a `data-space-ui` value is a breaking change to this
package, exactly like removing a documented prop would be.

## `theme/` vs `shared/` — two optional, independent starter templates

Scaffolded by `zanix new space --template themed` (`@zanix/cli`'s own `space-theme.ts`, the same
JSR-fetch mechanism `--icons`' `space-icons.ts` already uses), living under this package's own
`src/templates/`, never imported by any runtime code here. A project that receives either owns the
file outright: no version pin, no import, edit or delete freely.

- **`theme/tokens.css`** — a starter default palette: primitive scale values (`--space-blue-500`, …)
  and the semantic tokens that reference them (`--space-color-primary`, …), following
  `@zanix/space`'s own `docs/theming.md` primitive/semantic convention exactly. This is the one file
  that varies by visual identity — a different theme preset would ship a different `tokens.css`,
  same shape.
- **`theme/space-defaults.css`** — minimal, real styling for `@zanix/space`'s OWN built-in views:
  its default `not-found`/`error` fallback (`[data-space="not-found"]`/`[data-space="error"]`) and
  every `@zanix/cli`-scaffolded template's root element, which share ONE generic
  `[data-space="content"]` hook — never a per-`--template` value (`welcome`, `population`, and any
  future one all render the exact same `<main data-space="content">`), so a future scaffolded
  template needs zero changes here to inherit this same styling. `data-space` is a distinct
  attribute from this package's own `data-space-ui` — a different package, a different audience (see
  this document's own header) — so this file, alone among the four, references `@zanix/space`'s
  markup contract rather than this package's. References only semantic tokens from
  `theme/tokens.css`, same discipline as `shared/behavior.css` below. **This is the canonical
  source** — `@zanix/cli`'s own `space-theme.ts` ships an embedded copy of this file's content, kept
  byte-for-byte in sync via `space-theme.test.ts`'s own integrity test, rather than fetching it from
  JSR at scaffold time.
- **`shared/behavior.css`** — structural/animation CSS rescued from the legacy `react-components`
  library's Tachyons extension (`.overlay`/`.hidden-overlay` + five `@keyframes`), re-tokenized
  (colors/z-index now reference semantic `--space-*` tokens, never a literal) and renamed with a
  `space-ui-` prefix for collision safety. Deliberately theme-agnostic — any theme, or none, can
  reuse it unchanged, since it never references anything but semantic token _names_. `ProgressBar`'s
  rules key off its own `[data-space-ui="progress-bar"]`/`data-timeout` markup, including a
  `prefers-reduced-motion: reduce` override that removes the animation entirely. `Modal`/`Drawer`'s
  own real backdrop is the second and third real consumer, wired via
  `[data-space-ui="modal-backdrop"], [data-space-ui="drawer-backdrop"]` — the same attribute-
  selector mechanism `progress-bar`'s own rule uses, not a class name either component would have to
  render. Deliberately sets ONLY `background` — `position`/`z-index` stay owned by a
  `<style
  nonce={nonce}>` element `Modal`/`Drawer` render THEMSELVES (`MODAL_POSITION_CSS`/
  `DRAWER_POSITION_CSS`, built from `MODAL_Z_INDEX`/`DRAWER_Z_INDEX`, both `999` for the backdrop —
  see `Modal/types.ts`'s own doc for the full mechanism). This used to be a real inline `style`
  attribute, which an external stylesheet could never override regardless of specificity; moved to
  this component-rendered `<style>` element instead specifically to fix a real, confirmed CSP
  violation under a nonce-based `style-src` policy (a CSP nonce never applies to a `style="..."`
  attribute, only to a `<style>` element — see `shared/overlay-position-css.ts` for the full
  reasoning). A real, honest trade-off of that move: unlike inline `style`, this is now an ordinary
  CSS rule — a consumer's own same-specificity rule loaded later in the DOM could in principle
  override it, though in the common case (a stylesheet in `<head>` parsing before this component's
  own `<style>` element renders later in `<body>`) source order still resolves in this rule's favor.
  Porting `--space-z-overlay` (`2147483646`, a wildly different number) into THIS rule (the one in
  `behavior.css`) would still misleadingly imply a value that could never actually apply, unchanged
  from before. Keeping that functional stacking owned by the component itself (not dependent on an
  optional stylesheet) is still deliberate, not an oversight — headless means `Modal`/`Drawer` stack
  correctly even with zero CSS ever imported; making that depend on an optional stylesheet would be
  less headless, not more — just implemented via a self-rendered `<style>` element now instead of a
  `style` attribute. `--space-z-overlay` itself (`theme/tokens.css`) is consequently unreferenced by
  any real rule in this package — a known, accepted trade-off of the same reasoning, not a gap to
  close by coupling the components to it. The legacy `.hidden-overlay` variant (a
  positioned-but-undimmed backdrop) isn't ported at all: `showOverlay={false}` renders NO backdrop
  element in either component, and `Popover`/`Combobox` — which also need outside-click dismissal
  with no visible backdrop — use `useCloseOnOutside`'s own `document`-level listener instead of a
  catch-all element, the same choice `Modal`/`Drawer` independently made. Nothing in this package's
  current architecture has a rendered state that variant would ever style. `Menu`/`Slider`/`Toast`
  have no backdrop of any kind (`Toast` stacks without one; `Menu`'s/`Slider`'s own content never
  needs one).
- **`shared/card.css`** — a separate file from `behavior.css` on purpose: `Card`'s responsive layout
  is CSS _layout_, not the animation/structural-behavior concern `behavior.css` covers. Entirely
  `grid-template-areas`-driven, keyed off `Card`'s own `data-space-ui="card"`/
  `"card-*"`/`data-align`/`data-stacked` markup — see `Card/render.ts`'s own doc for the full
  mechanism. Without it, `Card` still renders complete, correctly ordered markup; it simply stays in
  its single-column layout at every viewport, with no JavaScript attempting to compensate.

The two are independent because they answer different questions — "what does this look like"
(`theme/`) vs. "what does this generic interaction pattern need" (`shared/`) — and a project can
pick either, both, or neither.

## `--space-*` tokens

Any custom property this package's own templates declare follows `@zanix/space`'s own convention
(`docs/theming.md`) exactly: primitives are raw scale values, never referenced directly by a
component; semantics are named roles that reference a primitive, and are the only level a component
or `shared/behavior.css` may consume. `space-ui` never invents its own token naming scheme — it
composes with whatever `--space-*` tokens the host app's `globalCss`/`theme.resolve` already
resolve, per the normal CSS cascade.

## BEM / Tachyons — resolved, not carried forward

**BEM is no longer a styling/collision-avoidance architecture or mechanism of `space-ui`.** There is
no runtime `useStyles`-style hook here, and no component depends on a specific class name to
function. BEM's naming convention (`block__element--modifier`) can still be used _optionally_,
purely as a naming preference, inside a future CSS Module — but that's a choice available to whoever
writes that file, never a convention `space-ui` itself imposes, documents as official, or validates.

**Tachyons is not part of `space-ui`'s implementation or contract.** Its role (atomic utility CSS)
is already covered by Tailwind v4, `@zanix/space`'s own `cssPlugin` default — no new tooling
decision needed here.

Neither is prohibited for a consuming app's own code — a project is free to use BEM-style class
names, Tailwind, or anything else it likes for its _own_ styling. What changed is that `space-ui`
itself doesn't ship, require, or validate any of it.

## Replacing styling completely

Because every component's only styling surface is `className` (plus the inert `data-space-ui` hook),
replacing this package's look entirely means: don't scaffold `theme/`/`shared/` (or delete them if
already scaffolded), and style `[data-space-ui="..."]` — or just pass your own `className` per
instance — from whatever CSS system your app already uses. Nothing in `space-ui`'s own runtime needs
to know about or agree with that choice.

## See also

- [`docs/icons.md`](./icons.md) — the one optional default _resource_ this package ships
  (`CatalogIcon`'s icon catalog), which follows the same `shared/`-not-`theme/` independence
  principle described above.
