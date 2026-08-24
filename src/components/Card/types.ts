import type { ImageProps } from 'components/Image/types.ts'
import type { LinkProps } from 'components/Link/types.ts'

/** {@linkcode ImageProps} plus the one layout decision that's Card's own concern, not Image's:
 * which side the image sits on in the side-by-side (desktop) layout. Every other Image
 * capability — `sources`, `placeholder`, `loading`, `fetchPriority`, … — passes straight through
 * unchanged; Card never re-implements or duplicates any of it. */
export type CardImageProps = ImageProps & {
  /** `'left'` puts the image in the first column (text in the second); `'right'` (also the
   * default when omitted) puts it in the second column (text in the first) — same default the
   * component this rescues used. Has no effect on the stacked layout, where the image always
   * renders last regardless. */
  align?: 'left' | 'right'
}

/**
 * Props for {@linkcode Card}. See `render.ts`'s own doc for the full contract, especially how the
 * stacked/side-by-side layout is expressed entirely as CSS (`shared/card.css`), never JavaScript.
 */
export type CardProps = {
  /** The root element. `'article'` for a genuinely self-contained piece of content (the usual
   * case); `'div'` when semantics are already provided by an ancestor. Defaults to `'div'`. */
  type?: 'article' | 'div'
  /** Already-resolved title text — this component never interprets it as an i18n key or a
   * markup string, same "already-resolved data as props" principle as every other component
   * here. Rendered as an `<h2>`; omit entirely if that heading level doesn't fit the page's own
   * hierarchy — Card doesn't expose a way to change it in this first version. */
  title?: string
  /** Same resolution rules as {@linkcode title}. Rendered as an `<h5>`. */
  subtitle?: string
  /** Already-composed content — a string renders as plain text, not interpreted as markup.
   * Deliberately not richer than that: rich/markup content parsing is `RichText`'s own concern
   * (ICU rich-text tags or literal Markdown); Card doesn't duplicate that logic — compose a
   * `RichText` element as `content` instead when markup rendering is needed. */
  content: unknown
  /** Rendered as one {@linkcode Link} per entry, reusing that component exactly — no bespoke
   * link-rendering logic here. */
  footer?: LinkProps[]
  image?: CardImageProps
  /**
   * Explicit override for the stacked/side-by-side choice. Omitted (the default) means
   * automatic: stacked below 721px, side-by-side at or above it, resolved entirely by a CSS media
   * query — this component runs no viewport detection of any kind. `true` always stacks; `false`
   * always uses the side-by-side layout — either way, regardless of the real viewport. There is
   * no third "auto" value to pass explicitly; omitting the prop **is** auto.
   */
  stacked?: boolean
  id?: string
  className?: string
}
