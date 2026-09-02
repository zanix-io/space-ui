import type { CreateElement } from 'typings/renderer.ts'
import type { ComputePositionOptions, ComputePositionResult } from 'shared/positioning.ts'
import {
  buildOverlayCss,
  getOrInsertDynamicRule,
  removeDynamicRule,
} from 'shared/overlay-position-css.ts'
import type { TooltipBaseProps, TooltipTriggerRenderProps } from './types.ts'

/**
 * The static, non-dynamic part of this component's own positioning (`position: fixed`, `top: 0`,
 * `left: 0` — the fixed anchor `usePosition`'s own `transform: translate(x, y)` offsets from),
 * built ONCE at module scope, injected via a `<style nonce={nonce}>` element instead of an inline
 * `style` attribute — see `TooltipBaseProps.nonce`'s own doc for the full CSP reasoning.
 *
 * `visibility: hidden`/`pointer-events: none` are included here too, as the DEFAULT — not because
 * they're static/non-dynamic (they aren't; see `createTooltip`'s own doc for the genuinely dynamic
 * per-instance CSSOM rule that overrides them once a real position exists) but so the panel starts,
 * and stays through SSR and up to the first client measurement, provably hidden via CSS alone, with
 * no dependency on any inline `style`/JS having run yet. The per-instance dynamic rule
 * (`[data-space-ui='tooltip'][data-tooltip-id='...']`, two attribute selectors) is always MORE
 * specific than this base rule (one attribute selector), so it reliably overrides these defaults
 * once it has real values to set, regardless of stylesheet order.
 */
const TOOLTIP_POSITION_CSS: string = buildOverlayCss('tooltip', {
  position: 'fixed',
  top: 0,
  left: 0,
  visibility: 'hidden',
  pointerEvents: 'none',
})

/**
 * The subset of hooks/primitives this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 *
 * `usePosition` is itself injected too, not imported directly — already a per-renderer pair
 * (`shared/use-position.ts`/`.preact.ts`), so `index.ts`/`index.preact.ts` each pass their own
 * already-bound one in, the same way `Popover/render.ts`'s own `PopoverHooks` already does.
 *
 * `useLayoutEffect` is injected alongside `useEffect` specifically for the CSSOM-rule application
 * this component's own doc covers below — React's and `preact/hooks`' real exports share the same
 * name and signature, so this is a genuine renderer-agnostic binding, not a divergence.
 */
export type TooltipHooks = {
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useLayoutEffect: (effect: () => void | (() => void), deps: unknown[]) => void
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
 * The static part of this component's own positioning is a `<style nonce={nonce}>` element it
 * renders itself, built once from `TOOLTIP_POSITION_CSS` above — see `TooltipBaseProps.nonce`'s
 * own doc for the full CSP reasoning. The genuinely dynamic `transform`/`visibility`/`pointerEvents`
 * part — recomputed every render from `usePosition`'s real measurement — is never an inline `style`
 * attribute either: it's applied to a CSSOM rule scoped to this instance
 * (`[data-space-ui='tooltip'][data-tooltip-id='<tooltipId>']`), inserted once into the SAME
 * `<style>` element via `getOrInsertDynamicRule` and mutated on every position update via
 * `hooks.useLayoutEffect` (synchronously before paint — see `shared/overlay-position-css.ts`'s own
 * doc for why a plain `useEffect` would flash/jump on every `autoUpdate` scroll update instead).
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
      nonce,
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
    const visible = open && position !== null

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

    // The dynamic-positioning CSSOM rule — see this module's own doc above and
    // `shared/overlay-position-css.ts`'s own doc for the full mechanism/reasoning. Scoped to this
    // instance via `tooltipId` (stable for the component's lifetime, from `useId()`), inserted once
    // into `styleElRef`'s own stylesheet (the panel is ALWAYS mounted, unlike `Popover`'s, so this
    // only ever needs to run once per real mount — `[]` deps, cleaned up only on true unmount).
    const styleElRef = hooks.useRef<HTMLStyleElement | null>(null)
    const dynamicRuleRef = hooks.useRef<CSSStyleRule | null>(null)
    const dynamicSelector = `[data-space-ui='tooltip'][data-tooltip-id='${tooltipId}']`
    hooks.useLayoutEffect(() => {
      const styleEl = styleElRef.current
      if (!styleEl) return
      getOrInsertDynamicRule(styleEl, dynamicRuleRef, dynamicSelector)
      return () => removeDynamicRule(styleEl, dynamicRuleRef)
      // `dynamicSelector` (derived from `tooltipId`) is deliberately not a dependency — `useId()`'s
      // own contract guarantees it's stable for the life of this component instance, same
      // "ref-gated, not re-derived" discipline `use-position.ts`'s own doc already establishes.
    }, [])

    // Applies the CSSOM rule's own `transform`/`visibility`/`pointer-events` on every position
    // update — `useLayoutEffect`, not `useEffect`, so this runs synchronously before the browser
    // paints (see `shared/overlay-position-css.ts`'s own doc for why a plain `useEffect` here would
    // flash/jump on every `autoUpdate` scroll-driven update instead of just once at mount). Always
    // sets an explicit `'auto'`/`'none'` for `pointer-events` — never clears the property back to
    // empty — since `TOOLTIP_POSITION_CSS`'s own static default is `pointer-events: none`; an empty
    // value here would remove this rule's OWN declaration (per the CSSOM `setProperty('', ...)`
    // spec) and let that static default win again even while genuinely visible.
    hooks.useLayoutEffect(() => {
      const rule = dynamicRuleRef.current
      if (!rule) return
      rule.style.setProperty(
        'transform',
        position ? `translate(${position.x}px, ${position.y}px)` : '',
      )
      rule.style.setProperty('visibility', visible ? 'visible' : 'hidden')
      rule.style.setProperty('pointer-events', visible ? 'auto' : 'none')
    }, [position, visible])

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

    // Static, non-dynamic `position: fixed; top: 0; left: 0` lives in a self-rendered `<style>`
    // element (see `TOOLTIP_POSITION_CSS`'s own doc) — the genuinely dynamic `transform`/
    // `visibility`/`pointerEvents` are applied to a CSSOM rule inside that SAME element instead of
    // an inline `style` attribute (see this module's own `createTooltip` doc above); the panel
    // itself carries no `style` prop at all.
    const styleEl = h('style', { key: 'style', nonce, ref: styleElRef }, TOOLTIP_POSITION_CSS)
    const panel = h(
      'div',
      {
        key: 'panel',
        id: id ?? tooltipId,
        className,
        ref: panelRef,
        role: 'tooltip',
        'data-space-ui': 'tooltip',
        'data-tooltip-id': tooltipId,
      },
      content,
    )

    return h('span', {}, [triggerEl, styleEl, panel])
  }
}
