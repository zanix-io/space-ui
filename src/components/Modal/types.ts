import { buildOverlayCss } from 'shared/overlay-position-css.ts'

/**
 * Shared base for `ModalProps` — `children`'s own type is genuinely renderer-specific, same
 * reasoning `Slider`'s own `SliderBaseProps` doesn't declare `children` either; each of
 * `index.ts`/`index.preact.ts` adds it.
 */
export type ModalBaseProps = {
  open: boolean
  /** Called whenever this modal wants to close — the close button, `Escape`, an outside click
   * (`showOverlay: false`), or a backdrop click (`showOverlay: true` + `closeOnOverlayClick:
   * true`) — see `index.ts`'s own doc. The single source of truth: never closes itself. */
  onClose: () => void
  /**
   * Overrides the close button's own visible content — an icon from a consumer's own icon system
   * (a `CatalogIcon`, a plain `<svg>`, any renderer node), in place of the default inline "X" glyph
   * `shared/close-button-icon.ts` renders (see that module's own doc for why the default is an
   * inline `<svg>`, not a Unicode character or a bundled `CatalogIcon` call). Typed `unknown`, the
   * same escape hatch `Button.children` itself already uses for arbitrary caller content, since this
   * value is threaded straight through as that same `Button`'s own `children`. The close button's
   * accessible name (`aria-label`, see `closeLabel`) never changes based on this prop — only what's visible
   * does. Omit for the default "X".
   */
  closeButtonContent?: unknown
  /** Accessible name of the close button (its `aria-label`) — the text a screen reader announces.
   * Pass it already translated when the app is not in English; same prop name as
   * `Drawer.closeLabel`.
   * @default 'Close' */
  closeLabel?: string
  /** A dimmed backdrop behind the dialog. `true` (default) absorbs an outside click and does
   * nothing on its own, unless `closeOnOverlayClick` opts back in; `false` renders no backdrop and
   * always closes on an outside click instead — see `index.ts`'s own doc for the full contract.
   * @default true */
  showOverlay?: boolean
  /** Closes on a click directly on the backdrop — only applies while `showOverlay` is `true`.
   * @default false */
  closeOnOverlayClick?: boolean
  /** Which focusable descendant of the panel (by index, in DOM order) gets focus when it opens.
   * Index `0` is this component's own close button, so the default `1` is the first content
   * focusable — never the dismissive control, whose accidental activation by a reflexive
   * Enter/Space would close the panel at once. An index past the last focusable falls back to the
   * first one; `null` moves no focus on open at all (`Tab` is still trapped inside, and focus
   * still returns to the opener on close). Opening never scrolls the panel to the focused
   * element.
   * @default 1 */
  initialFocusIndex?: number | null
  /** @default true */
  closeOnEscape?: boolean
  /** @default 'center' */
  position?: ModalPosition
  id?: string
  className?: string
  /** Threaded onto this component's own self-rendered `<style>` element (see
   * {@linkcode MODAL_POSITION_CSS}'s own doc) — required only when the consuming page runs a
   * nonce-based `style-src` Content-Security-Policy (`@zanix/space`'s own zero-config default is
   * exactly this shape). Without a matching nonce, a strict CSP blocks this component's own
   * positioning `<style>` element the same way it would an inline `style` attribute, leaving the
   * dialog/backdrop unpositioned. Omit when no such CSP is in effect — the `<style>` element still
   * renders and works exactly as before, nonce or not. */
  nonce?: string
}

/** Where the dialog sits on screen — passed as {@linkcode ModalBaseProps.position}. */
export type ModalPosition =
  | 'center'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'middle-left'
  | 'middle-right'

/**
 * A dialog needs an accessible name from somewhere — `label` (a plain `aria-label`) or
 * `ariaLabelledBy` (an id already present in the DOM, e.g. a heading rendered inside `children`).
 * This union makes "at least one of the two" a compile error to skip entirely, without forbidding
 * supplying both (native ARIA lets `aria-labelledby` and `aria-label` coexist — the former wins).
 * Deliberately not enforced with a runtime throw the way `useIntl()` throws outside a provider —
 * see `index.ts`'s own doc for why a missing accessible name is treated as a real, but
 * non-fatal, accessibility gap to catch in development, not a structural misuse that should bring
 * the whole render down.
 */
export type ModalAccessibleName =
  | { label: string; ariaLabelledBy?: string }
  | { label?: undefined; ariaLabelledBy: string }

