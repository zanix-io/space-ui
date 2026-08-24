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
