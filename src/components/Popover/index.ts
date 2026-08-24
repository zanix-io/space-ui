import { createElement, useId, useMemo, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { CreateElement } from 'typings/renderer.ts'
import { useCloseOnOutside } from 'shared/close-on-outside.ts'
import { usePosition } from 'shared/use-position.ts'
import { createPopover } from './render.ts'
import type { PopoverBaseProps, PopoverTriggerRenderProps } from './types.ts'

/** {@linkcode PopoverBaseProps} plus the render-prop that supplies the trigger element. */
export type PopoverProps = PopoverBaseProps & {
  /** Renders the actual trigger element — receives the `aria-expanded`/`aria-controls`/`onClick`
   * this component computed, to spread onto whatever's rendered (a `Button`, a `Link`, anything). */
  trigger: (triggerProps: PopoverTriggerRenderProps) => ReactNode
  /** The panel's own content. */
  children: ReactNode
}

/**
 * A floating panel anchored to a trigger — the first real consumer of
 * `shared/positioning.ts`/`shared/use-position.ts`, both built ahead of one specifically for this.
 * Real implementation shared with the Preact binding via `render.ts`'s own `createPopover` (see
 * that file's own doc for how — hook injection, including `useCloseOnOutside`/`usePosition`
 * themselves); import from `@zanix/space-ui/preact` instead for the Preact one, same contract, same
 * rendered behavior. No legacy equivalent — new.
 *
 * ## Why `trigger` is a render-prop, not content or `cloneElement`
 *
 * Same reasoning `Field`'s own `children` render-prop already establishes for the identical
 * underlying problem: the trigger is an arbitrary element this component doesn't render itself (a
 * `Button`, a `Link`, a custom composed control), so `cloneElement` isn't safe and plain content
 * doesn't carry the real ARIA wiring. Unlike `Field`, no `ref` crosses the render-prop boundary —
 * the trigger is found by querying a plain wrapper `<span style="display:contents">` this
 * component DOES own (`display: contents` keeps it invisible to layout — a real, functional
 * default, same "functional, not decorative" justification `Modal`'s own fixed positioning has),
 * the same "query fresh from the DOM, don't thread refs through" approach `Menu`'s own
 * `toggleWrapperRef`/`triggerWrapperRef` already establishes.
 *
 * ## No portal — revisited specifically for this component, same conclusion held
 *
 * `Modal`'s own doc flagged its no-portal decision as worth re-examining specifically for
 * positioning primitives, since a popover anchored inside a scrollable/clipped ancestor is a more
 * concrete risk than a viewport-centered dialog. Re-examined here, not just inherited: `position:
 * fixed` is relative to the VIEWPORT, not a scrolling ancestor, unless that ancestor establishes
 * its own containing block for fixed descendants (`transform`/`filter`/`will-change`/`perspective`
 * set on it) — a real but non-default CSS state, not the common case. Preact CORE still has no
 * `createPortal` at all (only `preact/compat`, never a dependency here) — building one by hand
 * would be real, asymmetric complexity with no concrete consumer demonstrating the clipping
 * failure mode matters in practice. Same conclusion as `Modal`, reached on this component's own
 * merits rather than assumed from that precedent.
 *
 * ## No focus trap — same shape `Menu`'s own submenu disclosure already has, not `Modal`'s
 *
 * A popover is non-modal: focus can move freely in and out, `Tab`-ing past its own content simply
 * continues the page's normal tab order. `useCloseOnOutside`/`createEscapeToCloseHandler` are
 * reused verbatim — the same close-on-outside-click plus `Escape`-closes-and-refocuses-the-trigger
 * shape `Menu`'s own submenu items already establish, not `shared/focus-scope.ts` (which `Modal`/
 * `Drawer` need specifically because THEY trap focus).
 *
 * ## Unmounts when closed, like `Modal` — not `Disclosure`'s own `hidden`
 *
 * `Disclosure` deliberately diverged from `Modal` here because its content (FAQ answers, help
 * text) is frequently exactly what a search crawler reading raw SSR HTML should still see
 * collapsed. A popover's content is the opposite case — ephemeral, contextual, rarely content
 * worth indexing while closed — so this follows `Modal`'s own precedent instead: `null` when
 * closed, nothing rendered at all.
 *
 * ## `useCloseOnOutside` scopes to the trigger AND the panel
 *
 * The trigger and the panel are rendered as SIBLINGS (the panel isn't nested inside the trigger's
 * own wrapper) — scoping `useCloseOnOutside` to `triggerWrapperRef` alone would mean every
 * `mousedown` on the panel's own content, including any interactive element a caller put inside
 * `children`, gets treated as "outside" and closes the popover before that element could ever be
 * interacted with. Both the trigger and the panel are wrapped in one shared `containerRef`, passed
 * to `useCloseOnOutside` instead, so a click anywhere inside either one counts as "inside."
 *
 * ## Measured while hidden, revealed only once positioned
 *
 * The panel's own DOM node has to exist for `panelRef` to attach before `usePosition` can measure
 * it at all — gating the panel's very existence on already having a `position` would be circular.
 * Instead it mounts as soon as `open` is true, kept `visibility: hidden` until `usePosition`
 * returns a real (non-`null`) result, then revealed with the real computed `transform` — the
 * standard "measure while hidden, then reveal" technique, avoiding the flash-of-unpositioned-
 * content an `x: 0, y: 0` starting transform would otherwise cause.
 */
export const Popover: (props: PopoverProps) => ReactElement = createPopover<
  ReactElement,
  ReactNode
>(
  createElement as unknown as CreateElement<ReactElement>,
  { useId, useMemo, useRef, useState, useCloseOnOutside, usePosition },
)
