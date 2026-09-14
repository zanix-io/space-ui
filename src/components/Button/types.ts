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
   * Plain native passthrough, needed by any composing component that has to reference this exact
   * button from elsewhere in the DOM — `Tabs`'s own `aria-labelledby` on a tab's panel points back
   * at the tab `Button`'s own `id`, the same real ARIA requirement `RadioGroup`'s roving-tabindex
   * lookup avoided needing (it queries by `role` instead, since it never needs to reference one
   * specific button by id from a DIFFERENT element).
   */
  id?: string
  /**
   * Plain native passthrough — the one escape hatch a roving-tabindex widget (`RadioGroup`, `Tabs`)
   * needs: exactly one item in the set carries `tabIndex={0}` (normal tab order), every other one
   * `tabIndex={-1}` (removed from the tab sequence, still focusable programmatically via
   * `.focus()`). Native `<button>` defaults to an implicit `0` — this is only ever passed
   * explicitly by a composing component that owns the roving-tabindex bookkeeping; `Button` itself
   * has no opinion on when to use it.
   */
  tabIndex?: number
  /**
   * The two native attributes that complete the `type="submit"` story: a form with several
   * actions (`<button type="submit" name="action" value="delete">` vs. `value="archive">`) uses
   * these to tell the server which button was actually pressed. Both real, standards-based native
   * attributes — not something specific to this component.
   */
  name?: string
  value?: string
  /**
   * Plain native ARIA passthrough for a button that discloses/controls another element — an
   * accordion trigger, a combobox, a disclosure toggle. Forwarded verbatim to the real `<button>`
   * as the literal `aria-expanded`/`aria-controls` attributes, keyed exactly as written here (React
   * and Preact both special-case `aria-*`/`data-*` prop keys, never camelCasing them) — no
   * component-owned disclosure/open-close logic lives here, this is the same "plain attribute
   * passthrough" contract `title` already is. `aria-expanded` renders as the literal string
   * `"false"` when explicitly `false`, identically to `aria-checked`/`aria-selected` above — an
   * ARIA boolean's absence and its `"false"` value mean different things to assistive technology,
   * unlike a native boolean attribute such as `disabled`.
   */
  'aria-expanded'?: boolean
  'aria-controls'?: string
  /**
   * Plain native ARIA passthrough for a button that's one of a set representing the current
   * selection — a slide-picker dot, a paginated step, a wizard page. Same "plain attribute
   * passthrough" contract as `title`/`aria-expanded` above, forwarded verbatim as the literal
   * `aria-current` attribute — no component-owned "which one is selected" logic lives here.
   * Accepts the full token set the ARIA spec defines for `aria-current` (a bare `true`/`false` is
   * also valid per spec, distinct from the enumerated tokens); most callers only ever need `true`.
   */
  'aria-current'?: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
  /**
   * Plain native ARIA passthrough for the WAI-ARIA "pressed button" toggle pattern — a button that
   * flips a persistent on/off state without changing its own implicit `role="button"`, unlike
   * `role="switch"` (a real role change with its own required `checked` companion, see
   * {@linkcode CheckedButtonRole}'s own doc) or a roving-tabindex `role="radio"` set (`RadioGroup`'s
   * own single-select pattern). Same "plain attribute passthrough" contract as `title`/
   * `aria-expanded`/`aria-current` above, forwarded verbatim as the literal `aria-pressed`
   * attribute — no component-owned pressed/toggle logic lives here, the caller always owns whether
   * the button is currently pressed, the same way `aria-current`'s caller owns the current
   * selection. Accepts the full token set the ARIA spec defines for `aria-pressed` (`true`/`false`,
   * or `'mixed'` for a toggle representing a partially-applied state across a mixed selection —
   * e.g. a "bold" button while both bold and non-bold text are selected); most callers only ever
   * need a plain boolean.
   */
  'aria-pressed'?: boolean | 'mixed'
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
