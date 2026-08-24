/** Props for {@linkcode Skeleton}. */
export type SkeletonProps = {
  /** Accessible label — omit for a purely decorative placeholder (default, `aria-hidden`); when
   * given, this becomes an accessible `role="status"` (e.g. `label="Loading"`), the same
   * "decorative by default, `label` switches it to accessible" convention `Icon.label`/
   * `ProgressBar.label` already establish. Usually left decorative: a page/list showing several
   * skeletons at once should announce "loading" ONCE from its own wrapper, not once per skeleton
   * — reserve `label` for a genuinely standalone skeleton with nothing else announcing for it. */
  label?: string
  id?: string
  className?: string
}
