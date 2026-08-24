import type { CreateElement } from 'typings/renderer.ts'
import type { ButtonProps } from './types.ts'

/**
 * The real implementation of `Button`, shared identically between the React and Preact bindings —
 * same pattern as `Icon/render.ts`. Always a real `<button>` element — never an `<a>` styled to
 * look like one (see `Link`'s own doc for why that split exists: an action belongs on a `<button>`
 * for real keyboard/`disabled`/assistive-technology semantics, navigation belongs on an `<a>`).
 *
 * Carries `data-space-ui="button"` — a stable, semver-protected identity hook for consumer-side
 * theming. Inert on its own: no CSS ships with this package, and nothing here reads or reacts to
 * this attribute — it exists only so a consumer's own stylesheet has something of `space-ui`'s to
 * target without resorting to a bare `button` element selector. Not part of this component's
 * documented prop API — `className` remains the primarily supported styling path.
 */
export function createButton<E>(h: CreateElement<E>): (props: ButtonProps) => E {
  return function Button(props: ButtonProps): E {
    const {
      onClick,
      type = 'button',
      disabled,
      label,
      title,
      className,
      children,
      role,
      name,
      value,
      id,
      tabIndex,
      'aria-expanded': ariaExpanded,
      'aria-controls': ariaControls,
      'aria-current': ariaCurrent,
    } = props
    // `checked`/`selected` only exist on the role-specific branches of the ButtonProps union (see
    // that type's own doc) — read via a narrowed local, never destructured directly off `props`,
    // so this stays correct if a future role variant adds a THIRD such companion field with a
    // different name.
    const checked = 'checked' in props ? props.checked : undefined
    const selected = 'selected' in props ? props.selected : undefined

    return h('button', {
      type,
      disabled,
      className,
      title,
      'data-space-ui': 'button',
      onClick,
      role,
      name,
      value,
      id,
      tabIndex,
      'aria-label': label,
      'aria-checked': checked,
      'aria-selected': selected,
      'aria-expanded': ariaExpanded,
      'aria-controls': ariaControls,
      'aria-current': ariaCurrent,
    }, children)
  }
}
