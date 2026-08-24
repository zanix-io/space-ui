import type { FormatMessageValues } from 'intl/formatter.ts'

/**
 * `'icu'` (default): `content` is looked up as a message id against the current `<IntlProvider>`
 * catalog (itself as the fallback if it isn't a real key — the same convention plain
 * `formatMessage` already has), then parsed for ICU rich-text tags (`<b>`, `<props>`, the built-in
 * table `RichText/tags.ts` provides, plus any caller-supplied `tags`).
 *
 * `'markdown'`: `content` is parsed as literal Markdown text directly — no catalog lookup, no ICU
 * parsing at all. Deliberately NOT run through `formatMessage`/ICU first, unlike `'icu'` mode: ICU
 * MessageFormat uses `{...}` for its own interpolation/plural syntax, and real Markdown content
 * (a fenced code block showing JSON or CSS, for one) commonly contains literal curly braces —
 * running it through the ICU parser first risks misinterpreting that as ICU syntax before Markdown
 * ever sees it. `values` has no effect in this mode (nothing consumes it) — a deliberate, real
 * asymmetry between the two modes, not an oversight.
 *
 * No sniffing by content or by where `content` came from — this prop is the one, explicit,
 * always-tested switch between the two, exactly as requested: `content="hello **world**"` alone
 * never implicitly decides whether `**world**` is literal ICU text or Markdown emphasis.
 *
 * @default 'icu'
 */
export type RichTextContentFormat = 'icu' | 'markdown'

/** Props shared by both renderer bindings — see each binding's own `index.ts`/`index.preact.ts`
 * for the renderer-bound `tags` prop, which needs the concrete `ReactNode`/Preact node type. */
export type RichTextBaseProps = {
  /**
   * In `'icu'` mode (the default): a message id, or literal ICU-tagged text used as its own
   * fallback. In `'markdown'` mode: literal Markdown text, used directly, never a catalog id.
   */
  content: string
  /** @default 'icu' */
  contentFormat?: RichTextContentFormat
  /** ICU interpolation/plural/select values — same shape `useIntl().formatMessage` already takes.
   * Has no effect in `'markdown'` mode. */
  values?: FormatMessageValues
}
