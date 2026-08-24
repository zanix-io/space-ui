import type { CreateElement } from 'typings/renderer.ts'
import type { InputBaseProps } from './types.ts'

/** The subset of `useState` this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here). */
export type InputHooks = {
  useState: <T>(initial: T) => [T, (value: T | ((current: T) => T)) => void]
}

/**
 * The real implementation of `Input`, shared identically between the React and Preact bindings —
 * same `render.ts`-factory technique `RadioGroup`/`Table` already use, extended with one more
 * injected parameter beyond `h`/`hooks`: `changeEventProp`.
 *
 * ## Why a third parameter instead of a full second implementation
 *
 * A live-typing text `<input>` has exactly the one real, confirmed React/Preact divergence
 * `Combobox`'s own `index.ts`/`index.preact.ts` docs already establish: React deliberately remaps
 * its own `onChange` prop to the native `input` event (fires on every keystroke) for every
 * text-like input type; Preact maps prop names to native event types literally, so ITS `onChange`
 * means the literal native `change` event (fires only on blur/commit) — using `onChange` in the
 * Preact binding would silently only pick up the final typed value once focus left the field, not
 * live per-keystroke updates. Unlike `Combobox`, where the same divergence also touched the
 * handler's own event-target TYPING (`ChangeEvent<HTMLInputElement>` vs. `JSX.TargetedEvent`,
 * forcing a real second `handleChange`/`handleInput` implementation), the divergence here is
 * narrow enough to isolate to a single computed prop key: `changeEventProp` is `'onChange'` for the
 * React binding, `'onInput'` for the Preact one (see each `index.ts` for the real value passed),
 * and the handler body itself stays identical — deliberately typed against a minimal structural
 * shape (`{ target: { value: string } }`), true of both renderers' real event target at runtime for
 * an `<input>` element, so no per-renderer cast is needed the way `Combobox/index.preact.ts` needed
 * one. This matches `space-ui-component-patterns`' own "shared body with a small isolable branch"
 * allowance for this exact divergence shape, rather than defaulting to a full second
 * implementation.
 *
 * `min`/`max`/`step` are passed through even for non-`number` types, same as the native attribute
 * itself (a no-op the browser ignores) — this component doesn't gate them by `type`, consistent
 * with `space-ui-architecture`'s seam 7 (a thin passthrough, not a reimplementation of `<input>`'s
 * own per-`type` attribute rules).
 *
 * See `index.ts`'s own doc for the full public behavioral contract (controlled `value`, composing
 * inside `Field`) — not repeated here.
 */
export function createInput<E>(
  h: CreateElement<E>,
  hooks: InputHooks,
  changeEventProp: 'onChange' | 'onInput',
): (props: InputBaseProps) => E {
  return function Input(props: InputBaseProps): E {
    const {
      type = 'text',
      value: controlledValue,
      defaultValue = '',
      onValueChange,
      placeholder,
      disabled,
      readOnly,
      required,
      autoComplete,
      min,
      max,
      step,
      maxLength,
      pattern,
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
        // A real, confirmed React/Preact divergence for a CONTROLLED text input specifically,
        // found by this component's own test suite, not assumed: React's internal event system
        // silently restores a controlled `<input>`'s real DOM `.value` back to the current
        // controlled prop right after a native change event, whenever nothing re-rendered it to
        // the new value in the meantime — the mechanism that makes "a controlled input rejects
        // this keystroke" (a real, common validation pattern: `onValueChange` receives the typed
        // value but the caller's own state setter declines to update) actually work without the
        // DOM silently drifting out of sync with `value` until some unrelated re-render happens
        // to fix it. Preact has no equivalent restoration step. Doing this unconditionally in the
        // shared body (not a Preact-only branch) is deliberate: for React it's a no-op (already
        // consistent with what React's own internal restore already produces), for Preact it's
        // the real fix — same "isolable, safe to share" shape as `changeEventProp` above, just a
        // synchronous DOM write instead of a computed prop key.
        if (next !== value) event.target.value = value
      } else {
        setInternalValue(next)
      }
      onValueChange?.(next)
    }

    return h('input', {
      type,
      value,
      placeholder,
      disabled,
      readOnly,
      required,
      autoComplete,
      min,
      max,
      step,
      maxLength,
      pattern,
      name,
      id,
      className,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'data-space-ui': 'input',
      [changeEventProp]: handleChange,
    })
  }
}
