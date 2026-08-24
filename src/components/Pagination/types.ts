/** Props shared by both the React and Preact `Pagination` bindings. */
export type PaginationBaseProps = {
  /** Total number of pages — `Pagination` renders nothing (`null`) when this is `1` or less, same
   * "nothing meaningful to show" convention `Modal` already has for its own closed state. */
  totalPages: number
  /**
   * Controlled current page (1-indexed) — when given, this component's own internal state is
   * never the source of truth; the caller must update this prop (typically from `onPageChange`)
   * for the active page to actually change. Omit for the uncontrolled default, where `defaultPage`
   * seeds the first render and this component tracks the rest itself. Always wins over
   * `defaultPage` when both are given — ignored, not invalid, same contract established
   * throughout this component family.
   */
  page?: number
  /** Initial current page — seeds the first render only, ignored once `page` is given.
   * @default 1 */
  defaultPage?: number
  /** Called whenever the page changes — a click on a page number, Previous, or Next — regardless
   * of whether `page` is controlled. Fires even in the uncontrolled case (same "always notify"
   * contract established throughout). */
  onPageChange?: (page: number) => void
  /**
   * When given, each page item (including Previous/Next) renders as a real, navigable `Link`
   * (`href={getPageHref(page)}`, `onClick` still fires `onPageChange` alongside it — same
   * "navigation plus an optional side effect" contract `Link.onClick` already has) instead of a
   * plain `Button`. `Pagination` never constructs a URL/query-string itself — this package never
   * owns URL or routing state — the caller decides the shape entirely. Omit for pure client-state
   * pagination with no URL of its own.
   */
  getPageHref?: (page: number) => string
  /** How many page numbers to show on each side of the current page before collapsing the rest
   * into an ellipsis — see `get-pagination-items.ts`'s own doc for the exact windowing rule.
   * @default 1 */
  siblingCount?: number
  /** Accessible name for the root `<nav>`.
   * @default 'Pagination' */
  label?: string
  id?: string
  className?: string
}
