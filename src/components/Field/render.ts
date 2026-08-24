import type { CreateElement } from 'typings/renderer.ts'
import { createAlert } from '../Alert/render.ts'
import type { FieldBaseProps, FieldRenderProps } from './types.ts'

/**
 * The subset of hooks this component's shared body needs, injected alongside `h` — same
 * `render.ts`-factory technique {@linkcode createTable}'s own `TableHooks` established (see
 * `Table/render.ts`'s own doc for the full soundness reasoning, not repeated here).
 */
export type FieldHooks = {
  useId: () => string
}

/** {@linkcode FieldBaseProps} plus the render-prop that supplies the actual form control, generic
 * over the renderer's own node type — `index.ts`/`index.preact.ts` each instantiate this as their
 * own public `FieldProps`, with `ReactNode`/`ComponentChildren`. */
export type FieldRenderComponentProps<Node> = FieldBaseProps & {
  children: (fieldProps: FieldRenderProps) => Node
}

/**
 * The real implementation of `Field`, shared identically between the React and Preact bindings —
 * same pattern as `Table/render.ts`. Composes the real `Alert` (via its own `render.ts` factory,
 * bound to the same `h`) for the error message — inherits its own `data-space-ui="alert"` hook,
 * never a redundant one of its own; the root `<div>` itself carries `data-space-ui="field"`.
 * `Fragment` is injected as its own parameter (not a hook) for the same reason `Menu/render.ts`
 * already documents — needed here so the render-prop's own arbitrary output can sit alongside the
 * label/hint/error as one of several children with a real `key`.
 *
 * See `index.ts`'s own doc for the full public behavioral contract (why `children` is a
 * render-prop here specifically, why the error message composes `Alert`) — not repeated here.
 */
export function createField<E, Node>(
  h: CreateElement<E>,
  hooks: FieldHooks,
  Fragment: unknown,
): (props: FieldRenderComponentProps<Node>) => E {
  const Alert = createAlert(h)
  const hAny = h as unknown as (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => E

  return function Field(props: FieldRenderComponentProps<Node>): E {
    const { label, error, hint, id, className, children } = props
    const generatedId = hooks.useId()
    const fieldId = id ?? generatedId
    const inputId = `${fieldId}-input`
    const hintId = hint ? `${fieldId}-hint` : undefined
    const errorId = error ? `${fieldId}-error` : undefined
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

    const errors = Array.isArray(error) ? error : error ? [error] : []

    return h(
      'div',
      { id: fieldId, className, 'data-space-ui': 'field' },
      [
        h('label', { key: 'label', htmlFor: inputId }, label),
        hAny(
          Fragment,
          { key: 'control' },
          children({
            id: inputId,
            'aria-describedby': describedBy,
            'aria-invalid': error ? true : undefined,
          }),
        ),
        hint ? h('p', { key: 'hint', id: hintId }, hint) : null,
        errors.length > 0
          ? hAny(Alert, {
            key: 'error',
            id: errorId,
            children: errors.length > 1
              ? h('ul', {}, errors.map((message) => h('li', { key: message }, message)))
              : errors[0],
          })
          : null,
      ],
    )
  }
}
