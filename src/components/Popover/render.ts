import type { CreateElement } from 'typings/renderer.ts'
import { createEscapeToCloseHandler } from 'shared/escape-to-close.ts'
import type { ComputePositionOptions, ComputePositionResult } from 'shared/positioning.ts'
import {
  buildOverlayCss,
  getOrInsertDynamicRule,
  removeDynamicRule,
} from 'shared/overlay-position-css.ts'
import type { PopoverBaseProps, PopoverTriggerRenderProps } from './types.ts'

/**
 * The static, non-dynamic part of this component's own positioning — same shape/reasoning
 * `Tooltip/render.ts`'s own `TOOLTIP_POSITION_CSS` establishes, see that constant's own doc (and
 * `PopoverBaseProps.nonce`'s) for the full CSP reasoning.
 *
 * `visibility: hidden` is included here too, as the DEFAULT (see `TOOLTIP_POSITION_CSS`'s own doc
 * for the full reasoning — same "hidden via CSS alone, no dependency on any inline `style`/JS
 * having run yet" rationale) — the per-instance dynamic rule
 * (`[data-space-ui='popover'][data-popover-id='...']`) always overrides it once a real position
 * exists, being strictly more specific.
 */
const POPOVER_POSITION_CSS: string = buildOverlayCss('popover', {
  position: 'fixed',
  top: 0,
  left: 0,
  visibility: 'hidden',
})

/**
 * The subset of hooks/primitives this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 *
 * `useCloseOnOutside`/`usePosition` are themselves injected too, not imported directly — each is
 * already a per-renderer pair (`shared/close-on-outside.ts`/`.preact.ts`,
 * `shared/use-position.ts`/`.preact.ts`), so `index.ts`/`index.preact.ts` each pass their own
 * already-bound one in, the same way `Modal/render.ts`'s own `ModalHooks` already does for both.
 *
 * `useLayoutEffect` is injected alongside `useState`/`useRef`/... specifically for the CSSOM-rule
 * application this component's own doc covers below — React's and `preact/hooks`' real exports
 * share the same name and signature, so this is a genuine renderer-agnostic binding.
 */
export type PopoverHooks = {
  useId: () => string
  useLayoutEffect: (effect: () => void | (() => void), deps: unknown[]) => void
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
 * The static part of this component's own positioning is a `<style nonce={nonce}>` element it
 * renders itself, built once from `POPOVER_POSITION_CSS` above — see `PopoverBaseProps.nonce`'s
 * own doc for the full CSP reasoning. The genuinely dynamic `transform`/`visibility` part —
 * recomputed every render from `usePosition`'s real measurement — is never an inline `style`
 * attribute either: it's applied to a CSSOM rule scoped to this instance
 * (`[data-space-ui='popover'][data-popover-id='<contentId>']`), inserted into the SAME `<style>`
 * element (only while `open`, since this component's panel/style element are both unmounted
 * otherwise — unlike `Tooltip`'s own always-mounted one) via `getOrInsertDynamicRule`, and mutated
 * on every position update via `hooks.useLayoutEffect` (synchronously before paint).
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
      nonce,
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

    // The dynamic-positioning CSSOM rule — see this module's own doc above and
    // `shared/overlay-position-css.ts`'s own doc for the full mechanism/reasoning. Scoped to this
    // instance via `contentId` (stable for the component's lifetime, from `useId()`). Unlike
    // `Tooltip`'s always-mounted panel, this component's own `<style>` element unmounts every time
    // `open` becomes `false` — so the insert/cleanup effect below is keyed on `open` itself (a fresh
    // rule inserted into the fresh element each time it reopens, cleaned up each time it closes),
    // not `[]` — inserting into a `<style>` element that's about to unmount (or no longer exists)
    // would either no-op or leak a rule nothing ever removes.
    const styleElRef = hooks.useRef<HTMLStyleElement | null>(null)
    const dynamicRuleRef = hooks.useRef<CSSStyleRule | null>(null)
    const dynamicSelector = `[data-space-ui='popover'][data-popover-id='${contentId}']`
    hooks.useLayoutEffect(() => {
      if (!open) return
      const styleEl = styleElRef.current
      if (!styleEl) return
      getOrInsertDynamicRule(styleEl, dynamicRuleRef, dynamicSelector)
      return () => removeDynamicRule(styleEl, dynamicRuleRef)
    }, [open])

    // Applies the CSSOM rule's own `transform`/`visibility` on every position update —
    // `useLayoutEffect`, not `useEffect`, so this runs synchronously before the browser paints (see
    // `shared/overlay-position-css.ts`'s own doc for why a plain `useEffect` here would flash/jump
    // on every `autoUpdate` scroll-driven update instead of just once at mount).
    hooks.useLayoutEffect(() => {
      const rule = dynamicRuleRef.current
      if (!rule) return
      rule.style.setProperty(
        'transform',
        position ? `translate(${position.x}px, ${position.y}px)` : '',
      )
      rule.style.setProperty('visibility', position ? 'visible' : 'hidden')
    }, [position])

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
    // Static, non-dynamic `position: fixed; top: 0; left: 0` lives in a self-rendered `<style>`
    // element (see `POPOVER_POSITION_CSS`'s own doc) — the genuinely dynamic `transform`/
    // `visibility` are applied to a CSSOM rule inside that SAME element instead of an inline
    // `style` attribute (see this module's own `createPopover` doc above); the panel itself carries
    // no `style` prop at all. Only rendered alongside the panel itself — no panel mounted, nothing
    // to position.
    const styleEl = open
      ? h('style', { key: 'style', nonce, ref: styleElRef }, POPOVER_POSITION_CSS)
      : null

    const panel = open
      ? h(
        'div',
        {
          key: 'panel',
          id: id ?? contentId,
          className,
          ref: panelRef,
          'data-space-ui': 'popover',
          'data-popover-id': contentId,
          onKeyDown: handleKeyDown,
        },
        children,
      )
      : null

    return h('span', { ref: containerRef, style: { display: 'contents' } }, [
      triggerEl,
      styleEl,
      panel,
    ])
  }
}
