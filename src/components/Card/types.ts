import type { ImageProps } from 'components/Image/types.ts'
import type { LinkProps } from 'components/Link/types.ts'

/**
 * The renderer-agnostic fields of {@linkcode CardProps} — everything except `visual`, whose real
 * type depends on the renderer's own node type (see `render.ts`'s own `CardRenderProps<Node>` doc
 * for why, the same split {@linkcode MenuItemFields}/`MenuRenderItem<Node>` already establish).
 * `index.ts`/`index.preact.ts` each instantiate the full `CardProps` with `ReactNode`/
 * `ComponentChildren`. See `render.ts`'s own doc for the full contract, especially how the
 * stacked/side-by-side layout is expressed entirely as CSS (`shared/card.css`), never JavaScript.
 */
export type CardBaseProps = {
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
  /** Convenience sugar for the common case: builds the visual as `Image({ ...image, alt: '' })`,
   * using the comet-safe, root-barrel `Image` (never `@zanix/space-ui/runtime/image`'s
   * auto-resolving one — see `render.ts`'s own doc for why). `Omit<ImageProps, 'alt'>` because this
   * visual is always decorative, same reasoning `ImgButtonBaseProps.image` already has. Loses to
   * {@linkcode CardRenderProps.visual} when both are given — an explicit render-prop always wins
   * over this shorthand, since the caller opted into more control. A relative `src` here is NOT
   * auto-resolved (root-barrel `Image`'s own documented boundary — see
   * `components/Image/index.ts`'s own doc); an already-absolute URL (the common case) works exactly
   * as expected. */
  image?: Omit<ImageProps, 'alt'>
  /** Which column the `visual` sits in once the side-by-side (desktop) layout applies — Card's
   * own layout decision, not something the visual itself carries (previously nested under a
   * since-removed `image.align`, which conflated the two concerns). `'left'` puts it in the first
   * column (text in the second); `'right'` (also the default when omitted) puts it in the second
   * column (text in the first) — same default the component this rescues used. Has no effect on
   * the stacked layout, where the visual always renders last regardless, and no effect at all when
   * `visual` is omitted. */
  align?: 'left' | 'right'
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
