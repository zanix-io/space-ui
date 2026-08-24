import { createElement, useId, useRef, useState } from 'react'
import type {
  ChangeEvent as ReactChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactElement,
} from 'react'
import { useCloseOnOutside } from 'shared/close-on-outside.ts'
import { getNextRovingIndex } from 'shared/roving-focus.ts'
import { usePosition } from 'shared/use-position.ts'
import type { ComboboxBaseProps, ComboboxOption } from './types.ts'

/** {@linkcode ComboboxBaseProps} — nothing extra for the React binding. */
export type ComboboxProps = ComboboxBaseProps

/**
 * A text input paired with a filterable listbox of suggestions — combining `shared/roving-focus.ts`
 * with `shared/positioning.ts`/`usePosition`. React binding — import from `@zanix/space-ui/preact`
 * instead for the Preact one, same contract, same rendered behavior. No legacy equivalent — new.
 * The WAI-ARIA 1.2 "combobox" pattern's own
 * single-input shape: `role="combobox"` lives on the real `<input>` itself (not a wrapping element,
 * the older 1.0 pattern), `aria-autocomplete="list"` (options filter as you type; nothing here
 * auto-completes the input's own text inline — a materially different, more opinionated UX this
 * component deliberately doesn't impose).
 *
 * ## No `trigger` render-prop, unlike `Popover`/`Tooltip`
 *
 * Both of those anchor to a genuinely arbitrary caller-owned element (a `Button`, a `Link`,
 * anything). A combobox's own `<input>` isn't arbitrary in that sense — it needs specific ARIA
 * wiring (`role`, `aria-expanded`/`aria-controls`/`aria-activedescendant`/`aria-autocomplete`) and
 * keydown/change interception tightly coupled to this component's own internal state, the same
 * reason `Field` renders its own `<label>` and `Menu` renders its own toggle. This component owns
 * and renders its `<input>` directly.
 *
 * ## Roving highlight via `aria-activedescendant`, not roving tabindex — `getNextRovingIndex`
 * directly, never `createRovingKeyDownHandler`
 *
 * Real DOM focus never leaves the `<input>` for the whole interaction — the WAI-ARIA combobox
 * pattern's own defining shape, unlike `Tabs`'/`RadioGroup`'s roving TABINDEX (which moves real
 * focus between items). `shared/roving-focus.ts`'s own doc anticipates exactly this split:
 * `getNextRovingIndex` is the pure index arithmetic both patterns share; this component calls it
 * directly and tracks its own `activeIndex` state, never `createRovingKeyDownHandler` (which
 * imperatively calls `.focus()` on an item — wrong here on purpose).
 *
 * ## Typing never clears a committed `value` on its own
 *
 * A deliberate scope choice, not an oversight: once the results a caller's own `options` reflects
 * for the new `inputValue` no longer include the previously selected option, whether that former
 * selection is still "valid" is a policy question this headless component has no business
 * deciding — the caller already owns `value` (controlled or not) and can clear it from
 * `onInputValueChange` itself if that's the behavior it wants.
 *
 * ## `useCloseOnOutside` scopes to a container wrapping BOTH the input and the listbox
 *
 * The exact same real bug `Popover`'s own doc now documents in full — found and fixed there first,
 * applied here deliberately from the start rather than repeated: the listbox renders as a sibling
 * of the input, not nested inside it, so scoping outside-detection to the input alone would treat
 * every click on an option as "outside" and close the listbox before a click could ever select
 * anything.
 *
 * ## Mouse selection needs `onMouseDown` `preventDefault`, not just `onClick`
 *
 * Clicking an option would otherwise blur the `<input>` first (the default browser behavior for
 * clicking anything else), firing this component's own blur-closes-the-listbox handler before the
 * subsequent `onClick` selection could ever run. Each option's `onMouseDown` calls
 * `event.preventDefault()` specifically to suppress that blur — the standard, well-established
 * technique this exact WAI-ARIA pattern needs, not a workaround unique to this implementation.
 *
 * ## Listbox unmounts when closed, like `Popover` — not `Tooltip`'s own always-mounted
 *
 * `Tooltip` stays always-mounted specifically because `aria-describedby` targets are excluded from
 * the accessible-description computation when genuinely absent, and its content is short and
 * static. A combobox's listbox is the opposite case — its length and render cost scale with
 * `options`, exactly `Popover`'s own reasoning — and `aria-controls` (unlike `aria-describedby`)
 * tolerates referencing a currently-unrendered id without issue, per the WAI-ARIA APG's own
 * reference implementations.
 *
 * ## `Escape` closes it via the input's own `onKeyDown`, not a document-level listener like
 * `Tooltip`
 *
 * `Tooltip` needed a document-level listener specifically because it can be open from mouse hover
 * alone, with real focus sitting anywhere else on the page. A combobox is never hover-triggered —
 * the `<input>` genuinely holds real focus for the entire interaction, so the same class of bug
 * that hit `Tooltip` doesn't apply here; wiring `Escape` directly to the input's own `onKeyDown` is
 * both correct and simpler.
 *
 * ## No `noOptionsMessage`, no built-in loading state
 *
 * Both real, common needs in practice — deliberately left out of this first version rather than
 * guessed at. The listbox still renders (empty) when `open` and `options` is empty; a caller can
 * compose their own empty-state UI around this component if needed. Revisit if a concrete case
 * shows the omission actually matters, not speculatively now.
 */
