import { h } from 'preact'
import type { JSX, VNode } from 'preact'
import { useId, useRef, useState } from 'preact/hooks'
import { useCloseOnOutside } from 'shared/close-on-outside.preact.ts'
import { getNextRovingIndex } from 'shared/roving-focus.ts'
import { usePosition } from 'shared/use-position.preact.ts'
import type { ComboboxBaseProps, ComboboxOption } from './types.ts'

/** {@linkcode ComboboxBaseProps} — nothing extra for the Preact binding. */
export type ComboboxProps = ComboboxBaseProps

/**
 * Preact binding — see `index.ts`'s own doc for the full contract (no `trigger` render-prop unlike
 * `Popover`/`Tooltip`, roving highlight via `aria-activedescendant` and `getNextRovingIndex`
 * directly, typing never clears a committed `value`, `useCloseOnOutside` scopes to a container
 * wrapping both the input and the listbox, mouse selection needs `onMouseDown` `preventDefault`,
 * the listbox unmounts when closed like `Popover`, `Escape` on the input's own `onKeyDown` — never
 * a document-level listener like `Tooltip`, since the input genuinely holds focus throughout) — not
 * repeated here. Same contract, same rendered behavior, independent implementation — never
 * `preact/compat`.
 */
export function Combobox(props: ComboboxProps): VNode {
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

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
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

  // `onInput`, not `onChange` — a real React/Preact divergence, the same class already documented
  // for `IFrame`'s own `allowFullscreen` casing and `Video`'s own `srcLang`: React deliberately
  // REMAPS `onChange` to fire on every keystroke (the native `input` event), for historical
  // API-design reasons; Preact maps prop names to native event types literally, so its own
  // `onChange` means the native `change` event — which a text `<input>` only fires on blur/
  // commit, not per keystroke. Using `onChange` here would silently only pick up typed text once
  // focus left the input, breaking live filtering entirely.
  const handleInput = (event: JSX.TargetedEvent<HTMLInputElement>) => {
    setInputValue((event.target as HTMLInputElement).value)
    if (!open) setOpen(true)
  }

  const handleFocus = () => setOpen(true)
  const handleBlur = () => setOpen(false)

  const nextIndexFor = (key: string): number | null => {
    if (options.length === 0) return null
    if (activeIndex === null) {
      if (key === 'ArrowDown' || key === 'Home') return 0
      if (key === 'ArrowUp' || key === 'End') return options.length - 1
      return null
    }
    return getNextRovingIndex(activeIndex, key, options.length, 'vertical')
  }

  const handleKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
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

  const input = h('input', {
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
    onInput: handleInput,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
  })

  const listbox = open
    ? h(
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
        h('li', {
          key: option.value,
          id: `${baseId}-option-${option.value}`,
          role: 'option',
          'aria-selected': option.value === value,
          'aria-disabled': option.disabled || undefined,
          'data-space-ui': 'combobox-option',
          onMouseEnter: () => setActiveIndex(index),
          onMouseDown: (event: Event) => event.preventDefault(),
          onClick: () => selectOption(option),
        }, option.label)
      ),
    )
    : null

  return h('span', { ref: containerRef, style: { display: 'contents' } }, [
    input,
    listbox,
  ]) as VNode
}
