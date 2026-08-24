import type { Placement } from 'shared/positioning.ts'

/** The `aria-expanded`/`aria-controls`/`onClick` a `Popover` computes for the caller's own trigger
 * to apply — see `index.ts`'s own doc for why this arrives via a render-prop, the same reasoning
 * `Field`'s own `FieldRenderProps` already establishes for the identical underlying problem
 * (labeling/wiring an arbitrary element this component doesn't own or render itself). No `ref`
 * here unlike a naive first guess might expect — the trigger element is found by querying a
 * wrapper this component DOES own, the same "query fresh from the DOM, don't thread refs through
 * a render-prop" approach `Menu`'s own `toggleWrapperRef`/`triggerWrapperRef` already establishes. */
export type PopoverTriggerRenderProps = {
  'aria-expanded': boolean
  'aria-controls': string
  onClick: () => void
}

/** Props for {@linkcode Popover}. */
export type PopoverBaseProps = {
  /** Controlled open state — when given, this component's own internal state is never the source
   * of truth; the caller must update this prop (typically from `onOpenChange`) for it to actually
   * open or close. Omit for the uncontrolled default, where `defaultOpen` seeds the first render.
   * Always wins over `defaultOpen` when both are given — ignored, not invalid, same contract
   * established throughout this component family. */
  open?: boolean
  /** @default false */
  defaultOpen?: boolean
  /** Called whenever the trigger is activated, or an outside click/`Escape` closes it — fires
   * even in the uncontrolled case (same "always notify" contract established throughout). */
  onOpenChange?: (open: boolean) => void
  /** @default 'bottom' */
  placement?: Placement
  /** Gap, in px, between the trigger and the panel — `Modal`'s own `EDGE_MARGIN` is the same
   * "functional, not decorative" default a floating panel touching its own trigger would need
   * regardless of theme.
   * @default 8 */
  offset?: number
  id?: string
  className?: string
}
