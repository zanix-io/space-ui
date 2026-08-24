import type { ModalPosition } from 'components/Modal/types.ts'
import type { IconProps } from 'components/Icon/types.ts'
import type { ButtonProps } from 'components/Button/types.ts'

/** Which corner/edge a `ToastProvider`'s own stack anchors to — reuses `Modal`'s own 9-way
 * position vocabulary verbatim (byte-identical set of values), since the anchoring problem is the
 * same one. Unlike legacy's own `Toast`, this is a `ToastProvider`-level setting, not per-toast —
 * per-toast positions never made sense for a genuinely STACKING system (two toasts anchored to
 * different corners aren't stacked together at all, they're just two independent single toasts).
 * @default 'bottom-left' */
export type ToastPosition = ModalPosition

/** Purely semantic, not a color/styling mechanism — see `index.ts`'s own doc for why legacy's
 * sixth value, `'custom'`, has no purpose left to carry forward. */
export type ToastVariant = 'info' | 'success' | 'warning' | 'error' | 'loading'

/**
 * Shared base for `ToastMessage` (below). Unlike most other components in this package, nothing
 * here is renderer-specific — `ButtonProps`/`IconProps` are already single, shared types with no
 * React/Preact split of their own, so `ToastMessage` needs no per-renderer version either.
 */
export type ToastMessageBase = {
  /** Stable identity — if it matches an already-shown toast, `showToast` UPDATES that entry in
   * place (same position in the stack, new content) instead of appending a duplicate. Auto-
   * generated when omitted. The concrete case this exists for: replacing a `'loading'` toast with
   * a `'success'`/`'error'` one once an async action settles, without a visible stack reflow. */
  id?: string
  /** @default 'info' */
  variant?: ToastVariant
  title?: string
  body?: string
  /** Same `IconProps` `Icon` itself takes, same "caller-supplied, no bundled sprite assumed"
   * contract `Menu.icon` already establishes for its own items. */
  icon?: IconProps
  /** Milliseconds until this toast auto-dismisses. Omitted (the default) means it never does —
   * same real, deliberate legacy behavior, not an oversight: a toast the user must act on (or one
   * whose importance the caller doesn't want time-boxed) stays until explicitly closed. */
  timeout?: number
  /** Shows a `ProgressBar` counting down `timeout` — has no effect without one.
   * @default variant === 'loading' */
  showProgress?: boolean
  /** Called once this specific toast actually closes, for any reason (`timeout`, the close
   * button, or `closeToast(id)` called directly) — same per-entry callback shape
   * `ModalProvider`'s own `openModal`'s `onClose` already has. */
  onClose?: () => void
  className?: string
}

/**
 * A full toast — `ButtonProps` (`Button`'s own single, renderer-agnostic type, no per-renderer
 * split needed here either) reused verbatim for action buttons (e.g. "Undo"), same "reuse the
 * real prop type" contract `Menu.icon: IconProps` already establishes.
 */
export type ToastMessage = ToastMessageBase & {
  buttons?: ButtonProps[]
}
