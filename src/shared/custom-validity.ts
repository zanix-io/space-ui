/**
 * Applies a caller-owned validation message to a native form control through the browser's own
 * constraint validation: a non-empty `message` marks the control invalid (`validity.customError`,
 * `:invalid`, `checkValidity()` false, a blocked submit with the browser's own bubble), and an empty
 * or missing one clears it.
 *
 * The helper holds no state and imports no renderer, so each binding calls it from its own effect.
 * It does nothing for a missing element (a server render has none) or one without
 * `setCustomValidity`.
 *
 * @param element - The real control, usually a ref's `current`.
 * @param message - The message to show, or `undefined`/`''` for no custom error.
 */
export function applyCustomValidity(
  element: { setCustomValidity?: (message: string) => void } | null | undefined,
  message: string | undefined,
): void {
  element?.setCustomValidity?.(message ?? '')
}

/** The `useEffect` both renderers provide, in the one shape the hook below needs: React's and
 * Preact's own `useEffect` are both assignable to it, so a binding passes its own. */
export type UseCustomValidityEffect = (
  effect: () => void | (() => void),
  deps?: readonly unknown[],
) => void

/**
 * Keeps a native control's custom validity in step with the caller's `message`: the effect applies
 * it after every change of the message, and its cleanup clears it before the next one is applied
 * and when the component unmounts. A server render runs no effect, so nothing is set there.
 *
 * `control` is the ref of the real `<input>`/`<textarea>`. The element is captured when the effect
 * runs, never read again in the cleanup, because React nulls `ref.current` before an unmount
 * cleanup runs and Preact does not: reading it late would leave the error set on a detached node in
 * one renderer only.
 *
 * @param useEffect - The renderer's own `useEffect`.
 * @param control - Ref to the real control.
 * @param message - The caller's validation message, or `undefined`/`''` for none.
 */
export function useCustomValidity(
  useEffect: UseCustomValidityEffect,
  control: { current: { setCustomValidity?: (message: string) => void } | null },
  message: string | undefined,
): void {
  useEffect(() => {
    const element = control.current
    applyCustomValidity(element, message)
    return () => applyCustomValidity(element, undefined)
  }, [message])
}
