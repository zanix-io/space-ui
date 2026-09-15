import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createEscapeToCloseHandler } from 'shared/escape-to-close.ts'
import type { ComputePositionOptions, ComputePositionResult } from 'shared/positioning.ts'
import { getNextRovingIndex } from 'shared/roving-focus.ts'
import {
  buildOverlayCss,
  DISPLAY_CONTENTS_WRAPPER_ATTR,
  DISPLAY_CONTENTS_WRAPPER_CSS,
  getOrInsertDynamicRule,
  removeDynamicRule,
} from 'shared/overlay-position-css.ts'
import type { SelectBaseProps, SelectOption } from './types.ts'

/**
 * The static, non-dynamic part of this component's own listbox positioning — same
 * `buildOverlayCss`/nonce'd-`<style>` pattern `Popover`/`Tooltip` already establish (see
 * `shared/overlay-position-css.ts`'s own doc for the full CSP reasoning: an inline `style`
 * attribute — including the previous version of this file's own `position:'fixed'`/`transform`
 * object literal on the `<ul>` — is a real, confirmed violation of a nonce-based `style-src` CSP).
 * `visibility: hidden` is the DEFAULT here (not genuinely static — see `createSelect`'s own doc for
 * the dynamic per-instance CSSOM rule that overrides it once a real position exists) so the listbox
 * starts, and stays until the first client measurement, provably hidden via CSS alone.
 */
const SELECT_LISTBOX_POSITION_CSS: string = buildOverlayCss('select-listbox', {
  position: 'fixed',
  top: 0,
  left: 0,
  margin: 0,
  padding: 0,
  listStyle: 'none',
  visibility: 'hidden',
})

/**
 * The hooks/primitives this component's shared body needs, injected alongside `h` — same shape
 * `Modal/render.ts`'s own `ModalHooks` establishes (see that file's own doc for the full soundness
 * reasoning, not repeated here). `usePosition`/`useCloseOnOutside` are themselves injected too, not
 * imported directly — each is already a per-renderer pair (`shared/use-position.ts`/`.preact.ts`,
 * `shared/close-on-outside.ts`/`.preact.ts`), the same reasoning `Modal/render.ts`'s own
 * `useFocusScope`/`useCloseOnOutside` injection already establishes.
 */
