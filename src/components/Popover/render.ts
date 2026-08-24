import type { CreateElement } from 'typings/renderer.ts'
import { createEscapeToCloseHandler } from 'shared/escape-to-close.ts'
import type { ComputePositionOptions, ComputePositionResult } from 'shared/positioning.ts'
import type { PopoverBaseProps, PopoverTriggerRenderProps } from './types.ts'

/**
 * The subset of hooks/primitives this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 *
 * `useCloseOnOutside`/`usePosition` are themselves injected too, not imported directly — each is
 * already a per-renderer pair (`shared/close-on-outside.ts`/`.preact.ts`,
 * `shared/use-position.ts`/`.preact.ts`), so `index.ts`/`index.preact.ts` each pass their own
 * already-bound one in, the same way `Modal/render.ts`'s own `ModalHooks` already does for both.
 */
export type PopoverHooks = {
  useId: () => string
  useMemo: <T>(fn: () => T, deps: unknown[]) => T
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
  useCloseOnOutside: (
    ref: { current: HTMLElement | null },
    active: boolean,
    onClose: () => void,
  ) => void
  usePosition: (
    referenceRef: { current: Element | null },
    floatingRef: { current: Element | null },
    active: boolean,
    options?: ComputePositionOptions,
  ) => ComputePositionResult | null
}

/** {@linkcode PopoverBaseProps} plus the render-props that supply the trigger and panel content,
 * generic over the renderer's own node type — `index.ts`/`index.preact.ts` each instantiate this as
 * their own public `PopoverProps`, with `ReactNode`/`ComponentChildren`. */
export type PopoverRenderProps<Node> = PopoverBaseProps & {
  trigger: (triggerProps: PopoverTriggerRenderProps) => Node
  children: Node
}

/**
 * The real implementation of `Popover`, shared identically between the React and Preact bindings —
 * same pattern as `Table/render.ts`, extended with `useCloseOnOutside`/`usePosition` injected
 * alongside the ordinary hooks (see {@linkcode PopoverHooks}'s own doc).
 *
 * See `index.ts`'s own doc for the full public behavioral contract (why `trigger` is a render-prop
 * with no `ref` crossing it, why no portal, why no focus trap, why unmounted-when-closed like
 * `Modal`, why `useCloseOnOutside` scopes to a container wrapping BOTH the trigger and the panel
 * instead of the trigger alone, why the panel is measured while hidden then revealed) — not
 * repeated here.
 */
export function createPopover<E, Node>(
  h: CreateElement<E>,
  hooks: PopoverHooks,
): (props: PopoverRenderProps<Node>) => E {
  return function Popover(props: PopoverRenderProps<Node>): E {
    const {
      trigger,
      children,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      placement = 'bottom',
      offset = 8,
      id,
      className,
    } = props
    const contentId = hooks.useId()
    const isControlled = controlledOpen !== undefined
    const [internalOpen, setInternalOpen] = hooks.useState(defaultOpen)
    const open = isControlled ? controlledOpen : internalOpen

    const setOpen = (next: boolean) => {
      if (!isControlled) setInternalOpen(next)
      onOpenChange?.(next)
    }

    const containerRef = hooks.useRef<HTMLSpanElement | null>(null)
    const triggerWrapperRef = hooks.useRef<HTMLSpanElement | null>(null)
    const panelRef = hooks.useRef<HTMLDivElement | null>(null)
    // A stable object whose `.current` is always the LIVE current trigger element — real `useRef`
    // objects behave the same way (`.current` read at any time reflects the latest value); this one
    // just derives it from `triggerWrapperRef`'s own child instead of being set directly, since the
    // real trigger is caller-rendered content, not something this component holds a ref to itself.
    const referenceRef = hooks.useMemo(() => ({
      get current() {
        return triggerWrapperRef.current?.firstElementChild ?? null
      },
    }), [])

    const position = hooks.usePosition(referenceRef, panelRef, open, { placement, offset })

    // `containerRef` wraps BOTH the trigger and the panel — not `triggerWrapperRef` alone, a real
    // bug found and fixed while building `Tooltip`'s own sibling component: the panel is a sibling
    // of the trigger wrapper, not nested inside it, so scoping this to the trigger alone treated
    // every click on the panel's own content as "outside," closing it before any interactive
    // element inside could ever be used. See this module's own doc for the full account.
    hooks.useCloseOnOutside(containerRef, open, () => setOpen(false))

    const handleKeyDown = createEscapeToCloseHandler(
      open,
      () => setOpen(false),
      () => triggerWrapperRef.current?.firstElementChild as HTMLElement | null,
    )

    const triggerEl = h(
      'span',
      { key: 'trigger', ref: triggerWrapperRef, style: { display: 'contents' } },
      trigger({
        'aria-expanded': open,
        'aria-controls': contentId,
        onClick: () => setOpen(!open),
      }),
    )

    // The panel mounts as soon as `open` is true — its own DOM node has to exist for `panelRef` to
    // attach at all, which is what `usePosition` needs to measure it in the first place (measuring
    // it is NOT gated on already having a position — that would be circular). Kept `visibility:
    // hidden` until a real `position` exists, revealed only once it does — the standard "measure
    // while hidden, then reveal" technique, avoiding the alternative FOUC an `x: 0, y: 0` starting
    // transform would cause.
    const panel = open
      ? h(
        'div',
        {
          key: 'panel',
          id: id ?? contentId,
          className,
          ref: panelRef,
          'data-space-ui': 'popover',
          onKeyDown: handleKeyDown,
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            transform: position ? `translate(${position.x}px, ${position.y}px)` : undefined,
            visibility: position ? 'visible' : 'hidden',
          },
        },
        children,
      )
      : null

    return h('span', { ref: containerRef, style: { display: 'contents' } }, [
      triggerEl,
      panel,
    ])
  }
}
