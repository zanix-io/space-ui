import { createElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { usePosition } from 'shared/use-position.ts'
import { createTooltip } from './render.ts'
import type { TooltipBaseProps, TooltipTriggerRenderProps } from './types.ts'

/** {@linkcode TooltipBaseProps} plus the render-prop that supplies the trigger element. */
export type TooltipProps = TooltipBaseProps & {
  /** Renders the actual trigger element — receives the `aria-describedby`/hover+focus+`Escape`
   * wiring this component computed, to spread onto whatever's rendered (a `Button`, a `Link`,
   * anything). */
  trigger: (triggerProps: TooltipTriggerRenderProps) => ReactNode
  /** The tooltip's own content — kept to short descriptive text/labels per the WAI-ARIA APG's own
   * tooltip pattern guidance; nothing here enforces that (same "document, don't police" precedent
   * `IFrame`'s own `allowFullscreen` casing quirk already sets), but interactive content inside a
   * tooltip has no reliable way to receive pointer/keyboard focus before the tooltip itself closes. */
  content: ReactNode
}

/**
 * A short, ambient description shown on hover or focus of a trigger — `Popover`'s sibling, built on
 * the same `usePosition` engine, but for the WAI-ARIA `tooltip` role's own, narrower contract
 * instead of `Popover`'s general-purpose floating panel. Real implementation shared with the Preact
 * binding via `render.ts`'s own `createTooltip` (see that file's own doc for how — hook injection,
 * including `usePosition` itself); import from `@zanix/space-ui/preact` instead for the Preact one,
 * same contract, same rendered behavior. No legacy equivalent — new.
 *
 * ## Always mounted, never unmounted — the one deliberate divergence from `Popover`
 *
 * `Popover` unmounts (`null`) when closed, reasoned from its own arbitrary, potentially heavy
 * `children`. A tooltip's `content` is the opposite case by design (short, static, cheap) — the
 * WAI-ARIA APG's own reference tooltip pattern keeps the tooltip node ALWAYS present in the DOM,
 * toggling only its visibility, specifically so `aria-describedby` on the trigger can point at a
 * stable id that never dangles. This component follows that same convention: the panel always
 * renders, `visibility`/`pointerEvents` (not `hidden`/`display: none`, which the accessible-name/
 * -description computation excludes) are the only things that change when it opens or closes — the
 * ACCNAME spec's own exception for `aria-describedby`/`aria-labelledby` targets means a
 * `visibility: hidden` node's text is still read out correctly by assistive tech.
 *
 * ## Every trigger event lands on the caller's own element, none on a wrapper
 *
 * See `TooltipTriggerRenderProps`'s own doc for the full reasoning: `mouseenter`/`mouseleave`/
 * `focus`/`blur` don't bubble, and Preact attaches `onX` props as real native listeners directly on
 * the node that carries them (no root-level synthetic delegation the way React has) — a
 * `display: contents` wrapper has no box to ever receive a native `mouseenter`, so all five handlers
 * (plus `onKeyDown` for `Escape`) are spread onto the real trigger, never the wrapper. The wrapper
 * still exists, but purely to let `usePosition` query the real trigger's DOM node for measurement
 * (`referenceRef`'s own `firstElementChild` getter) — the same "query fresh from the DOM" technique
 * `Popover`'s own doc already covers in full.
 *
 * ## Keyboard focus opens instantly; only mouse hover gets a delay
 *
 * `openDelay`/`closeDelay` exist because rapid, transient mouse movement across a page shouldn't
 * flash every tooltip it crosses — a real, well-established UX convention, not a speculative prop.
 * Both default to `0` (immediate) rather than a guessed "correct" delay value, since no evidence
 * here justifies picking one nonzero default over another. Keyboard focus deliberately bypasses
 * BOTH delays unconditionally: a keyboard user explicitly navigated to this element, and an
 * artificial delay before its description appears would be a pure accessibility regression a mouse
 * user's incidental hover doesn't share.
 *
 * ## No outside-click dismissal, no focus trap
 *
 * A tooltip isn't opened by a click in the first place (hover/focus only) — `useCloseOnOutside`
 * doesn't apply. It's non-modal, ambient, and its content is guided to be non-interactive text —
 * `focus-scope.ts` doesn't apply either.
 *
 * ## `Escape` closes via a document-level listener, not `createEscapeToCloseHandler`
 *
 * `Popover`/`Menu` both attach `Escape` handling to an element that already, necessarily, has real
 * focus by the time it's open (a click always precedes them). A tooltip can just as easily be
 * open from a MOUSE hover with focus sitting anywhere else on the page — the trigger's own
 * `onKeyDown` would never even receive the native `keydown` in that case, since keyboard events
 * target wherever real focus actually is, not wherever the pointer happens to be. Wiring `Escape`
 * to the trigger via `createEscapeToCloseHandler` (the same shape `Popover` uses, refocusing the
 * trigger on close) would also reopen the tooltip immediately in the hover-only case: closing
 * calls `.focus()` on the trigger for the refocus, which (when the trigger wasn't ALREADY genuinely
 * focused) fires a real `focusin` event synchronously, and this component's own `onFocus` handler
 * treats any `focusin` as "open" — undoing the very close that just happened, within the same
 * batched update. Listening for `keydown` on `document` instead, only while `open`, avoids that
 * entirely and needs no refocus side effect: per the WAI-ARIA APG's own guidance, `Escape`
 * dismissing a tooltip "must not interfere with" whatever actually holds focus, so stealing focus
 * to the trigger would be wrong here even for the keyboard-focused case — if the trigger already
 * holds real focus, there's nothing to restore in the first place.
 *
 * ## Measured while hidden, revealed only once positioned
 *
 * Same technique `Popover`'s own doc covers in full: the panel is always mounted (see above) so its
 * ref is always attached, but stays `visibility: hidden` until `usePosition` returns a real,
 * non-`null` result, revealed only then with the real computed `transform`.
 */
export const Tooltip: (props: TooltipProps) => ReactElement = createTooltip<
  ReactElement,
  ReactNode
>(
  createElement as unknown as CreateElement<ReactElement>,
  { useEffect, useId, useMemo, useRef, useState, usePosition },
)
