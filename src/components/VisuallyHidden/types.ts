/** Props for {@linkcode VisuallyHidden}. */
export type VisuallyHiddenProps = {
  /** The content to hide visually while keeping it announced to assistive technology — required,
   * an empty visually-hidden element has nothing useful to announce. */
  children: unknown
  id?: string
  className?: string
  /** This component's own clip-and-collapse styling lives in a self-rendered
   * `<style nonce={nonce}>` element, never an inline `style` attribute — required only when the
   * consuming page runs a nonce-based `style-src` CSP (`@zanix/space`'s own zero-config default is
   * exactly this shape); without a matching nonce, a strict CSP blocks this component's own
   * `<style>` element, leaving its content visually UNHIDDEN (a real fallback, never a crash) until
   * a matching nonce is supplied. Omit `nonce` entirely when no such CSP is in effect — nothing
   * here changes. */
  nonce?: string
}
