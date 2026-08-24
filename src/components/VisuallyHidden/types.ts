/** Props for {@linkcode VisuallyHidden}. */
export type VisuallyHiddenProps = {
  /** The content to hide visually while keeping it announced to assistive technology — required,
   * an empty visually-hidden element has nothing useful to announce. */
  children: unknown
  id?: string
  className?: string
}