/**
 * Functional, not decorative — `position: fixed` is what makes this component actually BE a
 * modal (rendered above everything else, regardless of where it sits in the tree); a headless
 * `Modal` that didn't overlay anything without a consumer's own CSS would be a broken component,
 * not a legitimately unstyled one. Same footing as `Slider`'s visually-hidden live region or
 * `Image`'s placeholder `background` — a narrow, deliberate exception to "className is the only
 * styling mechanism," not a precedent for adding more. Everything else (color, shadow, padding,
 * border-radius, width) stays entirely `className`'s job.
 *
 * This — and {@linkcode MODAL_Z_INDEX} below — used to be applied as a real inline `style`
 * attribute. Both are now consumed by {@linkcode MODAL_POSITION_CSS} instead, which turns them into
 * CSS text `Modal` injects itself via a `<style nonce={nonce}>` element (see `ModalBaseProps.nonce`'s
 * own doc, and `shared/overlay-position-css.ts` for the full CSP reasoning) — the values and their
 * shape are unchanged, only how they reach the DOM is different, so headless correctness (zero CSS
 * ever required from the consumer) holds exactly as before.
 *
 * None of these variants uses `transform` — a `transform` on this dialog would make IT the
 * CONTAINING BLOCK for any `position: fixed`/`absolute` descendant (CSS spec, every evergreen
 * browser), never just a visual nudge. `Select`/`Combobox`/`MultiSelect`/`DatePicker` each render
 * their own listbox/panel as `position: fixed`, no portal (`shared/overlay-position-css.ts`'s own
 * doc) — nested inside a `Modal`, such a listbox needs its own `usePosition` coordinates (computed
 * via `getBoundingClientRect()`, viewport-relative) to resolve against the real viewport, not
 * against this dialog's own box; a `position: fixed` descendant is otherwise clipped by its own
 * containing block's `overflow` exactly like an `absolute` one is, regardless of any
 * `--space-z-overlay`-style z-index (`docs/styling.md`) — that only wins a STACKING comparison,
 * never a wrong containing block.
 *
 * Every variant that needs centering on an axis uses `inset: 0` (both opposing edges) + `margin:
 * auto` on that SAME axis instead — the standard transform-free centering technique, which never
 * creates a new containing block. The axis that stays PINNED to one edge (`top`/`bottom`/`left`/
 * `right` alone) uses a plain offset. The four corner variants (`top-left`/`top-right`/
 * `bottom-left`/`bottom-right`) use no centering at all, on either axis. See
 * {@linkcode buildPositionSizeFallbackCss} below for why the centering technique also needs a
 * `width`/`height` default on the axis being centered, and how that default stays fully
 * overridable by a consumer's own sizing.
 */
const EDGE_MARGIN = '1rem'

export const MODAL_POSITION_STYLE: Record<ModalPosition, Record<string, string>> = {
  center: { top: '0', left: '0', right: '0', bottom: '0', margin: 'auto' },
  'top-left': { top: EDGE_MARGIN, left: EDGE_MARGIN },
  'top-center': { top: EDGE_MARGIN, left: '0', right: '0', margin: '0 auto' },
  'top-right': { top: EDGE_MARGIN, right: EDGE_MARGIN },
  'middle-left': { top: '0', bottom: '0', left: EDGE_MARGIN, margin: 'auto 0' },
  'middle-right': { top: '0', bottom: '0', right: EDGE_MARGIN, margin: 'auto 0' },
  'bottom-left': { bottom: EDGE_MARGIN, left: EDGE_MARGIN },
  'bottom-center': { bottom: EDGE_MARGIN, left: '0', right: '0', margin: '0 auto' },
  'bottom-right': { bottom: EDGE_MARGIN, right: EDGE_MARGIN },
}

