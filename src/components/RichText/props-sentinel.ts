import { isPlainObject } from '@zanix/helpers'
import { parsePropsQuery } from './parse-props-query.ts'

/**
 * How `RichText`'s own `<props>` tag hands extra props to its enclosing tag — the direct
 * replacement for legacy's own `{{($...$)}}` string-marker mechanism (`useProperties.ts`'s own
 * `propertiesRegex`), and the reason population no longer round-trips through a string at all.
 *
 * ICU rich-text tags have no attribute syntax of their own — `<b>text</b>` can't carry extra props
 * inline the way an HTML tag can. Legacy's answer was a nested `<props>` tag whose own handler
 * returned a STRINGIFIED marker, later re-found by the enclosing tag's own handler via regex and
 * re-parsed. That round-trip is exactly where two real, confirmed bugs came from: a value
 * containing a literal `$` broke the regex outright, and for "component-type" tags any plain text
 * sibling that wasn't a marker got silently swallowed and misparsed as bogus querystring.
 *
 * This module keeps the same AUTHORING shape (a nested `<props>key=value&...</props>` tag,
 * querystring-shaped content) but never restringifies: `<props>`'s own handler parses its content
 * immediately and returns a typed sentinel value, carried through the chunks array as real data,
 * never text. The enclosing tag's own handler calls {@linkcode extractRichTextProps} once on its
 * children — that function tells a sentinel apart from ordinary content by an unexported `Symbol`
 * key, not by shape or regex, so no chunk value a caller/content author could ever construct
 * themselves is mistakable for one. The bug class this replaces is structurally impossible here,
 * not merely fixed by extra validation.
 *
 * Construction (`createRichTextPropsSentinel`) is deliberately NOT exported — only the built-in
 * `<props>` tag ever creates one; a custom tag supplied via `RichText`'s own `tags` prop only ever
 * needs to READ props out of its children (via `extractRichTextProps`), never mint new markers of
 * its own. `RichText` isn't meant to grow a second population syntax.
 */
const RICH_TEXT_PROPS_SENTINEL = Symbol('richTextPropsSentinel')

type RichTextPropsSentinel = {
  [RICH_TEXT_PROPS_SENTINEL]: true
  props: Record<string, unknown>
}

/** The `<props>` tag's own handler — parses its own text content immediately via
 * {@linkcode parsePropsQuery} and returns a sentinel, never a string. */
export function createRichTextPropsSentinel(query: string): RichTextPropsSentinel {
  return { [RICH_TEXT_PROPS_SENTINEL]: true, props: parsePropsQuery(query) }
}

function isRichTextPropsSentinel(value: unknown): value is RichTextPropsSentinel {
  return typeof value === 'object' && value !== null && RICH_TEXT_PROPS_SENTINEL in value
}

/**
 * Merge policy for two or more `<props>` blocks landing on the same enclosing tag — kept
 * deliberately identical to legacy's own `customPropsDefinition`, minus the BEM-specific
 * `styles`/`class` normalization this package doesn't have (see `docs/styling.md`'s own settled
 * position: no `useStyles` anywhere in this package). `className` concatenates (space-joined,
 * later blocks appended after earlier ones); a plain object-valued `style` prop shallow-merges
 * (later keys win per-key, not the whole object); every other key is last-write-wins.
 */
function mergeRichTextProps(
  base: Record<string, unknown>,
  next: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...base, ...next }

  const baseClassName = typeof base.className === 'string' ? base.className : undefined
  const nextClassName = typeof next.className === 'string' ? next.className : undefined
  if (baseClassName || nextClassName) {
    merged.className = [baseClassName, nextClassName].filter(Boolean).join(' ')
  }

  const baseStyle = isPlainObject(base.style) ? base.style : undefined
  const nextStyle = isPlainObject(next.style) ? next.style : undefined
  if (baseStyle || nextStyle) {
    merged.style = { ...baseStyle, ...nextStyle }
  }

  return merged
}

/**
 * The one call every tag handler in `RichText`'s own built-in table makes on its own `chunks` —
 * separates any {@linkcode createRichTextPropsSentinel} results (merged via
 * {@linkcode mergeRichTextProps}) from the real, renderable children, in document order. A custom
 * tag supplied through `RichText`'s own `tags` prop can call this too, participating in population
 * the same uniform way every built-in tag does — nothing here is special-cased for the built-ins.
 */
export function extractRichTextProps<T>(
  chunks: Array<string | T>,
): { props: Record<string, unknown>; children: Array<string | T> } {
  let props: Record<string, unknown> = {}
  const children: Array<string | T> = []

  for (const chunk of chunks) {
    if (isRichTextPropsSentinel(chunk)) {
      props = mergeRichTextProps(props, chunk.props)
    } else {
      children.push(chunk)
    }
  }

  return { props, children }
}
