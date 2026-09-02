import { Fragment, useEffect, useRef } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.ts'
import { useFocusScope } from 'shared/focus-scope.ts'
import { createElementWithNonceHydrationFix } from 'shared/create-element-nonce-hydration-fix.ts'
import { createDrawer } from './render.ts'
import type { DrawerAccessibleName, DrawerBaseProps } from './types.ts'

/** {@linkcode DrawerBaseProps} plus an accessible name and the panel's own content. */
export type DrawerProps = DrawerBaseProps & DrawerAccessibleName & { children: ReactNode }

/**
 * An off-canvas panel anchored to one edge of the viewport — `role="dialog"` + `aria-modal="true"`
 * (the WAI-ARIA APG has no separate "drawer" pattern; this IS a dialog, just edge-anchored instead
 * of centered), a focus trap, `Escape`, an accessible close button, correct stacking WITH `Modal`
 * (see below). Real implementation shared with the Preact binding via `render.ts`'s own
 * `createDrawer` (see that file's own doc for how — hook injection, narrower than `Modal`'s own bag
 * since this component has no provider/global mode of its own); import from
 * `@zanix/space-ui/preact` instead for the Preact one, same contract, same rendered behavior. No
 * legacy equivalent — new; composes the exact same primitives `Modal` does (`shared/focus-scope.ts`,
 * `shared/close-on-outside.ts`, `shared/overlay-stack.ts`), not a rewrite of any of them.
 *
 * ## Shares `Modal`'s own overlay stack, not a second one
 *
 * `shared/overlay-stack.ts` was extracted from `Modal`'s own former `modal-stack.ts` specifically
 * so `Drawer` could share it rather than keep an independent stack — a `Drawer` opened from inside
 * an open `Modal` (or vice versa) correctly defers focus-trapping/`Escape` to whichever is
 * genuinely topmost, and the page's scroll stays locked for as long as EITHER kind is open,
 * restored only once the very last one — of either type — closes.
 *
 * ## `side`, not `position` — no default
 *
 * `Modal.position` defaults to `'center'`, the unambiguous normal case for a centered dialog.
 * `Drawer.side` has no equivalent single obviously-correct default, so it's required — see
 * `types.ts`'s own doc on `DRAWER_SIDE_STYLE` for the anchoring this produces per edge, and for why
 * no slide-in transition ships here (a `className`/CSS concern entirely, same "no CSS shipped"
 * posture every component in this package already has).
 *
 * ## `nonce`, for a nonce-based `style-src` CSP
 *
 * Same contract as `Modal`'s own `nonce` — see `Modal/index.ts`'s own doc for the full reasoning,
 * including the React-only hydration-warning fix this component's own `<style nonce>` needs the
 * same way. `<Drawer nonce={nonce}>` when the consuming page runs a nonce-based CSP, omitted
 * otherwise.
 *
 * ## Close button content
 *
 * Same contract as `Modal`'s own — see `Modal/index.ts`'s own doc for the full reasoning, not
 * repeated here. `closeButtonContent` overrides the default inline "X" `<svg>` with any renderer
 * node; the button's own accessible name (`aria-label="Close"`) is unaffected either way.
 *
 * ## Otherwise identical to `Modal`'s own contract
 *
 * Accessible-name requirement (compile-time via {@linkcode DrawerAccessibleName}, `logger.warn`
 * fallback for untyped callers), `showOverlay`/outside-click as the same single decision, focus
 * management (capture → move into the panel, skipping the close button as the initial target →
 * restore on close, but only if still topmost), scroll lock — see `Modal/index.ts`'s own doc for
 * the full reasoning behind each; not repeated here since none of it changes for an edge-anchored
 * panel instead of a centered one.
 */
export const Drawer: (props: DrawerProps) => ReactElement | null = createDrawer<
  ReactElement,
  ReactNode
>(
  createElementWithNonceHydrationFix as unknown as CreateElement<ReactElement>,
  { useEffect, useRef, useFocusScope, useCloseOnOutside },
  Fragment,
)
