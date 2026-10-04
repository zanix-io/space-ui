/**
 * Announces, as a native `change` event, a value change the visitor made in a composed control
 * (`Select`, `DatePicker`, `MultiSelect`, `Combobox`, `RadioGroup`). These controls hold their
 * value in component state and render no native field the browser would fire `change` from, so
 * nothing observable reaches the surrounding `<form>`; a delegated `input`/`change` listener on
 * the form (`@zanix/space`'s `ManagedForm` `clearInvalidOnInput`, for one) never sees the edit.
 * The event is a plain bubbling `Event` fired on the control's own focusable element (the one
 * that carries `aria-invalid` and `aria-describedby`), right after the component's own
 * `onValueChange`-style callback, so a listener on that element or any ancestor receives it.
 * Call it only from a user interaction handler, never from an effect or a controlled-value sync.
 *
 * @module
 */

/** Fires a bubbling `change` event on `element`. A missing element (not mounted yet, or an
 * environment without the DOM `Event`) is a no-op. */
export function emitValueChange(element: Element | null | undefined): void {
  if (!element || typeof Event !== 'function') return
  element.dispatchEvent(new Event('change', { bubbles: true }))
}
