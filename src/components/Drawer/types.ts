import { buildOverlayCss } from 'shared/overlay-position-css.ts'

/**
 * Shared base for `DrawerProps` — `children`'s own type is genuinely renderer-specific, same
 * reasoning `ModalBaseProps` doesn't declare it either; each of `index.ts`/`index.preact.ts` adds
 * it.
 */
export type DrawerBaseProps = {
  open: boolean
  /** Called whenever this drawer wants to close — the close button, `Escape`, or an outside click
   * (only when `showOverlay` is `false`, see `index.ts`'s own doc) — same contract
   * `ModalBaseProps.onClose` already has. */
  onClose: () => void
  /** Same contract as `ModalBaseProps.closeButtonContent` — overrides the close button's own
   * visible content in place of the default inline "X" `shared/close-button-icon.ts` renders (see
   * that module's own doc for why). Typed `unknown`, the same escape hatch `Button.children`
   * already uses, since this value is threaded straight through as that same `Button`'s own
   * `children`. Omit for the default "X"; `aria-label="Close"` is unaffected either way. */
  closeButtonContent?: unknown
  /** Which edge the panel is anchored to, and slides in from — no default, an explicit, deliberate
   * choice every time: unlike `Modal`'s own `position` (where `'center'` is the unambiguous normal
   * case), there's no single edge that's obviously "the" default for a drawer. */
  side: DrawerSide
  /** @default true */
  showOverlay?: boolean
  /** @default true */
  closeOnEscape?: boolean
  id?: string
  className?: string
  /** Same contract as `ModalBaseProps.nonce` — threaded onto this component's own self-rendered
   * `<style>` element (see {@linkcode DRAWER_POSITION_CSS}'s own doc), required only under a
   * nonce-based `style-src` CSP. Omit when no such CSP is in effect. */
  nonce?: string
}

/** Which screen edge the panel slides in from — passed as {@linkcode DrawerBaseProps.side}. */
export type DrawerSide = 'left' | 'right' | 'top' | 'bottom'

/**
 * Same "at least one of `label`/`ariaLabelledBy`" compile-time requirement `ModalAccessibleName`
 * already establishes — see that type's own doc for the full reasoning, identical here.
 */
export type DrawerAccessibleName =
  | { label: string; ariaLabelledBy?: string }
  | { label?: undefined; ariaLabelledBy: string }

/**
 * Functional, not decorative — same footing `MODAL_POSITION_STYLE`'s own doc already establishes:
 * `position: fixed` plus an edge anchor is what makes this component actually BE a drawer (full-
 * height or full-width, pinned to one side, above everything else), not a stylistic default.
 * Everything else (size along the non-anchored axis, color, shadow, padding, the slide-in
 * transition itself) stays entirely `className`'s job — no animation of any kind ships here,
 * same "no CSS shipped" posture every component in this package already has; a consumer's own
 * `transition: transform` keyed off this component's own `open` state (or a `[data-space-ui]`
 * selector) is exactly the intended hook.
 *
 * This — and {@linkcode DRAWER_Z_INDEX} below — used to be applied as a real inline `style`
 * attribute. Both are now consumed by {@linkcode DRAWER_POSITION_CSS} instead, the same
 * `<style nonce={nonce}>`-injection mechanism `MODAL_POSITION_CSS` uses (see that constant's own
 * doc, and `shared/overlay-position-css.ts`, for the full CSP reasoning) — values/shape unchanged.
 */
export const DRAWER_SIDE_STYLE: Record<DrawerSide, Record<string, string>> = {
  left: { top: '0', left: '0', bottom: '0' },
  right: { top: '0', right: '0', bottom: '0' },
  top: { top: '0', left: '0', right: '0' },
  bottom: { bottom: '0', left: '0', right: '0' },
}

/** Backdrop stays below the panel; both share the exact same values `MODAL_Z_INDEX` already uses
 * — a `Drawer` and a `Modal` open at once stack correctly against each other too, not just against
 * their own kind, the same reason their overlay stack is shared (`shared/overlay-stack.ts`). */
export const DRAWER_Z_INDEX = { backdrop: 999, panel: 1000 } as const

/**
 * The static CSS text `Drawer` injects via its own `<style>` element (see `render.ts`), built ONCE
 * at module scope from {@linkcode DRAWER_SIDE_STYLE}/{@linkcode DRAWER_Z_INDEX} — same shape
 * `MODAL_POSITION_CSS` establishes, see that constant's own doc for the full CSP reasoning.
 * `[data-space-ui='drawer-backdrop']` for the backdrop; `[data-space-ui='drawer'][data-side='…']`
 * per {@linkcode DrawerSide} for the panel — `render.ts` renders the actual `data-side` attribute
 * from this component's own `side` prop, never a class name.
 */
export const DRAWER_POSITION_CSS: string = [
  buildOverlayCss('drawer-backdrop', {
    position: 'fixed',
    inset: 0,
    zIndex: DRAWER_Z_INDEX.backdrop,
  }),
  buildOverlayCss('drawer', { position: 'fixed', zIndex: DRAWER_Z_INDEX.panel }, {
    attr: 'data-side',
    values: DRAWER_SIDE_STYLE,
  }),
].join('\n')