export function Combobox(props: ComboboxProps): ReactElement {
  const {
    options,
    inputValue: controlledInputValue,
    defaultInputValue = '',
    onInputValueChange,
    value: controlledValue,
    defaultValue = null,
    onValueChange,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
    placement = 'bottom',
    offset = 8,
    placeholder,
    id,
    className,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
  } = props

  const baseId = useId()
  const inputId = id ?? baseId
  const listboxId = `${baseId}-listbox`

  const isInputControlled = controlledInputValue !== undefined
  const [internalInputValue, setInternalInputValue] = useState(defaultInputValue)
  const inputValue = isInputControlled ? controlledInputValue : internalInputValue

  const isValueControlled = controlledValue !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue)
  const value = isValueControlled ? controlledValue : internalValue

  const isOpenControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = isOpenControlled ? controlledOpen : internalOpen

  // The highlighted option is purely internal, never part of the public controlled contract — no
  // consumer evidence has asked to drive it from outside, unlike `value`/`inputValue`/`open`.
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  // Resets `activeIndex` whenever the option SET's own content genuinely changes (a new search
  // result), without depending on `options`' own array identity — a fresh array literal from the
  // caller every render (the common case) would otherwise reset it on every keystroke, defeating
  // arrow-key navigation entirely (the same fresh-object-per-render class of bug `usePosition`'s own
  // `optionsKey` already guards against). Adjusts state during render itself rather than an effect —
  // React's own documented pattern for "reset state when a derived key changes," avoiding the extra
  // render cycle a `useEffect` would cost here.
  const optionsKey = options.map((option) => option.value).join(' ')
  const [previousOptionsKey, setPreviousOptionsKey] = useState(optionsKey)
  if (optionsKey !== previousOptionsKey) {
    setPreviousOptionsKey(optionsKey)
    setActiveIndex(null)
  }

  const setInputValue = (next: string) => {
    if (!isInputControlled) setInternalInputValue(next)
    onInputValueChange?.(next)
  }
  const setValue = (next: string | null) => {
    if (!isValueControlled) setInternalValue(next)
    onValueChange?.(next)
  }
  const setOpen = (next: boolean) => {
    if (!isOpenControlled) setInternalOpen(next)
    onOpenChange?.(next)
    if (!next) setActiveIndex(null)
  }

  const selectOption = (option: ComboboxOption) => {
    if (option.disabled) return
    setValue(option.value)
    setInputValue(option.label)
    setOpen(false)
  }

  const inputRef = useRef<HTMLInputElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLSpanElement>(null)

  const position = usePosition(inputRef, listboxRef, open, { placement, offset })

  useCloseOnOutside(containerRef, open, () => setOpen(false))

  // React's own `onChange` is deliberately remapped to fire on every keystroke (the native `input`
  // event), unlike the DOM's own `change` (fires only on blur/commit) — historical React API design,
  // not this component's own choice. The Preact binding needs `onInput` instead for the same
  // per-keystroke behavior; see its own doc for the real bug that surfaced from getting this wrong.
  const handleChange = (event: ReactChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value)
    if (!open) setOpen(true)
  }

  const handleFocus = () => setOpen(true)
  const handleBlur = () => setOpen(false)

  // No current option → `ArrowDown` lands on the first, `ArrowUp` on the last — `getNextRovingIndex`
  // assumes a real in-range `currentIndex`, so this is handled explicitly rather than fed a magic
  // sentinel that wouldn't reproduce the right wrap-around math.
  const nextIndexFor = (key: string): number | null => {
    if (options.length === 0) return null
    if (activeIndex === null) {
      if (key === 'ArrowDown' || key === 'Home') return 0
      if (key === 'ArrowUp' || key === 'End') return options.length - 1
      return null
    }
    return getNextRovingIndex(activeIndex, key, options.length, 'vertical')
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (!open) return
      event.stopPropagation()
      setOpen(false)
      return
    }

    if (event.key === 'Enter') {
      if (!open || activeIndex === null) return
      const option = options[activeIndex]
      if (!option) return
      event.preventDefault()
      selectOption(option)
      return
    }

    const nextIndex = nextIndexFor(event.key)
    if (nextIndex === null || nextIndex === activeIndex) return
    event.preventDefault()
    if (!open) setOpen(true)
    setActiveIndex(nextIndex)
  }

  const activeOption = activeIndex !== null ? options[activeIndex] : undefined
  const activeOptionId = activeOption ? `${baseId}-option-${activeOption.value}` : undefined

  const input = createElement('input', {
    key: 'input',
    ref: inputRef,
    id: inputId,
    type: 'text',
    role: 'combobox',
    value: inputValue,
    placeholder,
    className,
    autoComplete: 'off',
    'aria-expanded': open,
    'aria-controls': listboxId,
    'aria-autocomplete': 'list',
    'aria-activedescendant': open ? activeOptionId : undefined,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'data-space-ui': 'combobox',
    onChange: handleChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
  })

  const listbox = open
    ? createElement(
      'ul',
      {
        key: 'listbox',
        id: listboxId,
        ref: listboxRef,
        role: 'listbox',
        'data-space-ui': 'combobox-listbox',
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
      options.map((option, index) =>
        createElement('li', {
          key: option.value,
          id: `${baseId}-option-${option.value}`,
          role: 'option',
          'aria-selected': option.value === value,
          'aria-disabled': option.disabled || undefined,
          'data-space-ui': 'combobox-option',
          onMouseEnter: () => setActiveIndex(index),
          onMouseDown: (event: ReactMouseEvent) => event.preventDefault(),
          onClick: () => selectOption(option),
        }, option.label)
      ),
    )
    : null

  return createElement('span', { ref: containerRef, style: { display: 'contents' } }, [
    input,
    listbox,
  ])
}
