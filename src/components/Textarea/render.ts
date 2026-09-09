import type { CreateElement } from 'typings/renderer.ts'
import type { TextareaBaseProps } from './types.ts'

/** The subset of `useState` this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createInput} already uses. */
export type TextareaHooks = {
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
}

/**
 * The real implementation of `Textarea`, shared identically between the React and Preact
 * bindings — `Input/render.ts`'s own `createInput` factory, adapted to a `<textarea>` element:
 * same hook-injection technique, same `changeEventProp` divergence, same controlled-value DOM
 * restoration fix, since all three are real, confirmed properties of React's/Preact's own event
 * systems that apply to `<textarea>` exactly as they do to `<input>` — React installs the
 * identical "value tracker" mechanism on a `<textarea>` element as it does on an `<input>`, and
 * remaps `onChange` to the native `input` event the same way for both; Preact maps prop names to
 * native event types literally for both as well. See `Input/render.ts`'s own doc for the full
 * "why a third parameter instead of a full second implementation" reasoning — not repeated here,
 * since nothing about that reasoning is specific to `<input>` over `<textarea>`.
 *
 * A `<textarea>` has no `type` prop (unlike `Input`) and no `min`/`max`/`step`/`pattern` (none of
 * which have a `<textarea>` equivalent) — `rows`/`cols`/`wrap` replace them as the attributes this
 * element actually supports, passed through just as thinly.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (controlled `value`, composing
 * inside `Field`) — not repeated here.
 */
export function createTextarea<E>(
  h: CreateElement<E>,
  hooks: TextareaHooks,
  changeEventProp: 'onChange' | 'onInput',
): (props: TextareaBaseProps) => E {
  return function Textarea(props: TextareaBaseProps): E {
    const {
      value: controlledValue,
      defaultValue = '',
      onValueChange,
      placeholder,
      disabled,
      readOnly,
      required,
      autoComplete,
      maxLength,
      rows = 4,
      cols,
      wrap,
      name,
      id,
      className,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
    } = props

    const isControlled = controlledValue !== undefined
    const [internalValue, setInternalValue] = hooks.useState(defaultValue)
    const value = isControlled ? controlledValue : internalValue

    const handleChange = (event: { target: { value: string } }) => {
      const next = event.target.value
      if (isControlled) {
        // Same real, confirmed React/Preact divergence `Input/render.ts` documents in full for a
        // controlled text `<input>` — applies identically to a controlled `<textarea>`, since
        // React's own DOM-value-restoration mechanism isn't specific to either element.
        if (next !== value) event.target.value = value
      } else {
        setInternalValue(next)
      }
      onValueChange?.(next)
    }

    return h('textarea', {
      value,
      placeholder,
      disabled,
      readOnly,
      required,
      autoComplete,
      maxLength,
      rows,
      cols,
      wrap,
      name,
      id,
      className,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'data-space-ui': 'textarea',
      [changeEventProp]: handleChange,
    })
  }
}
