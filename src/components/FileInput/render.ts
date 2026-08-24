import type { CreateElement } from 'typings/renderer.ts'
import type { FileInputBaseProps } from './types.ts'

/** The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established, extended
 * here to real `useEffect`/`useRef` usage (the `Counter`-verified case, see that file's own doc
 * for the full soundness reasoning — not repeated here). */
export type FileInputHooks = {
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => void
  useRef: <T>(initial: T) => { current: T }
}

/**
 * The real implementation of `FileInput`, shared identically between the React and Preact
 * bindings — same `render.ts`-factory technique `Counter`/`RadioGroup` already use.
 *
 * ## No `onChange`/`onInput` split, unlike `Input` — checked, not assumed
 *
 * A file input has no per-keystroke concept at all (nothing is typed), so `Input`'s own reasoning
 * for needing a per-renderer `changeEventProp` doesn't automatically transfer — verified directly
 * against React's own `react-dom` source rather than assumed either way:
 * `react-dom-profiling.development.js`'s `getTargetInstForChangeEvent`/the dispatch logic
 * selecting it (real, installed `react-dom@19.2.8`, not paraphrased) special-cases `select` and
 * `input[type=file]` to use `getTargetInstForChangeEvent` — which only ever responds to the
 * literal native `"change"` `domEventName`, never `"input"` — unlike every text-like input type,
 * which gets `getTargetInstForInputOrChangeEvent` (`"input"` OR `"change"`) instead. In other
 * words: React's own `onChange` for a FILE input already means the literal native `change` event,
 * the exact same thing Preact's own `onChange` means for every element (Preact maps prop names to
 * native event types literally, with no per-type remapping at all). Both bindings can safely use
 * the plain `onChange` prop name here — confirmed a "trivial, resolvable difference once checked"
 * case (`space-ui-component-patterns`' own `Menu`/`Fragment` precedent for this shape), not the
 * `Combobox`/`Input` kind of real, forced divergence.
 *
 * ## `resetTrigger`: the one native mutation a script CAN make on a file input
 *
 * See `types.ts`'s own doc on {@linkcode FileInputBaseProps.resetTrigger} for the full contract —
 * this effect is the concrete implementation of it, gated on the ref actually being attached and
 * `resetTrigger` being a real, defined value (never fires on a component that never sets it).
 *
 * See `index.ts`'s own doc for the full public behavioral contract — not repeated here.
 */
export function createFileInput<E>(
  h: CreateElement<E>,
  hooks: FileInputHooks,
): (props: FileInputBaseProps) => E {
  return function FileInput(props: FileInputBaseProps): E {
    const {
      accept,
      multiple,
      capture,
      onFilesChange,
      resetTrigger,
      name,
      disabled,
      required,
      id,
      className,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
    } = props

    const ref = hooks.useRef<HTMLInputElement | null>(null)

    hooks.useEffect(() => {
      if (resetTrigger === undefined) return
      const input = ref.current
      if (!input) return
      input.value = ''
      onFilesChange?.([])
      // Only a real `resetTrigger` change should ever run this — `onFilesChange` is intentionally
      // not a dependency (same reasoning `Recaptcha/render.ts`'s own `verifyTrigger`/`resetTrigger`
      // effects already document for their own callback props).
    }, [resetTrigger])

    const handleChange = (event: { target: { files: ArrayLike<File> | null } }) => {
      onFilesChange?.(event.target.files ? Array.from(event.target.files) : [])
    }

    return h('input', {
      ref,
      type: 'file',
      accept,
      multiple,
      capture,
      name,
      disabled,
      required,
      id,
      className,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'data-space-ui': 'file-input',
      onChange: handleChange,
    })
  }
}
