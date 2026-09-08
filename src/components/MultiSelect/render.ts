import type { CreateElement } from 'typings/renderer.ts'
import { createButton } from '../Button/render.ts'
import { createDefaultCloseIcon } from 'shared/close-button-icon.ts'
import type { ComputePositionOptions, ComputePositionResult } from 'shared/positioning.ts'
import { getNextRovingIndex } from 'shared/roving-focus.ts'
import { VISUALLY_HIDDEN_STYLE } from 'shared/live-region.ts'
import type { MultiSelectBaseProps, MultiSelectOption } from './types.ts'

/**
 * The hooks/primitives this component's shared body needs, injected alongside `h` — same shape
 * `Select/render.ts`'s own `SelectHooks` establishes (see that file's own doc for the full
 * soundness reasoning, not repeated here).
 */
export type MultiSelectHooks = {
  useId: () => string
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

/**
 * The real implementation of `MultiSelect`, shared identically between the React and Preact
 * bindings — same `render.ts`-factory technique `Select`/`Input` already use, extended with the
 * same one more injected parameter beyond `h`/`hooks` that `Input/render.ts`'s own `createInput`
 * needed: `changeEventProp`.
 *
 * ## Why a third parameter instead of a full second implementation, unlike `Combobox`
 *
 * A live-typing text `<input>` has exactly the one real, confirmed React/Preact divergence
 * `Combobox`'s own docs establish (React remaps its own `onChange` to the native `input` event,
 * firing per keystroke; Preact's own `onChange` means the literal native `change` event, firing
 * only on blur). `Input/render.ts` already found this divergence is narrow enough to isolate to a
 * single computed prop key, without needing a second `handleChange`/`handleInput` implementation
 * the way `Combobox` needed — this component's own input has the identical shape (a plain
 * `{ target: { value: string } }` structural type is true of both renderers' real event target at
 * runtime), so the same isolation applies here too.
 *
 * ## Composes `Button` for each chip's own remove control — inherits `data-space-ui="button"`
 *
 * Same "composed, not reimplemented" rule `ImgButton`/`Select`'s own trigger already establish: a
 * chip's remove control genuinely IS a `Button` (`aria-label="Remove {label}"`, `onClick` removes
 * that one chip), so it carries only `Button`'s own hook, never a redundant one. Its visible content
 * is `shared/close-button-icon.ts`'s own default inline "X" `<svg>` — the same default
 * `Modal`/`Drawer`/`Toast` already render for their own close buttons, reused verbatim rather than
 * re-derived (no `closeButtonContent`-style override exists here — no consumer evidence yet asks for
 * a custom per-chip remove glyph).
 *
 * ## Mode 1 vs Mode 2 — one shared body, `allowCustomValue` only gates two branches
 *
 * Both modes share the identical input-owning, listbox-positioning, chip-management body described
 * in `index.ts`'s own doc (the full public behavioral contract — not repeated here). `allowCustomValue`
 * only changes two things: whether `Enter`/blur with no highlighted option commits the raw typed text
 * as a new chip (`commitTypedText`), and nothing else — the listbox, the roving highlight, the
 * already-committed-option exclusion, and the chip list itself behave identically either way.
 *
 * ## Already-committed options are excluded from what's rendered/navigated, not just visually marked
 *
 * `availableOptions` (this component's own derived value, never part of the public contract) is
 * `options` minus anything already in `values` — the primary behavior `index.ts`'s own doc names for
 * Mode 1 ("removed from... the open list"), applied uniformly to both modes since re-offering an
 * already-picked value never makes sense either way. The listbox itself doesn't render at all once
 * `availableOptions` is empty (or `max` is reached) — a real, deliberate divergence from `Combobox`'s
 * own choice to keep an empty listbox mounted, because `index.ts`'s own doc explicitly calls for "no
 * option list... once everything already picked," not just an empty one.
 */
export function createMultiSelect<E>(
  h: CreateElement<E>,
  hooks: MultiSelectHooks,
  changeEventProp: 'onChange' | 'onInput',
): (props: MultiSelectBaseProps) => E {
  const Button = createButton(h)
  const DefaultCloseIcon = createDefaultCloseIcon(h)

  return function MultiSelect(props: MultiSelectBaseProps): E {
    const {
      options,
      values: controlledValues,
      defaultValues = [],
      onValuesChange,
      allowCustomValue = false,
      inputValue: controlledInputValue,
      defaultInputValue = '',
      onInputValueChange,
      max,
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

    const baseId = hooks.useId()
    const inputId = id ?? baseId
    const listboxId = `${baseId}-listbox`
    const descriptionId = `${baseId}-selected-count`

    const isValuesControlled = controlledValues !== undefined
    const [internalValues, setInternalValues] = hooks.useState(defaultValues)
    const values = isValuesControlled ? controlledValues : internalValues

    const isInputControlled = controlledInputValue !== undefined
    const [internalInputValue, setInternalInputValue] = hooks.useState(defaultInputValue)
    const inputValue = isInputControlled ? controlledInputValue : internalInputValue

    const isOpenControlled = controlledOpen !== undefined
    const [internalOpen, setInternalOpen] = hooks.useState(defaultOpen)
    const open = isOpenControlled ? controlledOpen : internalOpen

    const [activeIndex, setActiveIndex] = hooks.useState<number | null>(null)

    const availableOptions = options.filter((option) => !values.includes(option.value))
    const atMax = max !== undefined && values.length >= max

    // Resets the highlighted option whenever the visible list's own content genuinely changes (a
    // new caller-filtered `options` set, or a chip just added/removed) — same `optionsKey` technique
    // `Combobox/index.ts`'s own doc explains in full (avoids resetting on every keystroke just
    // because the caller passed a fresh array literal, without depending on array identity).
    const optionsKey = availableOptions.map((option) => option.value).join(' ')
    const [previousOptionsKey, setPreviousOptionsKey] = hooks.useState(optionsKey)
    if (optionsKey !== previousOptionsKey) {
      setPreviousOptionsKey(optionsKey)
      setActiveIndex(null)
    }

    const setValues = (next: string[]) => {
      if (!isValuesControlled) setInternalValues(next)
      onValuesChange?.(next)
    }
    const setInputValue = (next: string) => {
      if (!isInputControlled) setInternalInputValue(next)
      onInputValueChange?.(next)
    }
    const setOpen = (next: boolean) => {
      if (!isOpenControlled) setInternalOpen(next)
      onOpenChange?.(next)
      if (!next) setActiveIndex(null)
    }

    const removeValue = (value: string) => {
      setValues(values.filter((current) => current !== value))
    }

    // Shared by both a real option selection and a raw free-text commit — adds the chip (a no-op if
    // already present or `max` is reached), then clears the input, ready for the next pick.
    const commitValue = (value: string) => {
      if (atMax || values.includes(value)) return
      setValues([...values, value])
      setInputValue('')
      setActiveIndex(null)
    }

    const selectOption = (option: MultiSelectOption) => {
      if (option.disabled) return
      commitValue(option.value)
    }

    // Mode 2 only (`allowCustomValue`) — an exact (case-insensitive) label match selects that
    // existing option instead of creating a duplicate-looking chip; anything else becomes a new
    // free-text chip. See `index.ts`'s own doc for the full contract.
    const commitTypedText = () => {
      const trimmed = inputValue.trim()
      if (trimmed === '') return
      const match = availableOptions.find(
        (option) => !option.disabled && option.label.toLowerCase() === trimmed.toLowerCase(),
      )
      commitValue(match ? match.value : trimmed)
    }

    const inputRef = hooks.useRef<HTMLInputElement | null>(null)
    const listboxRef = hooks.useRef<HTMLUListElement | null>(null)
    const containerRef = hooks.useRef<HTMLSpanElement | null>(null)

    const position = hooks.usePosition(inputRef, listboxRef, open, { placement, offset })

    hooks.useCloseOnOutside(containerRef, open, () => setOpen(false))

    const handleChange = (event: { target: { value: string } }) => {
      const next = event.target.value
      if (isInputControlled) {
        // Same real, confirmed React/Preact divergence `Input/render.ts`'s own `handleChange`
        // already documents in full: React silently restores a controlled `<input>`'s real DOM
        // `.value` back to the current controlled prop after a native change event the caller
        // declined to accept; Preact has no equivalent restoration step. Doing this unconditionally
        // here is a no-op for React (already consistent with its own internal restore) and the real
        // fix for Preact.
        if (next !== inputValue) event.target.value = inputValue
      } else {
        setInternalInputValue(next)
      }
      onInputValueChange?.(next)
      if (!open) setOpen(true)
    }

    const handleFocus = () => setOpen(true)
    const handleBlur = () => {
      setOpen(false)
      if (allowCustomValue) commitTypedText()
    }

    // No current option → `ArrowDown` lands on the first, `ArrowUp` on the last — same shape
    // `Combobox/index.ts`'s own `nextIndexFor` already establishes.
    const nextIndexFor = (key: string): number | null => {
      if (availableOptions.length === 0) return null
      if (activeIndex === null) {
        if (key === 'ArrowDown' || key === 'Home') return 0
        if (key === 'ArrowUp' || key === 'End') return availableOptions.length - 1
        return null
      }
      return getNextRovingIndex(activeIndex, key, availableOptions.length, 'vertical')
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // The common tag-input convention: `Backspace` on an already-empty input removes the LAST
      // committed chip, in both modes.
      if (event.key === 'Backspace' && inputValue === '' && values.length > 0) {
        event.preventDefault()
        removeValue(values[values.length - 1])
        return
      }

      if (event.key === 'Escape') {
        if (!open) return
        event.stopPropagation()
        setOpen(false)
        return
      }

      if (event.key === 'Enter') {
        if (activeIndex !== null) {
          const option = availableOptions[activeIndex]
          if (option) {
            event.preventDefault()
            selectOption(option)
          }
          return
        }
        if (allowCustomValue && inputValue.trim() !== '') {
          event.preventDefault()
          commitTypedText()
        }
        return
      }

      const nextIndex = nextIndexFor(event.key)
      if (nextIndex === null || nextIndex === activeIndex) return
      event.preventDefault()
      if (!open) setOpen(true)
      setActiveIndex(nextIndex)
    }

    const activeOption = activeIndex !== null ? availableOptions[activeIndex] : undefined
    const activeOptionId = activeOption ? `${baseId}-option-${activeOption.value}` : undefined
    // See this file's own doc, "Already-committed options are excluded..." — the listbox doesn't
    // render at all once nothing real is left to offer, rather than mounting an empty `<ul>`.
    const listboxVisible = open && !atMax && availableOptions.length > 0

    const describedBy = [ariaDescribedBy, descriptionId].filter(Boolean).join(' ')

    const chips = values.map((value, index) => {
      const option = options.find((candidate) => candidate.value === value)
      const label = option?.label ?? value
      return h(
        'span',
        {
          key: `chip-${index}`,
          id: `${baseId}-chip-${index}`,
          'data-space-ui': 'multi-select-chip',
        },
        // Two fixed, statically-known children passed variadically (never wrapped in an array) —
        // no `key` needed on either, since a `key` is only ever required for a dynamically-built
        // array of siblings (like `chips` itself, one level up). `Button`'s own strict `ButtonProps`
        // type has no `key` field to accept one anyway — the same reason `RadioGroup`/`Tabs`' own
        // composed `Button()` calls never pass one directly either, wrapping in a keyed `Fragment`
        // instead only when the array shape actually requires it.
        h('span', null, label),
        Button({
          onClick: () => removeValue(value),
          label: `Remove ${label}`,
          children: DefaultCloseIcon(),
        }),
      )
    })

    const chipsWrapper = values.length > 0
      ? h('span', { key: 'chips', 'data-space-ui': 'multi-select-chips' }, chips)
      : null

    // A visually-hidden running count, referenced via the input's own `aria-describedby` — the
    // "reasonable addition" `index.ts`'s own doc names, reusing `shared/live-region.ts`'s own
    // `VISUALLY_HIDDEN_STYLE` (plain hidden-but-announced styling, not an `aria-live` region — this
    // is a static description, not a transient announcement, so `liveRegionProps` itself doesn't
    // apply here).
    const description = h(
      'span',
      { key: 'description', id: descriptionId, style: VISUALLY_HIDDEN_STYLE },
      `${values.length} item${values.length === 1 ? '' : 's'} selected`,
    )

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
      'aria-expanded': listboxVisible,
      'aria-controls': listboxId,
      'aria-autocomplete': 'list',
      'aria-activedescendant': listboxVisible ? activeOptionId : undefined,
      'aria-describedby': describedBy || undefined,
      'aria-invalid': ariaInvalid,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'data-space-ui': 'multi-select',
      [changeEventProp]: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
    })

    const listbox = listboxVisible
      ? h(
        'ul',
        {
          key: 'listbox',
          id: listboxId,
          ref: listboxRef,
          role: 'listbox',
          'data-space-ui': 'multi-select-listbox',
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
        availableOptions.map((option, index) =>
          h('li', {
            key: option.value,
            id: `${baseId}-option-${option.value}`,
            role: 'option',
            'aria-selected': false,
            'aria-disabled': option.disabled || undefined,
            'data-space-ui': 'multi-select-option',
            onMouseEnter: () => setActiveIndex(index),
            onMouseDown: (event: Event) => event.preventDefault(),
            onClick: () => selectOption(option),
          }, option.label)
        ),
      )
      : null

    return h('span', { ref: containerRef, style: { display: 'contents' } }, [
      chipsWrapper,
      description,
      input,
      listbox,
    ])
  }
}