export type SelectHooks = {
  useId: () => string
  useRef: <T>(initial: T) => { current: T }
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
  useMemo: <T>(fn: () => T, deps: unknown[]) => T
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  /** For the dynamic-positioning CSSOM rule application — see `createSelect`'s own doc. Applied
   * synchronously before paint, same reasoning `Popover`/`Tooltip`'s own identical injection
   * documents (not repeated here). */
  useLayoutEffect: (effect: () => void | (() => void), deps: unknown[]) => void
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

/**
 * The real implementation of `Select`, shared identically between the React and Preact bindings —
 * same pattern as `Modal/render.ts`. Composes the real `Button` (via its own `render.ts` factory,
 * bound to the same `h`) for the trigger — inherits its own `data-space-ui="button"` hook, no
 * redundant one of its own; the listbox carries `data-space-ui="select-listbox"`, each option
 * `data-space-ui="select-option"`. `SelectOption.label` is a plain `string` (already
 * renderer-agnostic — no `Node` generic needed here, unlike `Table`/`Menu`/`Modal`).
 *
 * See `index.ts`'s own doc for the full public behavioral contract (the WAI-ARIA "Collapsible
 * Dropdown Listbox" pattern, real focus moving onto the listbox via `aria-activedescendant`,
 * automatic activation on arrow keys, `useCloseOnOutside` scoping, the `onMouseDown`
 * `preventDefault` fix, why the listbox unmounts when closed, why the trigger is queried fresh from
 * an owned wrapper) — not repeated here.
 */
export function createSelect<E>(
  h: CreateElement<E>,
  hooks: SelectHooks,
): (props: SelectBaseProps) => E {
  const Button = createButton(h)

  return function Select(props: SelectBaseProps): E {
    const {
      options,
      value: controlledValue,
      defaultValue = null,
      onValueChange,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      placeholder,
      label,
      placement = 'bottom',
      offset = 8,
      id,
      className,
      nonce,
    } = props

    const baseId = hooks.useId()
    const listboxId = `${baseId}-listbox`

    const isValueControlled = controlledValue !== undefined
    const [internalValue, setInternalValue] = hooks.useState(defaultValue)
    const value = isValueControlled ? controlledValue : internalValue

    const isOpenControlled = controlledOpen !== undefined
    const [internalOpen, setInternalOpen] = hooks.useState(defaultOpen)
    const open = isOpenControlled ? controlledOpen : internalOpen

    const setValue = (next: string | null) => {
      if (!isValueControlled) setInternalValue(next)
      onValueChange?.(next)
    }
    const setOpen = (next: boolean) => {
      if (!isOpenControlled) setInternalOpen(next)
      onOpenChange?.(next)
    }

    const selectedIndex = options.findIndex((option) => option.value === value)
    const activeIndex = selectedIndex === -1 ? 0 : selectedIndex
    const activeOption: SelectOption | undefined = options[activeIndex]
    const activeOptionId = activeOption ? `${baseId}-option-${activeOption.value}` : undefined

    const selectOption = (option: SelectOption) => {
      if (option.disabled) return
      setValue(option.value)
    }

    const triggerWrapperRef = hooks.useRef<HTMLSpanElement | null>(null)
    const listboxRef = hooks.useRef<HTMLUListElement | null>(null)
    const containerRef = hooks.useRef<HTMLSpanElement | null>(null)
    const styleElRef = hooks.useRef<HTMLStyleElement | null>(null)
    const dynamicRuleRef = hooks.useRef<CSSStyleRule | null>(null)

    // A stable object whose `.current` is always the LIVE trigger element — the same technique
    // `Popover`'s own `referenceRef` already establishes, needed because `Button` can't take a
    // `ref` directly (see `index.ts`'s own doc).
    const referenceRef = hooks.useMemo(() => ({
      get current() {
        return triggerWrapperRef.current?.firstElementChild ?? null
      },
    }), [])
    const getTriggerElement = () => triggerWrapperRef.current?.querySelector<HTMLElement>('button')

    const position = hooks.usePosition(referenceRef, listboxRef, open, { placement, offset })

    // The dynamic-positioning CSSOM rule — see `SELECT_LISTBOX_POSITION_CSS`'s own doc and
    // `shared/overlay-position-css.ts`'s for the full mechanism. Scoped to THIS instance via
    // `listboxId` (stable for the component's lifetime) — without that, two `Select`s open at once
    // would both target the same bare `[data-space-ui='select-listbox']` selector and silently
    // share one position. Keyed on `open` itself, same reasoning `Popover`'s own identical effect
    // documents: this component's own `<style>` element unmounts every time `open` becomes `false`.
    const dynamicSelector = `[data-space-ui='select-listbox'][data-select-id='${listboxId}']`
    hooks.useLayoutEffect(() => {
      if (!open) return
      const styleEl = styleElRef.current
      if (!styleEl) return
      getOrInsertDynamicRule(styleEl, dynamicRuleRef, dynamicSelector)
      return () => removeDynamicRule(styleEl, dynamicRuleRef)
    }, [open])

    // Applies the CSSOM rule's own `transform`/`visibility`/`min-width` on every position update —
    // `useLayoutEffect`, not `useEffect`, so this runs synchronously before the browser paints,
    // same reasoning `Popover`'s own identical effect documents.
    //
    // `min-width` keeps the listbox from ever rendering narrower than the trigger: this component
    // gives its own `<ul>` no width rule of its own (`SELECT_LISTBOX_POSITION_CSS` above only sets
    // `position`/`top`/`left`/margins), so a `position: fixed`, `width: auto` element with wrapping
    // text (`select-option`'s CSS never opts out of the default `white-space: normal`) sizes itself
    // to the browser's own shrink-to-fit preferred-width heuristic — narrower than the TRIGGER
    // itself whenever one option's label is long relative to the others (a live repro: a 417px-wide
    // trigger next to a 186px listbox, a long option label wrapping/visually clipping inside it).
    // Pinning `min-width` to the trigger's own measured width matches a native `<select>`'s own
    // dropdown sizing, while still letting the listbox grow wider for a genuinely longer label.
    hooks.useLayoutEffect(() => {
      const rule = dynamicRuleRef.current
      if (!rule) return
      rule.style.setProperty(
        'transform',
        position ? `translate(${position.x}px, ${position.y}px)` : '',
      )
      rule.style.setProperty('visibility', position ? 'visible' : 'hidden')
      rule.style.setProperty(
        'min-width',
        position ? `${referenceRef.current?.getBoundingClientRect().width ?? 0}px` : '',
      )
    }, [position])

    hooks.useCloseOnOutside(containerRef, open, () => setOpen(false))

    // Moves real focus onto the listbox once it mounts — the defining shape of the WAI-ARIA
    // "Collapsible Dropdown Listbox" pattern this component follows; see `index.ts`'s own doc.
    hooks.useEffect(() => {
      if (open) listboxRef.current?.focus()
    }, [open])

    // Calling `.focus()` on the trigger `Button` SYNCHRONOUSLY, from inside the SAME click
    // dispatch that's still bubbling from the option `<li>` that was just pressed-and-released,
    // makes Chromium synthesize a SECOND, genuinely `isTrusted: true` `click` event on that
    // now-focused trigger. That second click hits the
    // trigger's own `onClick: () => setOpen(!open)`, which — since `setOpen(false)` from THIS
    // function already ran a moment earlier — reads `open` as `false` and flips it straight back
    // to `true`, undoing the close it was supposed to finish. Deferring the refocus to its own
    // macrotask (never a microtask — those can still run before the browser considers the current
    // click's dispatch fully settled) lets the option's click event finish completely first, which
    // is enough to stop Chromium from attributing a second click to the newly-focused element.
    const closeAndRefocus = () => {
      setOpen(false)
      setTimeout(() => getTriggerElement()?.focus(), 0)
    }

    const escapeHandler = createEscapeToCloseHandler(
      open,
      () => setOpen(false),
      getTriggerElement,
    )

    // Skips disabled options entirely while navigating — the automatic-activation model this
    // component uses has no inert "highlighted but not selectable" state for one to sit in (see
    // `index.ts`'s own doc). Bounded to `options.length` iterations so an all-disabled set returns
    // `null` rather than looping forever.
    const nextEnabledIndexFor = (key: string): number | null => {
      if (options.length === 0) return null
      let index = activeIndex
      for (let i = 0; i < options.length; i++) {
        const candidate = getNextRovingIndex(index, key, options.length, 'vertical')
        if (candidate === null) return null
        index = candidate
        if (!options[index].disabled) return index
      }
      return null
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      escapeHandler(event)
      if (event.key === 'Escape') return

      if (!open) {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          setOpen(true)
        }
        return
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        closeAndRefocus()
        return
      }

      const nextIndex = nextEnabledIndexFor(event.key)
      if (nextIndex === null) return
      event.preventDefault()
      selectOption(options[nextIndex])
    }

    const trigger = h(
      'span',
      { key: 'trigger', ref: triggerWrapperRef, [DISPLAY_CONTENTS_WRAPPER_ATTR]: '' },
      Button({
        id,
        className,
        label,
        'aria-expanded': open,
        'aria-controls': listboxId,
        onClick: () => setOpen(!open),
        children: selectedIndex !== -1 && activeOption ? activeOption.label : (placeholder ?? ''),
      }),
    )

    // Static, non-dynamic `position: fixed; top: 0; left: 0; ...` lives in a self-rendered
    // `<style>` element (see `SELECT_LISTBOX_POSITION_CSS`'s own doc) — the genuinely dynamic
    // `transform`/`visibility` are applied to a CSSOM rule inside that SAME element instead of an
    // inline `style` attribute; the listbox itself carries no `style` prop at all.
    const styleEl = open
      ? h('style', { key: 'style', nonce, ref: styleElRef }, SELECT_LISTBOX_POSITION_CSS)
      : null

    const listbox = open
      ? h(
        'ul',
        {
          key: 'listbox',
          id: listboxId,
          ref: listboxRef,
          role: 'listbox',
          tabIndex: -1,
          'aria-activedescendant': activeOptionId,
          'data-space-ui': 'select-listbox',
          'data-select-id': listboxId,
          onBlur: () => setOpen(false),
        },
        options.map((option) =>
          h('li', {
            key: option.value,
            id: `${baseId}-option-${option.value}`,
            role: 'option',
            'aria-selected': option.value === value,
            'aria-disabled': option.disabled || undefined,
            'data-space-ui': 'select-option',
            onMouseDown: (event: Event) => event.preventDefault(),
            onClick: () => {
              if (option.disabled) return
              selectOption(option)
              closeAndRefocus()
            },
          }, option.label)
        ),
      )
      : null

    // Unconditional (unlike `styleEl` above, which unmounts with the listbox) — `trigger`/the
    // returned container span below render regardless of `open`, so the CSS backing their own
    // `display:contents` marker must always be present too.
    const wrapperStyleEl = h('style', { key: 'wrapper-style', nonce }, DISPLAY_CONTENTS_WRAPPER_CSS)

    return h(
      'span',
      { ref: containerRef, [DISPLAY_CONTENTS_WRAPPER_ATTR]: '', onKeyDown: handleKeyDown },
      [trigger, wrapperStyleEl, styleEl, listbox],
    )
  }
}
