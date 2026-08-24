import type { CreateElement } from 'typings/renderer.ts'
import type { ComputePositionOptions, ComputePositionResult } from 'shared/positioning.ts'
import type { TooltipBaseProps, TooltipTriggerRenderProps } from './types.ts'

/**
 * The subset of hooks/primitives this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 *
 * `usePosition` is itself injected too, not imported directly — already a per-renderer pair
 * (`shared/use-position.ts`/`.preact.ts`), so `index.ts`/`index.preact.ts` each pass their own
 * already-bound one in, the same way `Popover/render.ts`'s own `PopoverHooks` already does.
 */
export type TooltipHooks = {
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useId: () => string
  useMemo: <T>(fn: () => T, deps: unknown[]) => T
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
  usePosition: (
    referenceRef: { current: Element | null },
    floatingRef: { current: Element | null },
    active: boolean,
    options?: ComputePositionOptions,
  ) => ComputePositionResult | null
}

/** {@linkcode TooltipBaseProps} plus the render-props that supply the trigger and content, generic
 * over the renderer's own node type — `index.ts`/`index.preact.ts` each instantiate this as their
 * own public `TooltipProps`, with `ReactNode`/`ComponentChildren`. */
export type TooltipRenderProps<Node> = TooltipBaseProps & {
  trigger: (triggerProps: TooltipTriggerRenderProps) => Node
  content: Node
}

/**
 * The real implementation of `Tooltip`, shared identically between the React and Preact bindings —
 * same pattern as `Table/render.ts`, extended with `usePosition` injected alongside the ordinary
 * hooks (see {@linkcode TooltipHooks}'s own doc).
 *
 * See `index.ts`'s own doc for the full public behavioral contract (always mounted rather than
 * unmounted like `Popover`, why every trigger event lands on the caller's own element and never a
 * wrapper, why keyboard focus bypasses both delays, no outside-click dismissal, no focus trap, why
 * `Escape` is a document-level listener rather than `createEscapeToCloseHandler` on the trigger — a
 * real bug found while building this, not a stylistic choice — measured while hidden then revealed)
 * — not repeated here.
 */
export function createTooltip<E, Node>(
  h: CreateElement<E>,
  hooks: TooltipHooks,
): (props: TooltipRenderProps<Node>) => E {
  return function Tooltip(props: TooltipRenderProps<Node>): E {
    const {
      trigger,
      content,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      placement = 'top',
      offset = 8,
      openDelay = 0,
      closeDelay = 0,
      id,
      className,
    } = props
    const tooltipId = hooks.useId()
    const isControlled = controlledOpen !== undefined
    const [internalOpen, setInternalOpen] = hooks.useState(defaultOpen)
    const open = isControlled ? controlledOpen : internalOpen

    const setOpen = (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    }

    // A single pending timer covers both the open- and close-delay cases — only one of "about to
    // open" / "about to close" can ever be scheduled at once, and every handler below clears
    // whatever's pending before scheduling its own, so a fast enter-then-leave never fires the
    // stale one.
    const pendingTimerRef = hooks.useRef<ReturnType<typeof setTimeout> | null>(null)
    const clearPendingTimer = () => {
      if (pendingTimerRef.current !== null) {
        clearTimeout(pendingTimerRef.current)
        pendingTimerRef.current = null
      }
    }
    hooks.useEffect(() => clearPendingTimer, [])

    const handleMouseEnter = () => {
      clearPendingTimer()
      if (openDelay > 0) {
        pendingTimerRef.current = setTimeout(() => setOpen(true), openDelay)
      } else {
        setOpen(true)
      }
    }
    const handleMouseLeave = () => {
      clearPendingTimer()
      if (closeDelay > 0) {
        pendingTimerRef.current = setTimeout(() => setOpen(false), closeDelay)
      } else {
        setOpen(false)
      }
    }
    // Keyboard focus/blur bypass both delays entirely — see this module's own doc for why.
    const handleFocus = () => {
      clearPendingTimer()
      setOpen(true)
    }
    const handleBlur = () => {
      clearPendingTimer()
      setOpen(false)
    }

    const triggerWrapperRef = hooks.useRef<HTMLSpanElement | null>(null)
    const panelRef = hooks.useRef<HTMLDivElement | null>(null)
    const referenceRef = hooks.useMemo(() => ({
      get current() {
        return triggerWrapperRef.current?.firstElementChild ?? null
      },
    }), [])

    const position = hooks.usePosition(referenceRef, panelRef, open, { placement, offset })

    // See this module's own doc for why this is a document-level listener rather than
    // `createEscapeToCloseHandler` on the trigger — a real bug, not a style preference. No refocus
    // side effect: closing never moves focus, since there's either nothing to restore (the trigger
    // already has it) or nothing that should be stolen (a hover-only open never took it).
    hooks.useEffect(() => {
      if (!open) return
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setOpen(false)
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [open])

    const triggerEl = h(
      'span',
      { key: 'trigger', ref: triggerWrapperRef, style: { display: 'contents' } },
      trigger({
        'aria-describedby': tooltipId,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleFocus,
        onBlur: handleBlur,
      }),
    )

    const visible = open && position !== null
    const panel = h(
      'div',
      {
        key: 'panel',
        id: id ?? tooltipId,
        className,
        ref: panelRef,
        role: 'tooltip',
        'data-space-ui': 'tooltip',
        style: {
          position: 'fixed',
          top: 0,
          left: 0,
          transform: position ? `translate(${position.x}px, ${position.y}px)` : undefined,
          visibility: visible ? 'visible' : 'hidden',
          pointerEvents: visible ? undefined : 'none',
        },
      },
      content,
    )

    return h('span', {}, [triggerEl, panel])
  }
}
