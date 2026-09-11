/** The root element. `'section'` when this block is the only content of its own landmark region;
 * `'div'` (default) when semantics are already provided by an ancestor — same convention
 * `Card.type` already establishes. */
export type EmptyStateRootType = 'div' | 'section'

/** Heading level for {@linkcode EmptyStateBaseProps.heading} — a plain lever, not auto-detected:
 * this component has no way to know what level fits the page it's rendered into, the exact same gap
 * `Card.title`'s own fixed-`<h2>` doc discloses, just made adjustable here instead of fixed, since
 * `EmptyState` is equally likely to be a page-level block (a real gap, `<h2>` or higher fits) or
 * nested inside a `Card`/section that already has its own heading (a lower level fits better).
 * @default 'h3' */
export type EmptyStateHeadingLevel = 'h2' | 'h3' | 'h4'

/** Props for {@linkcode EmptyState}. See `render.ts`'s own doc for the full behavioral contract. */
export type EmptyStateBaseProps = {
  /** Already-resolved heading text — this component never interprets it as an i18n key or a markup
   * string, same "already-resolved data as props" principle as every other component here. */
  heading: string
  /** Already-resolved supporting text, plain string only (not interpreted as markup) — compose a
   * `RichText` element as a child of your own action slot instead when markup rendering is
   * needed, the same "Card.content doesn't duplicate RichText" boundary `Card`'s own doc already
   * draws. */
  description?: string
  /** @default 'h3' */
  headingLevel?: EmptyStateHeadingLevel
  /** @default 'div' */
  type?: EmptyStateRootType
  id?: string
  className?: string
}
