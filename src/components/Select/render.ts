import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createEscapeToCloseHandler } from 'shared/escape-to-close.ts'
import type { ComputePositionOptions, ComputePositionResult } from 'shared/positioning.ts'
import { getNextRovingIndex } from 'shared/roving-focus.ts'
import type { SelectBaseProps, SelectOption } from './types.ts'

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

    hooks.useCloseOnOutside(containerRef, open, () => setOpen(false))

    // Moves real focus onto the listbox once it mounts — the defining shape of the WAI-ARIA
    // "Collapsible Dropdown Listbox" pattern this component follows; see `index.ts`'s own doc.
    hooks.useEffect(() => {
      if (open) listboxRef.current?.focus()
    }, [open])

    const closeAndRefocus = () => {
      setOpen(false)
      getTriggerElement()?.focus()
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
      { key: 'trigger', ref: triggerWrapperRef, style: { display: 'contents' } },
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
          onBlur: () => setOpen(false),
          style: {
            position: 'fixed',
            top: 0,
            left: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            transform: position ? `translate(${position.x}px, ${position.y}px)` : undefined,
            visibility: position ? 'visible' : 'hidden',
          },
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

    return h(
      'span',
      { ref: containerRef, style: { display: 'contents' }, onKeyDown: handleKeyDown },
      [trigger, listbox],
    )
  }
}
