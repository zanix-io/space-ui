import {
  createContext,
  createElement,
  Fragment,
  useCallback,
  useContext as useReactContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { createToast } from './render.ts'
import type { ToastMessage, ToastPosition } from './types.ts'

/** The object {@linkcode useToast} returns — imperative show/close control over toast messages. */
export type ToastApi = {
  showToast: (message: ToastMessage) => string
  closeToast: (id: string) => void
}

/** Named (not an anonymous arrow assigned to an object property) so `deno lint`'s own
 * `react-rules-of-hooks` recognizes this as a hook by its name — see `Modal/index.ts`'s own
 * comment on this exact line for the full reasoning (identical here). */
function useContext(context: unknown): unknown {
  return useReactContext(context as Parameters<typeof useReactContext>[0])
}

const bound = createToast<ReactElement, ReactNode>(
  createElement as unknown as CreateElement<ReactElement>,
  { createContext, useContext, useCallback, useMemo, useEffect, useState },
  Fragment,
)

/**
 * Rescued from the legacy `Overlay/Toast.tsx` + its shared `useToast`/store infrastructure — see
 * this package's own `CHANGELOG.md` for the full legacy-vs-here comparison. Real implementation
 * shared with the Preact binding via `render.ts`'s own `createToast` (see that file's own doc for
 * how — hook injection, narrower than `Modal`'s own bag); import from `@zanix/space-ui/preact`
 * instead for the Preact one, same contract, same rendered behavior.
 *
 * ## Imperative-only, like legacy always was — no declarative `<Toast open>` exists
 *
 * ```tsx
 * <ToastProvider position="bottom-left">
 *   <App />
 * </ToastProvider>
 * // anywhere inside:
 * const { showToast, closeToast } = useToast()
 * showToast({ variant: 'success', title: 'Saved', timeout: 4000 })
 * ```
 *
 * Unlike `Modal` (which added a declarative `<Modal open>` mode as the new default, rescuing a
 * component that was ONLY ever imperative in legacy), `Toast` stays imperative-only here too — a
 * toast is inherently triggered by an event ("the save succeeded"), not naturally tied to a piece
 * of rendered UI state the way a dialog usually is, so forcing a declarative form onto it would be
 * symmetry for its own sake, not a real need. `ToastProvider`/`useToast` are plain `useState` +
 * `Context`, the same shape `ModalProvider`/`IntlProvider` already use — never Zustand, never
 * assumed as a requirement just because legacy's own store happened to use it.
 *
 * ## `position` moved from per-toast to per-`ToastProvider`
 *
 * Legacy's own `Toast` took `position` per-instance. That never composed correctly with genuine
 * stacking: two toasts anchored to different corners aren't stacked together at all, they're just
 * two unrelated single toasts. `position` is a `ToastProvider` prop instead — every toast shown
 * through one provider stacks at the same anchor, reusing `Modal`'s own 9-way position vocabulary
 * verbatim (`MODAL_POSITION_STYLE`/`MODAL_Z_INDEX`, same functional-not-decorative justification
 * that type's own doc already gives).
 *
 * Newest toasts are always appended to the stack's end. For a bottom/middle-anchored stack (an
 * auto-height container pinned by its bottom edge, growing upward) that naturally lands the
 * newest toast closest to the anchored edge. For a top-anchored stack it lands the newest
 * FARTHEST from the edge instead — a real, minor, deliberately-not-solved asymmetry (documented
 * here rather than silently shipped) rather than speculative flex-direction cleverness with no
 * concrete UX evidence demanding it.
 *
 * ## Real accessibility this closes
 *
 * Legacy's entire `Overlay/` accessibility footprint was one `ariaLabel` on the close button —
 * no `role`, no `aria-live` anywhere on the toast region itself. Every toast here composes the
 * real `Alert` for its own message (`politeness: 'assertive'` for `variant: 'error'`, `'polite'`
 * otherwise) — real reuse, not a coincidence: a toast notification is exactly the kind of message
 * `Alert` already exists for, and both get the correct implicit live-region role/behavior for
 * free.
 *
 * ## A real legacy bug NOT replicated
 *
 * Legacy's own `useToast.ts` cleaned up a `setTimeout` with `clearInterval` — a mismatch that
 * leaves the timer running instead of cancelling it. The auto-dismiss effect here uses
 * `clearTimeout`, correctly paired with the `setTimeout` that scheduled it.
 *
 * ## `'custom'` variant dropped — its whole reason to exist was a problem this design doesn't have
 *
 * Legacy's six `ToastMessage.type` values included `'custom'`, an escape hatch from the other
 * five's FORCED background color/icon per type. This component forces no color of any kind for
 * any variant — headless, same as every other component in this package — so there's nothing left
 * for `'custom'` to opt out of. `variant` here is purely semantic (which `Alert` politeness
 * applies, and a `data-variant` hook on each toast's own wrapper for a consumer's own CSS), never
 * a color mechanism.
 *
 * ## Always has a close button, `showToast`/`closeToast` upsert by `id`
 *
 * Both real legacy behaviors, kept deliberately: a toast is always manually dismissible regardless
 * of `timeout`, and calling `showToast` with an `id` that matches an already-shown toast updates
 * it in place (e.g. a `'loading'` toast becoming a `'success'` one) instead of stacking a
 * duplicate — legacy's own dedup-by-`id` behavior, made explicit and intentional here rather than
 * left implicit.
 */
export const ToastProvider: (
  props: { position?: ToastPosition; children: ReactNode },
) => ReactElement = bound.ToastProvider

/**
 * Reads the `showToast`/`closeToast` API {@linkcode ToastProvider} provides to descendants. Throws
 * if called outside one — same fail-fast contract `useModal()`/`useIntl()` already have outside
 * their own providers.
 */
export const useToast: () => ToastApi = bound.useToast
