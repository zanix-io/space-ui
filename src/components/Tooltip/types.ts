import type { Placement } from 'shared/positioning.ts'

/** The `aria-describedby`/hover+focus wiring a `Tooltip` computes for the caller's own trigger to
 * apply — see `index.ts`'s own doc for why this arrives via a render-prop (the same underlying
 * problem `PopoverTriggerRenderProps`/`FieldRenderProps` already solve) and why EVERY one of these
 * lands here rather than on a wrapper element this component owns: `mouseenter`/`mouseleave`/
 * `focus`/`blur` don't bubble natively, and Preact (unlike React's synthetic event delegation)
 * attaches listeners directly to the node carrying the prop — a wrapper with `display: contents`
 * has no box of its own to ever receive them. Spreading these directly onto the real trigger
 * element is the only renderer-agnostic option, so `onClick` in `PopoverTriggerRenderProps` is not
 * an isolated case, this extends the same reasoning further. No `onKeyDown` here, unlike a naive
 * first guess — see `index.ts`'s own doc for why `Escape` is handled at the document level instead. */
export type TooltipTriggerRenderProps = {
  'aria-describedby': string
  onMouseEnter: () => void
  onMouseLeave: () => void
  onFocus: () => void
  onBlur: () => void
}

/** Props for {@linkcode Tooltip}. */
export type TooltipBaseProps = {
  /** Controlled open state — when given, this component's own internal hover/focus-driven state is
   * never the source of truth; the caller must update this prop (typically from `onOpenChange`) for
   * it to actually open or close. Omit for the uncontrolled default, where hover/focus on the
   * trigger drives it directly. Always wins over `defaultOpen` when both are given — ignored, not
   * invalid, same contract established throughout this component family. */
  open?: boolean
  /** @default false */
  defaultOpen?: boolean
  /** Called whenever hover, focus, blur, or `Escape` would open or close it — fires even in the
   * uncontrolled case (same "always notify" contract established throughout). */
  onOpenChange?: (open: boolean) => void
  /** @default 'top' — unlike `Popover`'s own `'bottom'` default, a tooltip conventionally sits
   * above the element it describes. */
  placement?: Placement
  /** Gap, in px, between the trigger and the tooltip.
   * @default 8 */
  offset?: number
  /** Delay, in ms, before a MOUSE hover opens it — `0` opens immediately. Never applies to
   * keyboard focus, which always opens instantly (see `index.ts`'s own doc for why).
   * @default 0 */
  openDelay?: number
  /** Delay, in ms, before a mouse leaving the trigger closes it. Never applies to blur, which
   * always closes instantly.
   * @default 0 */
  closeDelay?: number
  id?: string
  className?: string
}
