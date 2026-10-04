/**
 * The marker a composed control with no native field puts on its own element while it is
 * `required` and empty. `Select`, `DatePicker` and `RadioGroup` keep their value in component
 * state and render no `<input>`, so the browser's constraint validation cannot see `required` on
 * them. The attribute is the one signal a form-level validator (`@zanix/space`'s `ManagedForm`
 * `validateInline`) can read from the DOM: `data-value-missing="true"` on the trigger's wrapper of
 * a `Select`/`DatePicker` and on the `role="radiogroup"` root of a `RadioGroup`, the DOM
 * counterpart of `validity.valueMissing`. It is absent whenever the control has a value or is not
 * `required`, and it blocks nothing by itself: without such a validator it only sits in the markup.
 *
 * @module
 */

/** `'true'` while a `required` control has no value, `undefined` (no attribute) otherwise. */
export function valueMissingAttribute(
  required: boolean | undefined,
  empty: boolean,
): 'true' | undefined {
  return required && empty ? 'true' : undefined
}