/**
 * `inset: 0` + `margin: auto` (or `0 auto`/`auto 0` for the two half-centered axes) only actually
 * CENTERS a box whose size on that same axis is definite — with `width`/`height` left at their
 * default `auto`, a fixed-position box with BOTH opposing insets set instead STRETCHES to fill the
 * full inset area (spec behavior), never a small dialog centered around a point the way a
 * `transform: translate(...)` would. This supplies a `fit-content` default for exactly the axis
 * each variant above centers — `center` needs both `width`/`height`, `top-center`/`bottom-center`
 * only `width` (their own vertical axis stays pinned via a plain `top`/`bottom` offset, never
 * centered, so it never stretches either), `middle-left`/`middle-right` only `height` (same
 * reasoning, horizontal axis stays pinned).
 *
 * Wrapped in `:where(...)`, which contributes ZERO specificity regardless of how many selectors sit
 * inside it — a consumer's own real sizing (`className`, this component's own headless "width/
 * color/shadow is your job" contract, `ModalBaseProps.className`'s own doc) always wins over this
 * fallback, at ANY specificity and regardless of source order, the same guarantee a plain browser
 * default (e.g. a `<button>`'s own UA-stylesheet padding) already gives every other unstyled
 * property here. Without `:where(...)`, this would need to be a bare `[data-space-ui='<dataSpaceUi>']
 * [data-position='...']` rule — the same specificity as a single consumer class selector — and since
 * `Modal`/`Toast` each re-inject their own `<style>` fresh on every open (always AFTER a consumer's
 * own page-load stylesheet), a same-specificity tie resolves in THIS rule's favor, silently
 * overriding a consumer's own explicit `width`/`height` set via its own `className`.
 *
 * Parameterized by `dataSpaceUi`, not hardcoded to `'modal'` — `Toast`'s own stack container reuses
 * `MODAL_POSITION_STYLE` verbatim for the identical anchoring problem (`Toast/render.ts`'s own doc).
 * Since those centered variants use `inset`/`margin`, never `transform` (see `MODAL_POSITION_STYLE`'s
 * own doc), a `Toast` positioned at `'center'`/`'top-center'`/`'bottom-center'`/`'middle-left'`/
 * `'middle-right'` needs this exact same fallback, keyed off `'toast-stack'` instead — without it,
 * the stack stretches to fill the whole viewport rather than centering.
 */
export function buildPositionSizeFallbackCss(dataSpaceUi: string): string {
  const selector = (position: string) =>
    `[data-space-ui='${dataSpaceUi}'][data-position='${position}']`
  return [
    `:where(${selector('center')}){width:fit-content;height:fit-content}`,
    `:where(${selector('top-center')}){width:fit-content}`,
    `:where(${selector('bottom-center')}){width:fit-content}`,
    `:where(${selector('middle-left')}){height:fit-content}`,
    `:where(${selector('middle-right')}){height:fit-content}`,
  ].join('\n')
}

/** Backdrop stays below the dialog; both comfortably above ordinary page content. With several
 * modals open, every instance shares these same two values — later-mounted ones still paint on
 * top, since equal-z-index siblings stack by document order, and a later `open` always mounts
 * later. No per-instance z-index math needed. */
export const MODAL_Z_INDEX = { backdrop: 999, dialog: 1000 } as const

/**
 * The static CSS text `Modal` injects via its own `<style>` element (see `render.ts`), built ONCE
 * at module scope from {@linkcode MODAL_POSITION_STYLE}/{@linkcode MODAL_Z_INDEX} — never
 * recomputed per render. Three rule groups, keyed off the same `data-space-ui` hooks
 * `docs/styling.md` already documents:
 * - `[data-space-ui='modal-backdrop']` — `position: fixed`, full-viewport `inset: 0`, and
 *   `z-index: MODAL_Z_INDEX.backdrop`.
 * - `[data-space-ui='modal'][data-position='<ModalPosition>']` — `position: fixed`,
 *   `z-index: MODAL_Z_INDEX.dialog` (the shared base rule), plus one rule per
 *   {@linkcode ModalPosition} variant for the `top`/`left`/`right`/`bottom`/`margin` anchor
 *   `MODAL_POSITION_STYLE` already defines — `render.ts` renders the actual `data-position`
 *   attribute from the component's own `position` prop, never a class name.
 * - {@linkcode buildPositionSizeFallbackCss}`('modal')` — the zero-specificity `width`/`height:
 *   fit-content` fallback the centered variants above need to actually center (see that function's
 *   own doc for why it's kept separate from `buildOverlayCss`'s own two-group shape: it needs
 *   `:where(...)`, which that shared helper doesn't produce).
 *
 * `Toast`'s own stack container reuses `MODAL_POSITION_STYLE`/`MODAL_Z_INDEX`/
 * `buildPositionSizeFallbackCss` for its identical anchoring problem (see `Toast/render.ts`) rather
 * than re-deriving its own copy — its CSS text is built the same way, just keyed off
 * `[data-space-ui='toast-stack']` instead.
 */
export const MODAL_POSITION_CSS: string = [
  buildOverlayCss('modal-backdrop', {
    position: 'fixed',
    inset: 0,
    zIndex: MODAL_Z_INDEX.backdrop,
  }),
  buildOverlayCss('modal', { position: 'fixed', zIndex: MODAL_Z_INDEX.dialog }, {
    attr: 'data-position',
    values: MODAL_POSITION_STYLE,
  }),
  buildPositionSizeFallbackCss('modal'),
].join('\n')
