/** Props for {@linkcode Alert}. */
export type AlertProps = {
  children: unknown
  /**
   * `'assertive'` (default) → `role="alert"`, interrupts assistive technology immediately —
   * for errors and other time-sensitive messages. `'polite'` → `role="status"`, announced once
   * the user is idle — for confirmations ("Saved successfully") that don't need to interrupt.
   * Both roles are implicit live regions on their own (`role="alert"` implies `aria-live="assertive"`,
   * `role="status"` implies `aria-live="polite"`) — no explicit `aria-live` attribute needed.
   * @default 'assertive'
   */
  politeness?: 'assertive' | 'polite'
  id?: string
  className?: string
}
