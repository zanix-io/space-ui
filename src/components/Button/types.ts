/** WAI-ARIA button-based widget roles whose spec makes `aria-checked` a REQUIRED companion
 * attribute, not optional — a `role="switch"` with no `aria-checked` is a broken widget, not just
 * an incomplete one. */
export type CheckedButtonRole =
  | 'switch'
  | 'checkbox'
  | 'radio'
  | 'menuitemcheckbox'
  | 'menuitemradio'

/** The fields every `Button` variant shares, regardless of `role` — see {@linkcode ButtonProps}'s
 * own doc for the `role`-specific fields layered on top. */
export type BaseButtonProps = {
  /**
   * Optional on purpose — a `type="submit"` button inside a `<form>` often has no handler of its
   * own; it just submits the form natively. Typed against the generic DOM `Event`, not a
   * renderer-specific synthetic event type — this file never imports React or Preact.
   */
  onClick?: (event: Event) => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  /**
   * Accessible label override. A `<button>` with visible text `children` already has that text as
   * its accessible name by native HTML semantics — `label` is for the icon-only case, where
   * `children` isn't readable text on its own. Never required by this component's own types: it
   * would be redundant to force it whenever `children` already describes the button.
   */
  label?: string
  title?: string
  className?: string
  children?: unknown
  /**
   * The two native attributes that complete the `type="submit"` story: a form with several
   * actions (`<button type="submit" name="action" value="delete">` vs. `value="archive">`) uses
   * these to tell the server which button was actually pressed. Both real, standards-based native
   * attributes — not something specific to this component.
   */
  name?: string
  value?: string
}

/**
 * Props for {@linkcode Button}. A native `<button>` already has an implicit role of `"button"` —
 * `role` is only for a widget pattern built ON TOP of a button. Each supported `role` is paired,
 * at the TYPE level, with the state its own WAI-ARIA spec requires alongside it — `role: 'switch'`
 * is a compile error without `checked`, the same way `role: 'tab'` is without `selected`. Neither
 * of those has a sensible default `Button` could supply on its own — whether a switch is on, or
 * which tab is active, is always caller-owned state — so the type makes forgetting it impossible
 * instead of documenting the requirement in prose and hoping it's read.
 */
export type ButtonProps =
  & BaseButtonProps
  & (
    | { role?: undefined | 'menuitem' }
    | { role: CheckedButtonRole; checked: boolean }
    | { role: 'tab'; selected: boolean }
  )
